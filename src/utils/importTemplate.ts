import type { ContentBase } from "@/types/document";
import type TemplateExport from "@/types/templates";

const templates = import.meta.glob<TemplateExport<ContentBase>>(
  "./*/index.ts",
  {
    base: "/templates",
    import: "default",
    eager: true,
  },
);
function getTemplateModule(template: string) {
  const v = templates[`./${template}/index.ts`];
  if (!v) throw new Error(`Invalid template "${template}": cannot find module`);
  return v;
}
export async function importContentZod(template: string) {
  return await getTemplateModule(template).contentZod();
}
export async function importUiMetadata(template: string) {
  return await getTemplateModule(template).uiMeta();
}
export async function importUnifiedPlugins(template: string) {
  return await getTemplateModule(template).unifiedPlugins();
}
export async function importTypstContents(template: string) {
  return Object.entries(await getTemplateModule(template).typst()).map((x) => [
    x[0].slice(1), // remove relative path leading dot
    x[1],
  ]);
}
export async function importFontUrlEnteries(template: string) {
  return (await getTemplateModule(template).fonts()).map((font) => [
    font.postscriptName,
    font.url,
  ]);
}
