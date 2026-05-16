import type { DocumentBase } from "@/types/document";

import * as browserStorage from "./browser";
import DocNotFoundError from "./docNotFoundError";

const storageMethods = {
  browser: browserStorage,
};

export async function saveDocument(
  path: URL,
  content: DocumentBase,
): Promise<DocumentBase> {
  const protocol = path.protocol.slice(0, -1);
  if (!(protocol in storageMethods)) {
    throw new DocNotFoundError(`Unsupported storage method: ${protocol}`);
  }
  const method = storageMethods[protocol as keyof typeof storageMethods];
  return await method.saveDocument(path, content);
}

export async function loadDocument(path: URL): Promise<DocumentBase> {
  const protocol = path.protocol.slice(0, -1);
  if (!(protocol in storageMethods)) {
    throw new DocNotFoundError(`Unsupported storage method: ${protocol}`);
  }
  const method = storageMethods[protocol as keyof typeof storageMethods];
  return await method.loadDocument(path);
}
