import type { ContentBase, DocumentBase } from "@/types/document";
import z from "zod";
import { getZDocument } from "./documentZod";
import { importContentZod } from "./importTemplate";
import base64js from "base64-js";

const zOldContent = z.object({
  title: z.string(),
  subtitle: z.string(),
  dayname: z.string(),
  date: z.object({
    start: z.tuple([
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
    ]),
    end: z.tuple([
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
      z.number(),
    ]),
  }),
  noi_style: z.boolean(),
  file_io: z.boolean(),
  use_pretest: z.boolean(),
  support_languages: z.array(
    z.object({
      name: z.string(),
      compile_options: z.string(),
    }),
  ),
  problems: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      type: z.string(),
      dir: z.string(),
      exec: z.string(),
      input: z.string(),
      output: z.string(),
      time_limit: z.string(),
      memory_limit: z.string(),
      testcase: z.string(),
      point_equal: z.string(),
      submit_filename: z.array(z.string()),
      pretestcase: z.string(),
      statementMarkdown: z.string(),
    }),
  ),
  precautionMarkdown: z.string(),
  images: z.array(
    z.object({
      uuid: z.uuid(),
      name: z.string(),
      base64: z.base64(),
    }),
  ),
});

export async function documentToJson(doc: DocumentBase) {
  return JSON.stringify(
    await getZDocument(await importContentZod(doc.templateId)).encodeAsync(doc),
  );
}

export async function jsonToDocument(str: string): Promise<DocumentBase> {
  const obj = JSON.parse(str);
  try {
    const docBase = await getZDocument(z.any()).parseAsync(obj);
    return getZDocument(await importContentZod(docBase.templateId)).parseAsync(
      obj,
    );
  } catch (e) {
    if (!(e instanceof z.ZodError)) throw e;
    console.warn("Failed to parse document. Retrying with old schema.", e);
    const content = await zOldContent.parseAsync(obj);
    return {
      name: content.title,
      uuid: "",
      templateId: "cnoi",
      modifiedAt: new Date().toISOString(),
      content: {
        title: content.title,
        subtitle: content.subtitle,
        dayname: content.dayname,
        date: content.date,
        noi_style: content.noi_style,
        file_io: content.file_io,
        use_pretest: content.use_pretest,
        support_languages: content.support_languages.map((x) => ({
          ...x,
          uuid: crypto.randomUUID(),
        })),
        problems: content.problems.map((p) => ({
          uuid: crypto.randomUUID(),
          name: p.name,
          title: p.title,
          type: p.type,
          dir: p.dir,
          exec: p.exec,
          input: p.input,
          output: p.output,
          time_limit: p.time_limit,
          memory_limit: p.memory_limit,
          testcase: p.testcase,
          advancedEditing: false,
          point_equal: p.point_equal,
          submit_filename: p.submit_filename,
          markdown: p.statementMarkdown,
          pretestcase: p.pretestcase,
        })),
        extraContents: {
          precaution: {
            markdown: content.precautionMarkdown,
          },
        },
        images: content.images.map((img) => ({
          uuid: img.uuid,
          name: img.name,
          blob: new Blob([Uint8Array.from(base64js.toByteArray(img.base64))]),
        })),
      } satisfies import("@/templates/cnoi/types").Content as ContentBase,
    };
  }
}
