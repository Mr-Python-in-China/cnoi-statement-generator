import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified, type PluggableList } from "unified";

import remarkExtendedTable from "./remarkExtendedTable";
import remarkImageAttr from "./remarkImageAttr";
import remarkTypst from "./remarkTypst";

export default function getProcessor(extraPlugins: PluggableList) {
  return unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm)
    .use(remarkImageAttr)
    .use(remarkDirective)
    .use(remarkExtendedTable)
    .use(extraPlugins)
    .use(remarkTypst)
    .freeze();
}
