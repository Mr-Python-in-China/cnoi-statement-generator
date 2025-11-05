import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import remarkTypst from "./remarkTypst";

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkGfm)
  .use(remarkDirective)
  .use(remarkTypst)
  .freeze();

export default processor;
