import type { TemplateUiMetadata } from "@/types/templates";
import type { Content } from "./types";
import ConfigPanel from "./configPanel";
import createNewProblem from "./createNewProblem";

export default {
  extraContents: {
    precaution: {
      displayName: "注意事项",
    },
  },
  ConfigPanelFC: ConfigPanel,
  createNewProblem,
} satisfies TemplateUiMetadata<Content>;
