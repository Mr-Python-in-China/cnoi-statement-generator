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
import { listen } from "promise-worker-ts";
import { Mutex } from "async-mutex";
import axiosInstance from "@/utils/axiosInstance";
import type ContestData from "../types/contestData";

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
  ]);
  $typst.setCompiler(compiler);
  $typst.setRenderer(renderer);
  $typst.addSource("/main.typ", TypstDocMain);
  $typst.addSource("/utils.typ", TypstDocUtils);
});

const SHADOW_CACHE_AGE = 1000 * 30;
const shadowCacheTime = new Map<string, number>();
let lastProblemCount = 0;
async function typstPrepare(
  data: ContestData<{ withTypst: true }>,
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
      if (cached === undefined) {
        const res = await axiosInstance
          .get<ArrayBuffer>(assetUrl)
          .catch((e) => {
            if (isAxiosError(e)) {
              console.error("Failed to download assets.", e);
              throw new Error(
                "下载资源失败。这或许是因为浏览器的跨域限制。你可以尝试手动上传图片。",
              );
            } else throw e;
          });
        $typst.mapShadow("/" + filename, new Uint8Array(res.data));
      }
      shadowCacheTime.set(filename, -1);
    }),
  );
  $typst.addSource("/data.json", JSON.stringify(data));
  $typst.addSource("/precaution.typ", data.precautionTypst);
  for (let i = 0; i < data.problems.length; ++i)
    $typst.addSource(`/problem-${i}.typ`, data.problems[i].statementTypst);
  for (let i = data.problems.length; i < lastProblemCount; ++i)
    $typst.unmapShadow(`/problem-${i}.typ`);
  lastProblemCount = data.problems.length;
}

const mutex = new Mutex();

listen<CompileTypstMessage>("compileTypst", async ([data, assets]) =>
  mutex.runExclusive(() =>
    typstPrepare(data, assets).then(() =>
      $typst.pdf({
        mainFilePath: "/main.typ",
      }),
    ),
  ),
);

listen<RenderTypstMessage>("renderTypst", async ([data, assets]) =>
  mutex.runExclusive(() =>
    typstPrepare(data, assets).then(() =>
      $typst.svg({
        mainFilePath: "/main.typ",
      }),
    ),
  ),
);

import type { PromiseWorkerTagged } from "promise-worker-ts";
import { isAxiosError } from "axios";
export type InitMessage = PromiseWorkerTagged<
  "init",
  {
    typstCompilerWasm: ArrayBuffer;
    typstRendererWasm: ArrayBuffer;
    fontBuffers: ArrayBuffer[];
    preloadedPackages: Map<string, ArrayBuffer>;
  },
  void
>;
export type CompileTypstMessage = PromiseWorkerTagged<
  "compileTypst",
  [ContestData<{ withTypst: true }>, [string, string][]],
  Uint8Array | undefined
>;
export type RenderTypstMessage = PromiseWorkerTagged<
  "renderTypst",
  [ContestData<{ withTypst: true }>, [string, string][]],
  string | undefined
>;
