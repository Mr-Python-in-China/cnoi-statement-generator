import { zContentBase } from "@/utils/documentZod";
import z from "zod";
import themeList from "./themeList";

const zContent = zContentBase.extend({
  theme: z.literal(themeList.map((x) => x[0])),
  title: z.string(),
  subtitle: z.string(),
  author: z.string(),
  institution: z.string(),
  date: z.string(),
});

export default zContent;

export type Content = z.infer<typeof zContent>;

true satisfies z.infer<
  typeof zContent
> extends import("@/types/document").ContentBase
  ? true
  : false;
