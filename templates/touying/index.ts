import type TemplateExport from "@/types/templates";
import type { Content } from "./contentZod";

export default {
  contentZod: () => import("./contentZod").then((mod) => mod.default),
  unifiedPlugins: () => import("./unifiedPlugins").then((mod) => mod.default),
  fonts: () => import("./fonts").then((mod) => mod.default),
  typst: () => import("./typst").then((mod) => mod.default),
  uiMeta: () => import("./uiMeta").then((mod) => mod.default),
} satisfies TemplateExport<Content>;
