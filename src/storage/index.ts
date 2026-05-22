import type { DocumentBase } from "@/types/document";

import { DocNotFoundError } from "./errors";
import type { StorageMethodObject } from "./types";

export const storageMethods = Object.fromEntries(
  Object.entries(
    import.meta.glob<StorageMethodObject>("./*/index.tsx", {
      eager: true,
      import: "default",
    }),
  ).map(([key, module]) => [key.split("/")[1], module]),
);

export async function saveDocument(
  path: string[],
  content: DocumentBase,
): Promise<DocumentBase> {
  const [methodName, ...restPath] = path;
  if (!(methodName in storageMethods)) {
    throw new DocNotFoundError(`Unsupported storage method: ${methodName}`);
  }
  const storageMethod =
    storageMethods[methodName as keyof typeof storageMethods];
  return await storageMethod.saveDocument(restPath, content);
}

export async function loadDocument(path: string[]): Promise<DocumentBase> {
  const [methodName, ...restPath] = path;
  if (!(methodName in storageMethods)) {
    throw new DocNotFoundError(`Unsupported storage method: ${methodName}`);
  }
  const storageMethod =
    storageMethods[methodName as keyof typeof storageMethods];
  return await storageMethod.loadDocument(restPath);
}
