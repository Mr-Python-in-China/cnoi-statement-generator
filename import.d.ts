type FontMetaImportResult = {
  postscriptName: string;
  url: string;
};

declare module "*?font-meta" {
  const fontMetaImportResult: FontMetaImportResult;
  export default fontMetaImportResult;
}
