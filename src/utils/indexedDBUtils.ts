import type {
  ContentBase,
  DocumentBase,
  DocumentContentOnly,
  DocumentMeta,
  ImmerDocument,
} from "@/types/document";
import Dexie from "dexie";
import { toImmerContent } from "./contestDataUtils";

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
      config: "", // Empty string means the key is not part of the object (out-of-line key)
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
          const doc: DocumentBase = {
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
            } satisfies import("@/templates/cnoi/types").Content as ContentBase,
            uuid: crypto.randomUUID(),
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
          uuid: doc.uuid,
          name: doc.name,
          templateId: doc.templateId,
          modifiedAt: doc.modifiedAt,
          previewImage: undefined,
        }));
        await tx.table("documents_meta").bulkPut(metas);
      });
  }
}

const db = new CnoiDatabase();

export async function saveDocumentToDB(
  doc: ImmerDocument | DocumentBase,
  doNotOverrideModifiedAt = false,
): Promise<void> {
  const targetDoc =
    "previewImage" in doc
      ? {
          ...doc,
          content: {
            ...doc.content,
            images: doc.content.images.map(
              ({
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                url, // Remove url field
                ...rest
              }) => rest,
            ),
          },
        }
      : {
          ...doc,
          previewImage: undefined,
        };

  await db.transaction(
    "rw",
    db.documents_content,
    db.documents_meta,
    async () => {
      await db.documents_content.put({
        uuid: targetDoc.uuid,
        content: targetDoc.content,
      });

      await db.documents_meta.put({
        ...targetDoc,
        modifiedAt: doNotOverrideModifiedAt
          ? targetDoc.modifiedAt
          : new Date().toISOString(),
      });
    },
  );
}

export async function loadDocumentFromDB(uuid: string): Promise<ImmerDocument> {
  const [contentEntry, metaEntry] = await Promise.all([
    db.documents_content.get(uuid),
    db.documents_meta.get(uuid),
  ]);
  if (!contentEntry || !metaEntry) throw new Error("Document not found");
  return {
    ...contentEntry,
    content: toImmerContent(contentEntry.content),
    ...metaEntry,
  };
}

export async function loadDocumentMetasFromDB(): Promise<DocumentMeta[]> {
  return db.documents_meta.toArray();
}

export async function getFirstDocumentUuidFromDB() {
  return (await db.documents_meta.toCollection().first())?.uuid;
}

export async function cloneDocumentToDB(uuid: string, newName: string) {
  const contentEntry = await db.documents_content.get(uuid);
  const metaEntry = await db.documents_meta.get(uuid);
  if (!contentEntry || !metaEntry) throw new Error("Document not found");

  const newUUID = crypto.randomUUID();
  const newMeta = {
    uuid: newUUID,
    name: newName,
    templateId: metaEntry.templateId,
    modifiedAt: new Date().toISOString(),
    previewImage: metaEntry.previewImage,
  };
  await db.transaction(
    "rw",
    db.documents_content,
    db.documents_meta,
    async () => {
      await db.documents_content.put({
        uuid: newUUID,
        content: contentEntry.content,
      });

      await db.documents_meta.put(newMeta);
    },
  );
  return newMeta;
}
export async function renameDocumentToDB(uuid: string, newName: string) {
  const metaEntry = await db.documents_meta.get(uuid);
  if (!metaEntry) throw new Error("Document not found");
  const newMeta = {
    ...metaEntry,
    name: newName,
    modifiedAt: new Date().toISOString(),
  };
  await db.documents_meta.put(newMeta);
}
export async function deleteDocumentFromDB(uuid: string) {
  await db.transaction(
    "rw",
    db.documents_content,
    db.documents_meta,
    async () => {
      await db.documents_content.delete(uuid);
      await db.documents_meta.delete(uuid);
    },
  );
}
