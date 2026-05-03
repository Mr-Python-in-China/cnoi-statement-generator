import type { DocumentBase } from "@/types/document";
import { loadDocumentFromDB, saveDocumentToDB } from "@/utils/indexedDBUtils";

export async function saveDocument(
  path: URL,
  content: DocumentBase,
): Promise<DocumentBase> {
  await saveDocumentToDB({
    ...content,
    uuid: path.pathname,
  });
  return content;
}

export async function loadDocument(path: URL): Promise<DocumentBase> {
  return await loadDocumentFromDB(path.pathname);
}
