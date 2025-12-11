import CompilerInstance from "./compiler";

export default class TemplateManager {
  compiler: CompilerInstance;
  constructor(public readonly template: string) {
    this.compiler = new CompilerInstance(template);
  }
}
