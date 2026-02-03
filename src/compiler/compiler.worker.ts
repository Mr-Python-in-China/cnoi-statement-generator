import {
  createTypstCompiler,
  createTypstRenderer,
  FetchPackageRegistry,
  loadFonts,
  MemoryAccessModel,
  type TypstCompiler,
  type TypstRenderer,
} from "@myriaddreamin/typst.ts";
import {
  disableDefaultFontAssets,
  withAccessModel,
  withPackageRegistry,
} from "@myriaddreamin/typst.ts/options.init";
import { listen, sendToMain } from "@mr.python/promise-worker-ts";
import { Mutex } from "async-mutex";
import getProcessor from "./getProcessor";
import {
  importTypstContents,
  importUnifiedPlugins,
} from "@/utils/importTemplate";
import { CompileFormatEnum } from "@myriaddreamin/typst.ts/compiler";
import type { PromiseWorkerTagged } from "@mr.python/promise-worker-ts";
import type { CompiledContent, PrecompileContent } from "@/types/document";

const typstAccessModel = new MemoryAccessModel();

let processor: ReturnType<typeof getProcessor>;
let compiler: TypstCompiler;
let renderer: TypstRenderer;

const mappedShadow: Map<string, Uint8Array> = new Map();

function mapShadow(filename: string, data: Uint8Array) {
  mappedShadow.set(filename, data);
  compiler.mapShadow(filename, data);
}
function unmapShadow(filename: string) {
  mappedShadow.delete(filename);
  compiler.unmapShadow(filename);
}
function addSource(filename: string, data: string) {
  mappedShadow.set(filename, new TextEncoder().encode(data));
  compiler.addSource(filename, data);
}

listen<InitMessage>("init", async (data) => {
  compiler = createTypstCompiler();
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
  for (const [filename, content] of await importTypstContents(data.template))
    addSource(filename, content);
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

async function typstPrepare(content: PrecompileContent) {
  const now = Date.now();
  for (const [filename, expire] of Array.from(shadowCacheTime.entries()))
    if (expire === -1) shadowCacheTime.set(filename, now + SHADOW_CACHE_AGE);
    else if (now > expire) {
      unmapShadow("/" + filename);
      shadowCacheTime.delete(filename);
    }
  const [compiledContent, assets] = compilerPrepare(content);
  await Promise.all(
    assets.map(async ([filename, assetUrl]) => {
      const cached = shadowCacheTime.get(filename);
      if (cached === undefined)
        mapShadow(
          "/" + filename,
          new Uint8Array(
            await sendToMain<FetchAssetMessage>("fetchAsset", assetUrl),
          ),
        );
      shadowCacheTime.set(filename, -1);
    }),
  );
  addSource("/content.json", JSON.stringify(compiledContent));
  for (const filename of lastExtraContents) unmapShadow(`/${filename}.typ`);
  lastExtraContents = new Set<string>();
  for (const [filename, content] of Object.entries(
    compiledContent.extraContents,
  )) {
    lastExtraContents.add(filename);
    addSource(`/extra-${filename}.typ`, content.typst);
  }
  for (let i = 0; i < compiledContent.problems.length; ++i)
    addSource(`/problem-${i}.typ`, compiledContent.problems[i].typst);
  for (let i = compiledContent.problems.length; i < lastProblemCount; ++i)
    unmapShadow(`/problem-${i}.typ`);
  lastProblemCount = content.problems.length;
}

const mutex = new Mutex();

listen<CompileTypstMessage>("compileTypst", async (data) =>
  mutex.runExclusive(async () => {
    await typstPrepare(data);
    return (
      await compiler.compile({
        format: CompileFormatEnum.pdf,
        mainFilePath: "/main.typ",
      })
    ).result;
  }),
);

listen<RenderTypstMessage>("renderTypst", async (data) =>
  mutex.runExclusive(async () => {
    await typstPrepare(data);
    const vector = (
      await compiler.compile({
        format: CompileFormatEnum.vector,
        mainFilePath: "/main.typ",
      })
    ).result;
    if (!vector) return undefined;
    return await renderer.runWithSession(async (session) => {
      renderer.manipulateData({
        renderSession: session,
        action: "reset",
        data: vector,
      });
      return renderer.renderSvg({
        renderSession: session,
      });
    });
  }),
);
listen<ExportTypstSourceZipMessage>("exportTypstSourceZip", async (data) =>
  mutex.runExclusive(async () => {
    await typstPrepare(data);
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    mappedShadow.forEach((value, key) => {
      zip.file(key.slice(1), value);
    });
    return zip.generateAsync({ type: "arraybuffer" });
  }),
);

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
export type ExportTypstSourceZipMessage = PromiseWorkerTagged<
  "exportTypstSourceZip",
  PrecompileContent,
  ArrayBuffer
>;
