import z from "zod";
import {
  zExtraContentBase,
  zProblemBase,
  zContentBase,
} from "@/utils/documentZod";

export const zDateArr = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);

const zContent = zContentBase.extend({
  title: z.string(),
  subtitle: z.string(),
  dayname: z.string(),
  date: z.object({
    start: zDateArr,
    end: zDateArr,
  }),
  noi_style: z.boolean(),
  file_io: z.boolean(),
  use_pretest: z.boolean(),
  support_languages: z.array(
    z.object({
      uuid: z.uuid(),
      name: z.string(),
      compile_options: z.string(),
    }),
  ),
  problems: z.array(
    zProblemBase.extend({
      uuid: z.uuid(),
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
      markdown: z.string(),
      advancedEditing: z.boolean().default(false),
    }),
  ),
  extraContents: z.object({
    precaution: zExtraContentBase.extend({
      markdown: z.string(),
    }),
  }),
});
export default zContent;

true satisfies z.infer<
  typeof zContent
> extends import("@/types/document").ContentBase
  ? true
  : false;
