import CompilerInstance from "./compiler";
import type { ContentBase } from "./types/document";
import type { TemplateUiMetadata } from "./types/templates";
import { importUiMetadata } from "./utils/importTemplate";

export default class TemplateManager {
  compiler: CompilerInstance;
  uiMetadataPromise: Promise<TemplateUiMetadata<ContentBase>>;
  constructor(public readonly template: string) {
    this.compiler = new CompilerInstance(template);
    this.uiMetadataPromise = importUiMetadata(template);
  }
  dispose() {
    this.compiler.dispose();
  }
}
