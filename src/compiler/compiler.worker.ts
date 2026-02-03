import {
  $typst,
  createTypstCompiler,
  createTypstRenderer,
  FetchPackageRegistry,
  loadFonts,
  MemoryAccessModel,
} from "@myriaddreamin/typst.ts";
import {
  disableDefaultFontAssets,
  withAccessModel,
  withPackageRegistry,
} from "@myriaddreamin/typst.ts/options.init";
import { listen, sendToMain } from "@mr.python/promise-worker-ts";
import { Mutex } from "async-mutex";
import getProcessor from "./getProcessor";
import JSZip from "jszip";
import base64js from "base64-js";

const typstAccessModel = new MemoryAccessModel();

let processor: ReturnType<typeof getProcessor>;

listen<InitMessage>("init", async (data) => {
  const compiler = createTypstCompiler(),
    renderer = createTypstRenderer();
  await Promise.all([
    compiler.init({
      getModule: () => data.typstCompilerWasm,
      beforeBuild: [
        disableDefaultFontAssets(),
        loadFonts(data.fontBuffers.map((x) => new Uint8Array(x))),
        withAccessModel(typstAccessModel),
        withPackageRegistry(new FetchPackageRegistry(typstAccessModel)),
      ],
    }),
    renderer.init({
      getModule: () => data.typstRendererWasm,
    }),
    (async () => {
      processor = getProcessor(await importUnifiedPlugins(data.template));
    })(),
  ]);
  $typst.setCompiler(compiler);
  $typst.setRenderer(renderer);
  for (const [filename, content] of await importTypstContents(data.template))
    $typst.addSource(filename, content);
});

const SHADOW_CACHE_AGE = 1000 * 30;
const shadowCacheTime = new Map<string, number>();
let lastProblemCount = 0;
let lastExtraContents = new Set<string>();
function compilerPrepare(
  data: PrecompileContent,
): [CompiledContent, [string, string][]] {
  const assets = new Map<string, string>();
  const compiledProblems = data.problems.map((problem) => {
    const res = processor.processSync(problem.markdown);
    for (const v of res.data.assets || []) assets.set(v.filename, v.assetUrl);
    return {
      ...problem,
      typst: res.toString(),
    };
  });
  const compiledExtraContents = Object.fromEntries(
    Object.entries(data.extraContents).map(([key, content]) => {
      const res = processor.processSync(content.markdown);
      for (const v of res.data.assets || []) assets.set(v.filename, v.assetUrl);
      return [
        key,
        {
          ...content,
          typst: res.toString(),
        },
      ] as const;
    }),
  );
  return [
    {
      ...data,
      problems: compiledProblems,
      extraContents: compiledExtraContents,
    },
    Array.from(assets.entries()),
  ];
}

async function typstPrepare(
  content: PrecompileContent,
  assets: [string, string][],
) {
  const now = Date.now();
  for (const [filename, expire] of Array.from(shadowCacheTime.entries()))
    if (expire === -1) shadowCacheTime.set(filename, now + SHADOW_CACHE_AGE);
    else if (now > expire) {
      $typst.unmapShadow("/" + filename);
      shadowCacheTime.delete(filename);
    }
  await Promise.all(
    assets.map(async ([filename, assetUrl]) => {
      const cached = shadowCacheTime.get(filename);
      if (cached === undefined)
        $typst.mapShadow(
          "/" + filename,
          new Uint8Array(
            await sendToMain<FetchAssetMessage>("fetchAsset", assetUrl),
          ),
        );
      shadowCacheTime.set(filename, -1);
    }),
  );
  const [compiledContent] = compilerPrepare(content);
  $typst.addSource("/content.json", JSON.stringify(compiledContent));
  for (const filename of lastExtraContents)
    $typst.unmapShadow(`/${filename}.typ`);
  lastExtraContents = new Set<string>();
  for (const [filename, content] of Object.entries(
    compiledContent.extraContents,
  )) {
    lastExtraContents.add(filename);
    $typst.addSource(`/extra-${filename}.typ`, content.typst);
  }
  for (let i = 0; i < compiledContent.problems.length; ++i)
    $typst.addSource(`/problem-${i}.typ`, compiledContent.problems[i].typst);
  for (let i = compiledContent.problems.length; i < lastProblemCount; ++i)
    $typst.unmapShadow(`/problem-${i}.typ`);
  lastProblemCount = content.problems.length;
}

const mutex = new Mutex();
const ASSET_URL_PREFIX = "asset://";

function removeImages(content: DocumentBase["content"]): DocumentBase["content"] {
  return {
    ...content,
    images: [],
  };
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const match = /^data:(?<type>[^;]+);base64,(?<data>.+)$/u.exec(dataUrl);
  if (!match?.groups?.data) throw new Error("Invalid data URL");
  return Uint8Array.from(base64js.toByteArray(match.groups.data));
}

function dataUrlToExtension(dataUrl: string): string {
  const match = /^data:(?<type>[^;]+);base64,/u.exec(dataUrl);
  const type = match?.groups?.type ?? "application/octet-stream";
  return mimeTypeToExtension(type);
}

function mimeTypeToExtension(type: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  };
  return map[type] ?? "bin";
}

function resolveUrlExtension(url: string): string | undefined {
  const normalized = url.split("?")[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(normalized);
  return match?.[1];
}

function replaceAssetReferences(
  typst: string,
  assets: Map<string, string>,
): string {
  return typst.replaceAll(
    /image\("(?<name>[^"]+)"/g,
    (match, name: string) =>
      assets.has(name) ? `image("${assets.get(name)}"` : match,
  );
}

listen<CompileTypstMessage>("compileTypst", async (data) =>
  mutex.runExclusive(async () => {
    const [, assets] = compilerPrepare(data);
    await typstPrepare(data, assets);
    return $typst.pdf({
      mainFilePath: "/main.typ",
    });
  }),
);

listen<RenderTypstMessage>("renderTypst", async (data) =>
  mutex.runExclusive(async () => {
    const [, assets] = compilerPrepare(data);
    await typstPrepare(data, assets);
    return $typst.svg({
      mainFilePath: "/main.typ",
    });
  }),
);

listen<ExportTypstArchiveMessage>("exportTypstArchive", async (doc) =>
  mutex.runExclusive(async () => {
    const zip = new JSZip();
    const typstContents = await importTypstContents(doc.templateId);
    const contentZod = await importContentZod(doc.templateId);
    const contentForJson = contentZod.parse(removeImages(doc.content));
    const contentForCompile = {
      ...doc.content,
      images: doc.content.images.map((item) => {
        const rest = { ...item } as Omit<typeof item, "blob"> & {
          blob?: Blob;
        };
        delete rest.blob;
        return rest;
      }),
    } satisfies PrecompileContent;
    const [compiledContent, assets] = compilerPrepare(contentForCompile);

    zip.file("content.json", JSON.stringify(contentForJson, null, 2));
    const configJson = await import("@/utils/jsonDocument").then((mod) =>
      mod.documentToJson(doc),
    );
    zip.file("config.json", configJson);

    for (const [filename, content] of typstContents) {
      zip.file(filename, content);
    }

    const assetPaths = new Map<string, string>();
    for (const [filename, assetUrl] of assets) {
      let buffer: Uint8Array;
      let ext: string | undefined;
      if (assetUrl.startsWith(ASSET_URL_PREFIX)) {
        const uuid = assetUrl.slice(ASSET_URL_PREFIX.length);
        const image = doc.content.images.find((img) => img.uuid === uuid);
        const imageName = image?.name;
        if (!image) {
          const imageLabel = imageName
            ? `"${imageName.replaceAll(/[\r\n\t]/g, " ")}" (id: ${uuid})`
            : `id: ${uuid}`;
          throw new Error(
            `Referenced image ${imageLabel} not found. The image may have been deleted. Please remove the image reference or re-add the image to the document.`,
          );
        }
        buffer = new Uint8Array(await image.blob.arrayBuffer());
        ext = imageName ? resolveUrlExtension(imageName) : undefined;
        if (!ext) ext = mimeTypeToExtension(image.blob.type);
      } else if (assetUrl.startsWith("data:")) {
        buffer = dataUrlToUint8Array(assetUrl);
        ext = dataUrlToExtension(assetUrl);
      } else {
        const response = await fetch(assetUrl);
        buffer = new Uint8Array(await response.arrayBuffer());
        ext = resolveUrlExtension(assetUrl) ?? "bin";
      }
      const assetPath = `assets/${filename}.${ext}`;
      assetPaths.set(filename, assetPath);
      zip.file(assetPath, buffer);
    }

    for (const [key, extra] of Object.entries(compiledContent.extraContents)) {
      const typst = replaceAssetReferences(extra.typst, assetPaths);
      zip.file(`extra-${key}.typ`, typst);
    }

    compiledContent.problems.forEach((problem, index) => {
      const typst = replaceAssetReferences(problem.typst, assetPaths);
      zip.file(`problem-${index}.typ`, typst);
    });

    const fonts = await importFontUrlEntries(doc.templateId);
    for (const [, fontUrl] of fonts) {
      if (!fontUrl.startsWith("/")) continue;
      const res = await fetch(fontUrl);
      const buffer = new Uint8Array(await res.arrayBuffer());
      zip.file(fontUrl.slice(1), buffer);
    }

    return zip.generateAsync({ type: "uint8array" });
  }),
);

import type { PromiseWorkerTagged } from "@mr.python/promise-worker-ts";
import type {
  CompiledContent,
  DocumentBase,
  PrecompileContent,
} from "@/types/document";
import {
  importContentZod,
  importTypstContents,
  importUnifiedPlugins,
  importFontUrlEntries,
} from "@/utils/importTemplate";
export type InitMessage = PromiseWorkerTagged<
  "init",
  {
    typstCompilerWasm: ArrayBuffer;
    typstRendererWasm: ArrayBuffer;
    fontBuffers: ArrayBuffer[];
    template: string;
  },
  void
>;
export type CompileTypstMessage = PromiseWorkerTagged<
  "compileTypst",
  PrecompileContent,
  Uint8Array | undefined
>;
export type RenderTypstMessage = PromiseWorkerTagged<
  "renderTypst",
  PrecompileContent,
  string | undefined
>;
export type FetchAssetMessage = PromiseWorkerTagged<
  "fetchAsset",
  string,
  ArrayBuffer
>;
export type ExportTypstArchiveMessage = PromiseWorkerTagged<
  "exportTypstArchive",
  DocumentBase,
  Uint8Array
>;
