import {
  $typst,
  createTypstCompiler,
  createTypstRenderer,
  FetchPackageRegistry,
  loadFonts,
  MemoryAccessModel,
} from "@myriaddreamin/typst.ts";
import type { PackageSpec } from "@myriaddreamin/typst.ts/internal.types";
import {
  disableDefaultFontAssets,
  withAccessModel,
  withPackageRegistry,
} from "@myriaddreamin/typst.ts/options.init";
import { listen, sendToMain } from "@mr.python/promise-worker-ts";
import { Mutex } from "async-mutex";
import getProcessor from "./getProcessor";

import TypstDocMain from "typst-template/main.typ?raw";
import TypstDocUtils from "typst-template/utils.typ?raw";

let preloadedPackages: Map<string, ArrayBuffer>;
class PreloadedPackageRegistry extends FetchPackageRegistry {
  override pullPackageData(path: PackageSpec) {
    const preloaded = preloadedPackages.get(this.resolvePath(path));
    return preloaded ? new Uint8Array(preloaded) : undefined;
  }
}
const typstAccessModel = new MemoryAccessModel();
const typstPackageRegistry = new PreloadedPackageRegistry(typstAccessModel);

let processor: ReturnType<typeof getProcessor>;

listen<InitMessage>("init", async (data) => {
  preloadedPackages = data.preloadedPackages;
  const compiler = createTypstCompiler(),
    renderer = createTypstRenderer();
  await Promise.all([
    compiler.init({
      getModule: () => data.typstCompilerWasm,
      beforeBuild: [
        disableDefaultFontAssets(),
        loadFonts(data.fontBuffers.map((x) => new Uint8Array(x))),
        withAccessModel(typstAccessModel),
        withPackageRegistry(typstPackageRegistry),
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
  $typst.addSource("/main.typ", TypstDocMain);
  $typst.addSource("/utils.typ", TypstDocUtils);
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
  $typst.addSource("/data.json", JSON.stringify(compiledContent));
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

import type { PromiseWorkerTagged } from "@mr.python/promise-worker-ts";
import type { CompiledContent, PrecompileContent } from "@/types/document";
import { importUnifiedPlugins } from "@/utils/importTemplate";
export type InitMessage = PromiseWorkerTagged<
  "init",
  {
    typstCompilerWasm: ArrayBuffer;
    typstRendererWasm: ArrayBuffer;
    fontBuffers: ArrayBuffer[];
    preloadedPackages: Map<string, ArrayBuffer>;
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
