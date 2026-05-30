import { DocNotFoundError } from "@/storage/errors";
import type {
  DocumentBase,
  DocumentMeta,
  ImmerDocument,
} from "@/types/document";
import { toImmerContent } from "@/utils/contestDataUtils";
import resolveUniqueDocumentName from "@/utils/resolveUniqueDocumentName";

import db from "./db";

class DocumentNotFoundError extends DocNotFoundError {
  constructor() {
    super("Document not found in IndexedDB");
  }
}

export class DocumentNameConflictError extends Error {
  constructor(public readonly documentName: string) {
    super(`Document name already exists: ${documentName}`);
  }
}

type StoredDocument = DocumentBase;

function toStoredDocument(doc: ImmerDocument | DocumentBase): StoredDocument {
  return {
    ...doc,
    content: {
      ...doc.content,
      images: doc.content.images.map((x) =>
        "url" in x ? (({ url: _url, ...rest }) => rest)(x) : x,
      ),
    },
  };
}

function toDocumentMeta(doc: StoredDocument, modifiedAt: Date): DocumentMeta {
  return {
    name: doc.name,
    templateId: doc.templateId,
    modifiedAt,
  };
}

export async function saveDocumentToDB(
  doc: ImmerDocument | DocumentBase,
  modifiedAt: Date = new Date(),
): Promise<StoredDocument> {
  const targetDoc = toStoredDocument(doc);
  const storedDocument: StoredDocument = {
    ...targetDoc,
  };

  await db.transaction(
    "rw",
    db.documents_content,
    db.documents_meta,
    async () => {
      await db.documents_content.put({
        name: storedDocument.name,
        content: storedDocument.content,
      });

      await db.documents_meta.put(toDocumentMeta(storedDocument, modifiedAt));
    },
  );

  return storedDocument;
}

export async function createDocumentToDB(
  doc: ImmerDocument | DocumentBase,
): Promise<DocumentBase> {
  const targetDoc = toStoredDocument(doc);
  const existing = await db.documents_meta.get(targetDoc.name);
  if (existing) throw new DocumentNameConflictError(targetDoc.name);
  return await saveDocumentToDB(targetDoc, new Date());
}

export async function loadDocumentFromDB(name: string): Promise<ImmerDocument> {
  const [contentEntry, metaEntry] = await Promise.all([
    db.documents_content.get(name),
    db.documents_meta.get(name),
  ]);
  if (!contentEntry || !metaEntry) throw new DocumentNotFoundError();
  return {
    ...contentEntry,
    content: toImmerContent(contentEntry.content),
    ...metaEntry,
  };
}

export async function loadDocumentMetasFromDB(): Promise<DocumentMeta[]> {
  return await db.documents_meta.toArray();
}

export async function cloneDocumentToDB(name: string, newName: string) {
  const contentEntry = await db.documents_content.get(name);
  const metaEntry = await db.documents_meta.get(name);
  if (!contentEntry || !metaEntry) throw new DocumentNotFoundError();

  const existingNames = await db.documents_meta.toCollection().primaryKeys();
  const uniqueName = resolveUniqueDocumentName(newName, existingNames);
  const newDoc: StoredDocument = {
    name: uniqueName,
    templateId: metaEntry.templateId,
    content: contentEntry.content,
  };

  const now = new Date();
  await saveDocumentToDB(newDoc, now);
  return toDocumentMeta(newDoc, now);
}

export async function renameDocumentToDB(
  oldName: string,
  newName: string,
): Promise<DocumentMeta> {
  if (oldName === newName) {
    const metaEntry = await db.documents_meta.get(oldName);
    if (!metaEntry) throw new DocumentNotFoundError();
    return metaEntry;
  }

  const [contentEntry, metaEntry, targetMeta] = await Promise.all([
    db.documents_content.get(oldName),
    db.documents_meta.get(oldName),
    db.documents_meta.get(newName),
  ]);
  if (!contentEntry || !metaEntry) throw new DocumentNotFoundError();
  if (targetMeta) throw new DocumentNameConflictError(newName);

  const renamedDocument: StoredDocument = {
    name: newName,
    templateId: metaEntry.templateId,
    content: contentEntry.content,
  };

  const now = new Date();

  await db.transaction(
    "rw",
    db.documents_content,
    db.documents_meta,
    async () => {
      await db.documents_content.delete(oldName);
      await db.documents_meta.delete(oldName);
      await db.documents_content.put({
        name: renamedDocument.name,
        content: renamedDocument.content,
      });
      await db.documents_meta.put(toDocumentMeta(renamedDocument, now));
    },
  );

  return toDocumentMeta(renamedDocument, now);
}

export async function deleteDocumentFromDB(name: string) {
  await db.transaction(
    "rw",
    db.documents_content,
    db.documents_meta,
    async () => {
      await db.documents_content.delete(name);
      await db.documents_meta.delete(name);
    },
  );
}

export async function loadDocumentMetaFromDB(
  name: string,
): Promise<DocumentMeta> {
  const metaEntry = await db.documents_meta.get(name);
  if (!metaEntry) throw new DocumentNotFoundError();
  return metaEntry;
}
