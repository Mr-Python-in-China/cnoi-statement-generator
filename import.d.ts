type FontMetaImportResult = {
  postscriptName: string;
  url: string;
};

declare module "*?font-meta" {
  const fontMetaImportResult: FontMetaImportResult;
  export default fontMetaImportResult;
}

type ExampleMarkdownModules = Record<string, string>;

declare module "*?split" {
  const urls: string[];
  export default urls;
}
