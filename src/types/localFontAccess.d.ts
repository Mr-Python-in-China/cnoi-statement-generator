declare global {
  class FontData {
    readonly family: string;
    readonly fullName: string;
    readonly postscriptName: string;
    readonly style: string;
    blob(): Promise<Blob>;
  }
  interface Window {
    queryLocalFonts?: (options: {
      postscriptNames: string[];
    }) => Promise<FontData[]>;
  }
}

export {};
