import type { ContentBase, DocumentBase } from "@/types/document";
import JSZip from "jszip";
import getProcessor from "@/compiler/getProcessor";
import base64js from "base64-js";
import {
  importContentZod,
  importFontUrlEntries,
  importTypstContents,
  importUnifiedPlugins,
} from "@/utils/importTemplate";

function removeImages(content: ContentBase): ContentBase {
  return {
    ...content,
    images: [],
  };
}

type InlineAsset = {
  filename: string;
  assetUrl: string;
};

async function compileContentToTypst(content: ContentBase, templateId: string) {
  const processor = getProcessor(await importUnifiedPlugins(templateId));
  const problems = await Promise.all(
    content.problems.map(async (problem) => {
      const processed = processor.processSync(problem.markdown);
      return {
        typst: processed.toString(),
        assets: (processed.data.assets ?? []) as InlineAsset[],
      };
    }),
  );
  const extraContents = await Promise.all(
    Object.entries(content.extraContents).map(async ([key, value]) => {
      const processed = processor.processSync(value.markdown);
      return [
        key,
        {
          typst: processed.toString(),
          assets: (processed.data.assets ?? []) as InlineAsset[],
        },
      ] as const;
    }),
  );
  return {
    problems,
    extraContents: Object.fromEntries(extraContents),
  };
}

async function collectAssets(
  typstResult: Awaited<ReturnType<typeof compileContentToTypst>>,
) {
  const assets = new Map<string, string>();
  const addAsset = (filename: string, assetUrl: string) => {
    if (!assets.has(filename)) assets.set(filename, assetUrl);
  };
  // Inline image assets already resolved from markdown (data.assets).
  for (const problem of typstResult.problems) {
    for (const asset of problem.assets)
      addAsset(asset.filename, asset.assetUrl);
  }
  for (const extra of Object.values(typstResult.extraContents)) {
    for (const asset of extra.assets) addAsset(asset.filename, asset.assetUrl);
  }
  return assets;
}

async function resolveAssetData(assetUrl: string): Promise<Uint8Array> {
  if (assetUrl.startsWith("data:")) return dataUrlToUint8Array(assetUrl);
  const response = await fetch(assetUrl);
  return new Uint8Array(await response.arrayBuffer());
}

function resolveAssetExtension(assetUrl: string): string {
  if (assetUrl.startsWith("data:")) return dataUrlToExtension(assetUrl);
  const normalized = assetUrl.split("?")[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(normalized);
  return match?.[1] ?? "bin";
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const match = /^data:(?<type>[^;]+);base64,(?<data>.+)$/u.exec(dataUrl);
  if (!match?.groups?.data) throw new Error("Invalid data URL");
  return Uint8Array.from(base64js.toByteArray(match.groups.data));
}

function dataUrlToExtension(dataUrl: string): string {
  const match = /^data:(?<type>[^;]+);base64,/u.exec(dataUrl);
  const type = match?.groups?.type ?? "application/octet-stream";
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  };
  return map[type] ?? "bin";
}

function replaceAssetReferences(typst: string, assets: Map<string, string>) {
  let result = typst;
  for (const [filename, assetUrl] of assets) {
    const ext = resolveAssetExtension(assetUrl);
    const filePath = `assets/${filename}.${ext}`;
    result = result.split(`image("${filename}"`).join(`image("${filePath}"`);
  }
  return result;
}

async function buildTypstArchive(doc: DocumentBase) {
  const zip = new JSZip();
  const typstContents = await importTypstContents(doc.templateId);
  const contentZod = await importContentZod(doc.templateId);
  const contentForJson = contentZod.parse(removeImages(doc.content));
  const typstResult = await compileContentToTypst(doc.content, doc.templateId);
  const assets = await collectAssets(typstResult);

  const contentJson = JSON.stringify(contentForJson, null, 2);
  zip.file("content.json", contentJson);
  const configJson = await import("@/utils/jsonDocument").then((mod) =>
    mod.documentToJson(doc),
  );
  zip.file("config.json", configJson);

  for (const [filename, content] of typstContents) {
    zip.file(filename, content);
  }

  for (const [filename, assetUrl] of assets) {
    const ext = resolveAssetExtension(assetUrl);
    const buffer = await resolveAssetData(assetUrl);
    zip.file(`assets/${filename}.${ext}`, buffer);
  }

  const extraEntries = Object.entries(typstResult.extraContents);
  for (const [key, extra] of extraEntries) {
    const typst = replaceAssetReferences(extra.typst, assets);
    zip.file(`extra-${key}.typ`, typst);
  }

  typstResult.problems.forEach((problem, index) => {
    const typst = replaceAssetReferences(problem.typst, assets);
    zip.file(`problem-${index}.typ`, typst);
  });

  const fonts = await importFontUrlEntries(doc.templateId);
  for (const [, fontUrl] of fonts) {
    if (!fontUrl.startsWith("/")) continue;
    const res = await fetch(fontUrl);
    const buffer = new Uint8Array(await res.arrayBuffer());
    zip.file(fontUrl.slice(1), buffer);
  }

  return zip;
}

export async function exportTypstArchive(doc: DocumentBase) {
  const zip = await buildTypstArchive(doc);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name}-${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
