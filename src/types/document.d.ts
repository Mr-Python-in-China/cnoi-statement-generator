import z from "zod";
import { zContentBase, getZDocument } from "@/utils/documentZod";

export type ContentBase = z.infer<typeof zContentBase>;

export type PrecompileContent<Content extends ContentBase = ContentBase> = Omit<
  Content,
  "images"
> & {
  images: Omit<Content["images"][number], "blob">[];
};

export type CompiledContent<Content extends ContentBase = ContentBase> = Omit<
  PrecompileContent<Content>,
  "problems" | "extraContents"
> & {
  problems: (Omit<
    PrecompileContent<Content>["problems"][number],
    "markdown"
  > & {
    typst: string;
  })[];
  extraContents: {
    [K in keyof Content["extraContents"]]: Omit<
      PrecompileContent<Content>["extraContents"][K],
      "markdown"
    > & {
      typst: string;
    };
  };
};

export type ImmerContent<Content extends ContentBase = ContentBase> = Omit<
  Content,
  "images"
> & {
  images: (Content["images"][number] & {
    url: string;
  })[];
};

export type ImmerDocument<Document extends DocumentBase = DocumentBase> = Omit<
  Document,
  "content"
> & {
  content: ImmerContent<Document["content"]>;
  previewImage: Blob | undefined;
};

export type DocumentBase = z.infer<
  ReturnType<typeof getZDocument<typeof zContentBase>>
>;

export type DocumentMeta = Pick<
  DocumentBase,
  "uuid" | "name" | "templateId" | "modifiedAt"
> & {
  previewImage: Blob | undefined;
};

export type DocumentContentOnly = Pick<DocumentBase, "uuid" | "content">;
