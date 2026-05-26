import type { TemplateUiMetadata } from "@/types/templates";

import ConfigPanel from "./configPanel";
import { type Content } from "./contentZod";

export default {
  extraContents: {
    body: {
      displayName: "正文",
    },
  },
  ConfigPanelFC: ConfigPanel,
} satisfies TemplateUiMetadata<Content>;
