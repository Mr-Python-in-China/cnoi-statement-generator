import type ExampleMetaExport from "@/types/examples";

const metaModules = import.meta.glob<ExampleMetaExport>(
  "/examples/*/meta.{ts,tsx}",
  {
    eager: true,
    import: "default",
  },
);

const previewModules = import.meta.glob<string>(
  "/examples/*/preview.{png,jpg,svg,webp}",
  {
    eager: true,
    import: "default",
  },
);

const extractExampleName = (path: string) => {
  const match = /\/examples\/(?<name>[^/]+)\//.exec(path);
  if (!match?.groups?.name) throw new Error(`Invalid example path: ${path}`);
  return match.groups.name;
};

const aggregated = new Map<
  string,
  {
    meta?: ExampleMetaExport;
    preview?: string;
  }
>();

for (const [path, meta] of Object.entries(metaModules)) {
  const name = extractExampleName(path);
  const current = aggregated.get(name) ?? {};
  aggregated.set(name, { ...current, meta });
}

for (const [path, preview] of Object.entries(previewModules)) {
  const name = extractExampleName(path);
  const current = aggregated.get(name) ?? {};
  aggregated.set(name, { ...current, preview });
}

const exampleDocuments: Record<
  string,
  { meta: ExampleMetaExport; preview: string }
> = {};

for (const [name, { meta, preview }] of aggregated) {
  if (!meta) throw new Error(`Invalid example "${name}": missing meta.ts`);
  if (!preview)
    throw new Error(
      `Invalid example "${name}": missing preview.(png|jpg|svg|webp)`,
    );
  exampleDocuments[name] = { meta, preview };
}

export default exampleDocuments;
