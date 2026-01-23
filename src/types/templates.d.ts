import type { ContentBase, ImmerContent } from "./document";

export type ConfigPanelFC<T extends ContentBase> = import("react").FC<{
  content: ImmerContent<T>;
  updateContent: import("use-immer").Updater<ImmerContent<T>>;
  setPanel: Dispatch<SetStateAction<string>>;
}>;

export type TemplateUiMetadata<Content extends ContentBase> = {
  extraContents: {
    [extraName in keyof Content["extraContents"]]: {
      displayName: string;
    };
  };
  ConfigPanelFC: ConfigPanelFC<Content>;
  createNewProblem: (
    content: ImmerContent<Content>,
  ) => Content["problems"][number];
};

export default interface TemplateExport<Content extends ContentBase> {
  contentZod: () => Promise<import("zod").ZodType<Content>>;
  unifiedPlugins: () => Promise<import("unified").PluggableList>;
  uiMeta: () => Promise<TemplateUiMetadata<Content>>;
  typst: () => Promise<Record<string, string>>; // import.meta.glob -> content
  fonts: () => Promise<FontMetaImportResult[]>;
}
