import z from "zod";
import base64js from "base64-js";
import type { ContentBase } from "@/types/document";

export const zProblemBase = z.object({
  uuid: z.uuid(),
  title: z.string(),
  markdown: z.string(),
});
export const zExtraContentBase = z.object({
  markdown: z.string(),
});
export const zImageBase = z.object({
  uuid: z.string(),
  name: z.string(),
  blob: z.codec(z.base64(), z.instanceof(Blob), {
    decode: (data) => new Blob([Uint8Array.from(base64js.toByteArray(data))]),
    encode: async (blob) =>
      base64js.fromByteArray(
        new Uint8Array(await new Response(blob).arrayBuffer()),
      ),
  }),
});
export const zContentBase = z.object({
  problems: z.array(zProblemBase),
  extraContents: z.record(z.string(), zExtraContentBase),
  images: z.array(zImageBase),
});
export function getZDocument<Content extends ContentBase>(
  zContent: z.ZodType<Content>,
) {
  return z.object({
    uuid: z.uuid(),
    name: z.string(),
    templateId: z.string(),
    modifiedAt: z.iso.datetime(),
    content: zContent,
  });
}
