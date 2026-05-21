import type {
  ContentBase,
  DocumentBase,
  DocumentContentOnly,
  DocumentMeta,
  ImmerDocument,
} from "@/types/document";
import Dexie from "dexie";
import { toImmerContent } from "./contestDataUtils";

export class DocumentNotFoundError extends Error {
  constructor() {
    super("Document not found in IndexedDB");
  }
}

export class DocumentNameConflictError extends Error {
  constructor(public readonly documentName: string) {
    super(`Document name already exists: ${documentName}`);
  }
}

export function resolveUniqueDocumentName(
  baseName: string,
  existingNames: Iterable<string>,
): string {
  const takenNames = new Set(existingNames);
  if (!takenNames.has(baseName)) return baseName;

  for (let index = 1; ; index += 1) {
    const candidate = `${baseName}(${index})`;
    if (!takenNames.has(candidate)) return candidate;
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

/**
 * Dexie database schema
 */
class CnoiDatabase extends Dexie {
  // Using Table instead of EntityTable to support non-inlined keys
  documents_content!: Dexie.Table<DocumentContentOnly, string>;
  documents_meta!: Dexie.Table<DocumentMeta, string>;

  constructor() {
    super("cnoi-statement-generator");
    this.version(1).stores({
      config: "",
      images: "uuid",
    });
    this.version(2)
      .stores({
        config: null,
        images: null,
        documents: "uuid",
      })
      .upgrade(async (tx) => {
        const images = Object.fromEntries(
          (await tx.table("images").toArray()).map(
            (img: { uuid: string; blob: Blob }) => [img.uuid, img.blob],
          ),
        );
        const oldConfigs = (await tx
          .table("config")
          .toArray()) as import("@/types/_oldContestData").StoredContestData[];
        for (const old of oldConfigs) {
          const doc = {
            content: {
              title: old.title,
              date: old.date,
              dayname: old.dayname,
              subtitle: old.subtitle,
              noi_style: old.noi_style,
              file_io: old.file_io,
              use_pretest: old.use_pretest,
              support_languages: old.support_languages.map((x) => ({
                uuid: crypto.randomUUID(),
                name: x.name,
                compile_options: x.compile_options,
              })),
              problems: old.problems.map((x) => ({
                uuid: crypto.randomUUID(),
                type: x.type,
                title: x.title,
                name: x.name,
                dir: x.dir,
                exec: x.exec,
                input: x.input,
                output: x.output,
                time_limit: x.time_limit,
                memory_limit: x.memory_limit,
                testcase: x.testcase,
                point_equal: x.point_equal,
                submit_filename: x.submit_filename,
                pretestcase: x.pretestcase,
                markdown: x.statementMarkdown,
                advancedEditing: true,
              })),
              extraContents: {
                precaution: {
                  markdown: old.precautionMarkdown,
                },
              },
              images: old.images.map((img) => ({
                uuid: img.uuid,
                name: img.name,
                blob: images[img.uuid],
              })),
            } satisfies import("templates/cnoi/types").Content as ContentBase,
            name: old.title,
            templateId: "cnoi",
            modifiedAt: new Date().toISOString(),
          };
          await tx.table("documents").put(doc);
        }
      });

    this.version(3)
      .stores({
        documents: null,
        documents_content: "uuid",
        documents_meta: "uuid",
      })
      .upgrade(async (tx) => {
        await tx
          .table("documents")
          .toArray()
          .then((docs) =>
            docs.map((doc) => ({ uuid: doc.uuid, content: doc.content })),
          )
          .then((docs) => tx.table("documents_content").bulkPut(docs));
        const docs = await tx.table("documents").toArray();
        const metas: DocumentMeta[] = docs.map((doc) => ({
          name: doc.name,
          templateId: doc.templateId,
          modifiedAt: doc.modifiedAt,
          previewImage: undefined,
        }));
        await tx.table("documents_meta").bulkPut(metas);
      });

    this.version(4)
      .stores({
        documents_content_by_name: "name",
        documents_meta_by_name: "name",
      })
      .upgrade(async (tx) => {
        const oldMetaEntries = (await tx
          .table("documents_meta")
          .toArray()) as Array<DocumentMeta & { uuid: string }>;
        const oldContentEntries = (await tx
          .table("documents_content")
          .toArray()) as Array<{ uuid: string; content: ContentBase }>;
        const contentByUuid = new Map(
          oldContentEntries.map(
            (entry) => [entry.uuid, entry.content] as const,
          ),
        );
        const seenNames = new Set<string>();
        const newContentEntries: DocumentContentOnly[] = [];
        const newMetaEntries: DocumentMeta[] = [];

        for (const oldMeta of oldMetaEntries) {
          const content = contentByUuid.get(oldMeta.uuid);
          if (!content) continue;

          const uniqueName = resolveUniqueDocumentName(oldMeta.name, seenNames);
          seenNames.add(uniqueName);

          newContentEntries.push({
            name: uniqueName,
            content,
          });
          newMetaEntries.push({
            name: uniqueName,
            templateId: oldMeta.templateId,
            modifiedAt: oldMeta.modifiedAt,
            // @ts-expect-error old schema
            previewImage: oldMeta.previewImage,
          });
        }

        await tx.table("documents_content_by_name").bulkPut(newContentEntries);
        await tx.table("documents_meta_by_name").bulkPut(newMetaEntries);
      });

    this.version(5).stores({
      documents_content: null,
      documents_meta: null,
      documents_content_by_name: "name",
      documents_meta_by_name: "name",
    });

    this.version(6)
      .stores({
        documents_content_by_name: null,
        documents_meta_by_name: null,
        documents_content: "name",
        documents_meta: "name",
      })
      .upgrade(async (tx) => {
        const oldContentEntries = (await tx
          .table("documents_content_by_name")
          .toArray()) as DocumentContentOnly[];
        const oldMetaEntries = (await tx
          .table("documents_meta_by_name")
          .toArray()) as DocumentMeta[];

        await tx.table("documents_content").bulkPut(oldContentEntries);
        await tx.table("documents_meta").bulkPut(oldMetaEntries);
      });

    this.version(7)
      .stores({
        documents_content: "name",
        documents_meta: "name",
      })
      .upgrade(async (tx) => {
        const oldMetaEntries = (await tx
          .table("documents_meta")
          .toArray()) as Array<DocumentMeta & { modifiedAt: string }>;

        const newMetaEntries = oldMetaEntries.map((meta) => ({
          ...meta,
          modifiedAt: new Date(meta.modifiedAt),
        }));

        await tx.table("documents_meta").bulkPut(newMetaEntries);
      });
  }
}

const db = new CnoiDatabase();

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
