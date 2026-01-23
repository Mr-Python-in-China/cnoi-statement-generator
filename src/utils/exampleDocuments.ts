import type ExampleMetaExport from "@/types/examples";
import { importContentZod } from "@/utils/importTemplate";
import type { ContentBase } from "@/types/document";

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

const contentModules = import.meta.glob<string>(
  [
    "/examples/*/problem-*.md",
    "/examples/*/extra-*.md",
    "/examples/*/content.json",
  ],
  {
    import: "default",
    eager: false,
    query: "raw",
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

export const exampleDocuments: Record<
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

export async function loadExampleContent(name: string): Promise<ContentBase> {
  const example = exampleDocuments[name];
  if (!example) throw new Error(`Example "${name}" not found`);
  const { meta } = example;

  const contentJsonPath = `/examples/${name}/content.json`;
  const contentJsonLoader = contentModules[contentJsonPath];
  if (!contentJsonLoader)
    throw new Error(`Content JSON not found for example "${name}"`);
  const contentJsonRaw = await contentJsonLoader();
  const contentRaw = JSON.parse(contentJsonRaw);
  const contentZod = await importContentZod(meta.template);

  if (Array.isArray(contentRaw.problems)) {
    for (let i = 0; i < contentRaw.problems.length; ++i) {
      const mdPath = `/examples/${name}/problem-${i}.md`;
      const mdLoader = contentModules[mdPath];
      if (mdLoader) {
        const md = await mdLoader();
        contentRaw.problems[i].markdown = md;
      } else throw new Error(`Problem markdown not found: ${mdPath}`);
    }
  }

  if (
    contentRaw.extraContents &&
    typeof contentRaw.extraContents === "object"
  ) {
    for (const key of Object.keys(contentRaw.extraContents)) {
      const mdPath = `/examples/${name}/extra-${key}.md`;
      const mdLoader = contentModules[mdPath];
      if (mdLoader) {
        const md = await mdLoader();
        contentRaw.extraContents[key].markdown = md;
      } else throw new Error(`Extra content markdown not found: ${mdPath}`);
    }
  }

  const content = contentZod.parse(contentRaw); // for validation
  return content;
}
