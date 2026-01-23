type FontMetaImportResult = {
  postscriptName: string;
  url: string;
};

declare module "*?font-meta" {
  const fontMetaImportResult: FontMetaImportResult;
  export default fontMetaImportResult;
}

type ExampleMarkdownModules = Record<string, string>;

declare module "examples/*/virtual:example-md" {
  const modules: ExampleMarkdownModules;
  export default modules;
}
