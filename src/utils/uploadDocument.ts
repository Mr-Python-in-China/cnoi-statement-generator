import type { NavigateFunction } from "react-router";

import { navigateToEditorWithDoc } from "@/router/editor/navigationState";
import { toImmerContent } from "@/utils/contestDataUtils";
import { jsonToDocument } from "@/utils/jsonDocument";

type UploadDocumentOptions = {
  navigate: NavigateFunction;
  beforeOpen?: () => boolean | Promise<boolean>;
  onError?: (error: unknown) => void;
};

export async function uploadDocumentFromFile({
  navigate,
  beforeOpen,
  onError,
}: UploadDocumentOptions) {
  const canOpen = await Promise.resolve(beforeOpen?.() ?? true);
  if (!canOpen) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csg,.json,application/json";
  input.addEventListener(
    "change",
    async () => {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      try {
        const text = await file.text();
        const loadedDoc = await jsonToDocument(text);
        loadedDoc.name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        navigateToEditorWithDoc(
          navigate,
          { ...loadedDoc, content: toImmerContent(loadedDoc.content) },
          ["tmp", crypto.randomUUID()],
        );
      } catch (e) {
        if (onError) {
          onError(e);
        } else {
          console.error("Error when loading document from uploaded file.", e);
        }
      }
    },
    { once: true },
  );
  input.click();
}
