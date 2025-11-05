import axiosInstance from "@/utils/axiosInstance";
import type { PackageSpec } from "@myriaddreamin/typst.ts/internal.types";
import { listenMain, send } from "@mr.python/promise-worker-ts";
import { isAxiosError } from "axios";
import processor from "./processor";
import type { ContestData } from "@/types/contestData";
import {
  type CompileTypstMessage,
  type RenderTypstMessage,
  type InitMessage,
  type FetchAssetMessage,
} from "./typst.worker";

import fontUrlEntries from "virtual:typst-font-url-entries";
import TypstCompilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url";
import TypstRendererWasmUrl from "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url";
import TypstWorker from "./typst.worker?worker";

const worker = new TypstWorker();

const RequiredPreloadPackages: PackageSpec[] = [
  {
    namespace: "preview",
    name: "oxifmt",
    version: "1.0.0",
  },
  {
    namespace: "preview",
    name: "mitex",
    version: "0.2.5",
  },
];

const preloadedPackages = new Map<string, ArrayBuffer>();

const browserCache = await window.caches.open("typst-assets");

async function downloadMultiData(
  urls: string[],
  report: (info: {
    percent: number;
    loaded: number;
    total: number | undefined;
  }) => void,
) {
  const tasks = urls.map(
    (
      url,
    ): {
      loaded: number;
      total: number | undefined;
      exec(): Promise<ArrayBuffer>;
    } => ({
      loaded: 0,
      total: undefined,
      async exec() {
        const cached = await browserCache.match(url);
        if (cached) return await cached.arrayBuffer();
        const res = await axiosInstance.get<ArrayBuffer>(url, {
          onDownloadProgress: (e) => {
            this.loaded = e.loaded;
            this.total = e.total;
            const totalLoaded = tasks.reduce((a, b) => a + b.loaded, 0);
            const totalSize = tasks.reduce<number | undefined>(
              (a, b) =>
                a == undefined || b.total === undefined
                  ? undefined
                  : a + b.total,
              0,
            );
            report({
              percent: totalSize ? (totalLoaded / totalSize) * 100 : 0,
              loaded: totalLoaded,
              total: totalSize,
            });
          },
        });
        browserCache.put(
          url,
          new Response(res.data, {
            headers: { "Content-Type": "application/octet-stream" },
          }),
        );
        return res.data;
      },
    }),
  );
  return await Promise.all(tasks.map((x) => x.exec()));
}

type PromiseStatus = "pending" | "fulfilled" | "rejected";

export class TypstInitTask {
  status: PromiseStatus = "pending";
  loaded: number = 0;
  total: number | undefined = undefined;
  percent: number = 0;
  promise: Promise<void>;
  constructor(init: Promise<void>) {
    this.promise = init.then(
      () => {
        this.status = "fulfilled";
        this.percent = 100;
      },
      (e) => {
        this.status = "rejected";
        throw e;
      },
    );
  }
  updateProgress(info: {
    percent: number;
    loaded: number;
    total: number | undefined;
  }) {
    this.loaded = info.loaded;
    this.total = info.total;
    this.percent = info.percent;
  }
}

let typstCompilerWasm: ArrayBuffer, typstRendererWasm: ArrayBuffer;
let fontBuffers: ArrayBuffer[];

export let fontAccessConfirmResolve: (() => void) | undefined = undefined;
function requestFontAccessConfirm() {
  if (fontAccessConfirmResolve)
    throw new Error("Font access already requested");
  return new Promise<void>((resolve) => {
    fontAccessConfirmResolve = () => {
      resolve();
      fontAccessConfirmResolve = undefined;
    };
  });
}

export const typstInitInfo: {
  [K in "compiler" | "font" | "package"]: TypstInitTask;
} = {
  compiler: new TypstInitTask(
    downloadMultiData([TypstCompilerWasmUrl, TypstRendererWasmUrl], (x) =>
      typstInitInfo.compiler.updateProgress(x),
    ).then(
      (res) => {
        typstCompilerWasm = res[0];
        typstRendererWasm = res[1];
        typstInitInfo.compiler.status = "fulfilled";
      },
      (e) => {
        typstInitInfo.compiler.status = "rejected";
        throw e;
      },
    ),
  ),
  font: new TypstInitTask(
    (async () => {
      const localFontPromises: Promise<ArrayBuffer>[] = [];
      const remoteFontUrls: string[] = [];
      const localFontDatas: {
        postscriptName: string;
        blob: () => Promise<Blob>;
      }[] = [];
      const unCachedFontUrlEntries: [string, string][] = [];
      await Promise.all(
        fontUrlEntries.map(async ([fontName, fontUrl]) => {
          const cached = await browserCache.match(fontUrl);
          if (!cached) unCachedFontUrlEntries.push([fontName, fontUrl]);
          else
            localFontDatas.push({
              postscriptName: fontName,
              blob: () => cached.blob(),
            });
        }),
      );
      if (unCachedFontUrlEntries.length && window.queryLocalFonts) {
        await requestFontAccessConfirm();
        try {
          localFontDatas.push(
            ...(
              await window.queryLocalFonts({
                postscriptNames: unCachedFontUrlEntries.map((x) => x[0]),
              })
            ).map((x) => ({
              postscriptName: x.postscriptName,
              blob: async () => {
                const blob = await x.blob();
                const fontUrl = unCachedFontUrlEntries.find(
                  (v) => v[0] === x.postscriptName,
                )?.[1];
                if (fontUrl)
                  browserCache.put(
                    fontUrl,
                    new Response(blob, {
                      headers: { "Content-Type": "application/octet-stream" },
                    }),
                  );
                return blob;
              },
            })),
          );
        } catch {
          // ignore
        }
      }
      for (const [fontName, fontUrl] of fontUrlEntries) {
        const fontData = localFontDatas.find(
          (x) => x.postscriptName === fontName,
        );
        if (fontData)
          localFontPromises.push(
            fontData.blob().then(async (b) => await b.arrayBuffer()),
          );
        else remoteFontUrls.push(fontUrl);
      }
      fontBuffers = (
        await Promise.all([
          ...localFontPromises,
          downloadMultiData(remoteFontUrls, (x) =>
            typstInitInfo.font.updateProgress(x),
          ),
        ])
      ).flat();
    })(),
  ),
  package: new TypstInitTask(
    (async () => {
      const urls = RequiredPreloadPackages.map(
        (pkg) =>
          `https://packages.typst.org/preview/${pkg.name}-${pkg.version}.tar.gz`,
      );
      const datas = await downloadMultiData(urls, (x) =>
        typstInitInfo.package.updateProgress(x),
      );
      for (let i = 0; i < urls.length; ++i)
        preloadedPackages.set(urls[i], datas[i]);
    })(),
  ),
};
export let typstInitStatus: PromiseStatus = "pending";
export const typstInitPromise = Promise.all(
  Object.values(typstInitInfo).map((x) => x.promise),
)
  .then(async () => {
    await send<InitMessage>("init", worker, {
      typstCompilerWasm,
      typstRendererWasm,
      fontBuffers,
      preloadedPackages,
    });
    typstInitStatus = "fulfilled";
  })
  .catch((err) => {
    typstInitStatus = "rejected";
    throw new Error("Typst initialization failed.", { cause: err });
  });

function compilerPrepare(
  data: ContestData<{ withMarkdown: true }>,
): [ContestData<{ withTypst: true }>, [string, string][]] {
  const assets = new Map<string, string>();
  const problemsWithTypst = data.problems.map((problem) => {
    const res = processor.processSync(problem.statementMarkdown);
    for (const v of res.data.assets || []) assets.set(v.filename, v.assetUrl);
    return {
      ...problem,
      statementTypst: res.toString(),
    };
  });
  const precautionRes = processor.processSync(data.precautionMarkdown);
  for (const v of precautionRes.data.assets || [])
    assets.set(v.filename, v.assetUrl);
  return [
    {
      ...data,
      problems: problemsWithTypst,
      precautionTypst: precautionRes.toString(),
    },
    Array.from(assets.entries()),
  ];
}

export const compileToPdf = (data: ContestData<{ withMarkdown: true }>) =>
  send<CompileTypstMessage>("compileTypst", worker, compilerPrepare(data));
export const compileToSvg = (data: ContestData<{ withMarkdown: true }>) =>
  send<RenderTypstMessage>("renderTypst", worker, compilerPrepare(data));

export const compileToSvgDebounced = (() => {
  type Task = {
    args: ContestData<{ withMarkdown: true }>;
    promise: Promise<string | undefined>;
    resolve: (v: string | undefined) => void;
    reject: (e: unknown) => void;
  };
  let currentTask: Task | undefined = undefined;
  let waitingTask: Task | undefined = undefined;

  const run = () => {
    if (currentTask) return;
    if (waitingTask) {
      currentTask = waitingTask;
      waitingTask = undefined;
    } else return;
    const task = currentTask;
    compileToSvg(task.args)
      .then(task.resolve, task.reject)
      .then(() => {
        currentTask = undefined;
        run();
      });
  };
  return (args: ContestData<{ withMarkdown: true }>) => {
    let resolve: (v: string | undefined) => void, reject: (e: unknown) => void;
    const promise = new Promise<string | undefined>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const newTask: Task = {
      args,
      promise,
      resolve: resolve!,
      reject: reject!,
    };
    if (waitingTask) waitingTask.reject("Aborted");
    waitingTask = newTask;
    run();
    return promise;
  };
})();

// Global mapping for asset:// protocol - maps UUID to blob URL
let assetUrlMapping = new Map<string, string>();

/**
 * Register image blob URLs for asset:// protocol resolution
 * Called from ContestEditor when images are loaded/updated
 */
export function registerAssetUrls(uuidToUrlMap: Map<string, string>): void {
  assetUrlMapping = new Map(uuidToUrlMap);
}

/**
 * Fetch asset with support for asset:// protocol
 * asset://uuid -> map to blob URL and fetch via axios
 * other URLs -> fetch via axios
 */
async function fetchAsset(url: string): Promise<ArrayBuffer> {
  // Handle asset:// protocol
  if (url.startsWith("asset://")) {
    const uuid = url.substring(8); // Remove "asset://" prefix
    const blobUrl = assetUrlMapping.get(uuid);

    if (!blobUrl) {
      throw new Error(`Asset not found: ${uuid}`);
    }

    // Fetch the blob URL using axios
    url = blobUrl;
  }

  // Handle regular URLs (including mapped blob URLs)
  try {
    const response = await axiosInstance.get<ArrayBuffer>(url);
    return response.data;
  } catch (e) {
    if (isAxiosError(e)) {
      console.error("Failed to download assets.", e);
      throw new Error(
        "下载资源失败。这或许是因为浏览器的跨域限制。你可以尝试手动上传图片。",
      );
    }
    throw e;
  }
}

listenMain<FetchAssetMessage>("fetchAsset", worker, fetchAsset);
