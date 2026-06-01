export const docTitles = import.meta.glob<string>("./**/*.typ", {
  eager: true,
  base: "/docs",
  query: "parts",
  import: "title",
});

export const docBodies = import.meta.glob<string>("./**/*.typ", {
  eager: false,
  base: "/docs",
  query: "parts",
  import: "body",
});

export const docFilenames = Object.keys(docTitles);

/**
 * @param path A path with leading or trailing slashes, or not, such as "foo/bar", "foo/bar/", "/foo/bar", or "/foo/bar/"
 * @returns The filename of the .typ file corresponding to the given path, or undefined if not found
 */
export function matchDoc(path: string): string | undefined {
  if (!path.startsWith("/")) path = "/" + path;
  path = "." + path;
  path = path.replace(/\/*$/, "");
  for (const filename of docFilenames)
    if (
      filename.replace(/\.typ$/, "") === path ||
      filename.replace(/\/index\.typ$/, "") === path
    )
      return filename;
  return undefined;
}
