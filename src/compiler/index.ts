import axiosInstance from "@/utils/axiosInstance";
import { listenMain, send } from "@mr.python/promise-worker-ts";
import { isAxiosError } from "axios";
import {
  type CompileTypstMessage,
  type RenderTypstMessage,
  type InitMessage,
  type FetchAssetMessage,
  type ExportTypstSourceZipMessage,
} from "./compiler.worker";
import type { ContentBase, PrecompileContent } from "@/types/document";

import TypstCompilerWasmUrls from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?split";
import TypstRendererWasmUrl from "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url";
import TypstWorker from "./compiler.worker?worker";
import { importFontUrlEnteries } from "@/utils/importTemplate";

const browserCache: Cache | undefined =
  await window.caches?.open("typst-assets");

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
        const cached = await browserCache?.match(url);
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
        browserCache?.put(
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

export type PromiseStatus = "pending" | "fulfilled" | "rejected";

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

function removeImageBlob(content: ContentBase): PrecompileContent {
  return {
    ...content,
    images: content.images.map(
      ({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        blob, // Remove blob field
        ...rest
      }) => rest,
    ),
  };
}

export default class CompilerInstance {
  private worker: Worker;
  private assetUrlMapping = new Map<string, string>();
  public typstInitInfo: {
    [K in "compiler" | "font"]: TypstInitTask;
  };
  public typstInitStatus: PromiseStatus = "pending";
  public typstInitPromise: Promise<void>;

  constructor(template: string) {
    this.worker = new TypstWorker();
    let typstCompilerWasm: ArrayBuffer,
      typstRendererWasm: ArrayBuffer,
      fontBuffers: ArrayBuffer[];

    this.typstInitInfo = {
      compiler: new TypstInitTask(
        downloadMultiData(
          [TypstRendererWasmUrl, ...TypstCompilerWasmUrls],
          (x) => this.typstInitInfo.compiler.updateProgress(x),
        ).then(
          ([RendererBuffer, ...CompilerBuffers]) => {
            const totalLen = CompilerBuffers.reduce(
              (prev, cur) => prev + cur.byteLength,
              0,
            );
            const arr = new Uint8Array(totalLen);
            let offset = 0;
            for (const buffer of CompilerBuffers) {
              arr.set(new Uint8Array(buffer), offset);
              offset += buffer.byteLength;
            }
            typstCompilerWasm = arr.buffer;
            typstRendererWasm = RendererBuffer;
            this.typstInitInfo.compiler.status = "fulfilled";
          },
          (e) => {
            this.typstInitInfo.compiler.status = "rejected";
            throw e;
          },
        ),
      ),
      font: new TypstInitTask(
        (async () => {
          const fontUrlEntries = await importFontUrlEnteries(template);
          const localFontPromises: Promise<ArrayBuffer>[] = [];
          const remoteFontUrls: string[] = [];
          const localFontDatas: {
            postscriptName: string;
            blob: () => Promise<Blob>;
          }[] = [];
          const unCachedFontUrlEntries: [string, string][] = [];
          await Promise.all(
            fontUrlEntries.map(async ([fontName, fontUrl]) => {
              const cached = await browserCache?.match(fontUrl);
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
                      browserCache?.put(
                        fontUrl,
                        new Response(blob, {
                          headers: {
                            "Content-Type": "application/octet-stream",
                          },
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
                this.typstInitInfo.font.updateProgress(x),
              ),
            ])
          ).flat();
        })(),
      ),
    };

    this.typstInitPromise = Promise.all(
      Object.values(this.typstInitInfo).map((x) => x.promise),
    )
      .then(async () => {
        await send<InitMessage>("init", this.worker, {
          template,
          typstCompilerWasm,
          typstRendererWasm,
          fontBuffers,
        });
        this.typstInitStatus = "fulfilled";
      })
      .catch((err) => {
        this.typstInitStatus = "rejected";
        throw new Error("Typst initialization failed.", { cause: err });
      });

    listenMain<FetchAssetMessage>("fetchAsset", this.worker, (url) =>
      this.fetchAsset(url),
    );
  }

  public compileToPdf(data: ContentBase) {
    return send<CompileTypstMessage>(
      "compileTypst",
      this.worker,
      removeImageBlob(data),
    );
  }

  public compileToSvg(data: ContentBase) {
    return send<RenderTypstMessage>(
      "renderTypst",
      this.worker,
      removeImageBlob(data),
    );
  }

  public readonly compileToSvgDebounced = (() => {
    type Task = {
      args: ContentBase;
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
      this.compileToSvg(task!.args)
        .then(task!.resolve, task!.reject)
        .then(() => {
          currentTask = undefined;
          run();
        });
    };
    return (args: ContentBase) => {
      let resolve: (v: string | undefined) => void;
      let reject: (e: unknown) => void;
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

  public registerAssetUrls(uuidToUrlMap: Map<string, string>): void {
    this.assetUrlMapping = new Map(uuidToUrlMap);
  }

  public async exportTypstSourceZip(data: ContentBase) {
    return send<ExportTypstSourceZipMessage>(
      "exportTypstSourceZip",
      this.worker,
      removeImageBlob(data),
    );
  }

  private async fetchAsset(url: string): Promise<ArrayBuffer> {
    if (url.startsWith("asset://")) {
      const uuid = url.substring(8);
      const blobUrl = this.assetUrlMapping.get(uuid);

      if (!blobUrl) {
        throw new Error(`Asset not found: ${uuid}`);
      }

      url = blobUrl;
    }

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

  public dispose() {
    this.worker.terminate();
  }
}
