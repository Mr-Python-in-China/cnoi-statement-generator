import remarkDirective from "remark-directive";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkTypst from "./remarkTypst";
import remarkImageAttr from "./remarkImageAttr";
import remarkExtendedTable from "./remarkExtendedTable";

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkGfm)
  .use(remarkImageAttr)
  .use(remarkDirective)
  .use(remarkExtendedTable)
  .use(remarkTypst)
  .freeze();

export default processor;
