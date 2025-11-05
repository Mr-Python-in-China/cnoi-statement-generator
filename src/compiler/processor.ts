import remarkDirective from "remark-directive";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkTypst from "./remarkTypst";
import remarkImageAttr from "./remarkImageAttr";

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkGfm)
  .use(remarkImageAttr)
  .use(remarkDirective)
  .use(remarkTypst)
  .freeze();

export default processor;
