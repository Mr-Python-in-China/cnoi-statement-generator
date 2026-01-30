import type { TemplateUiMetadata } from "@/types/templates";
import { type Content } from "./contentZod";
import ConfigPanel from "./configPanel";

export default {
  extraContents: {
    body: {
      displayName: "正文",
    },
  },
  ConfigPanelFC: ConfigPanel,
} satisfies TemplateUiMetadata<Content>;
