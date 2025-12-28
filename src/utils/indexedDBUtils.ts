import type { ContentBase, DocumentBase, ImmerContent } from "@/types/document";
import Dexie from "dexie";

/**
 * Dexie database schema
 */
class CnoiDatabase extends Dexie {
  // Using Table instead of EntityTable to support non-inlined keys
  documents!: Dexie.Table<DocumentBase, string>;

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
  }
}

const db = new CnoiDatabase();

/**
 * Save config to IndexedDB
 */
export async function saveContentToDB(
  docUUID: string,
  data: ImmerContent,
): Promise<void> {
  const storedData = {
    ...data,
    images: data.images.map(
      ({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        url, // Remove url field
        ...rest
      }) => rest,
    ),
  };
  const old = await db.documents.get(docUUID);
  if (!old) throw new Error("No existing config to update");
  await db.documents.put({
    ...old,
    content: storedData,
    modifiedAt: new Date().toISOString(),
  });
}

export async function loadDocumentFromDB(
  uuid: string,
): Promise<DocumentBase | undefined> {
  return (await db.documents.get(uuid)) || undefined;
}
await db.documents.toCollection().first();

export async function getFirstDocumentUUID() {
  return (await db.documents.toCollection().first())?.uuid;
}
