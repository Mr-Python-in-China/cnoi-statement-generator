import type { NavigateFunction } from "react-router";

import type { ImmerDocument } from "@/types/document";

let navigationState: {
  value:
    | {
        doc: ImmerDocument;
        encodedPath: string;
      }
    | undefined;
} = {
  value: undefined,
};

export default navigationState;

export function navigateToEditorWithDoc(
  navigate: NavigateFunction,
  doc: ImmerDocument,
  path: string[],
) {
  const encodedPath = path.map((x) => encodeURIComponent(x)).join("/");
  navigationState.value = {
    doc,
    encodedPath,
  };
  const url = new URL(window.location.href);
  url.searchParams.set("file", encodedPath);
  navigate({
    pathname: "/editor",
    search: url.search,
  });
}
