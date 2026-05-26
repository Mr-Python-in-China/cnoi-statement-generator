import type { TemplateUiMetadata } from "@/types/templates";

import ConfigPanel from "./configPanel";
import createNewProblem from "./createNewProblem";
import type { Content } from "./types";

export default {
  extraContents: {
    precaution: {
      displayName: "注意事项",
    },
  },
  ConfigPanelFC: ConfigPanel,
  createNewProblem,
} satisfies TemplateUiMetadata<Content>;
