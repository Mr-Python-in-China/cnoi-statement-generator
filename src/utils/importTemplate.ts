import type { ContentBase } from "@/types/document";
import type TemplateExport from "@/types/templates";

const templates = import.meta.glob<TemplateExport<ContentBase>>(
  "./**/index.ts",
  {
    base: "../templates",
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
