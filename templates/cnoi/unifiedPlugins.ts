import type mdast from "mdast";
import { visit } from "unist-util-visit";
import stringWidth from "string-width";

export default [
  () => (tree: mdast.Root) => {
    visit(tree, (node) => {
      if (node.type !== "code") return;
      for (const s of node.value.split(/\n|\r|\u0085|\u2028|\u2029| |\u200B/)) {
        if (stringWidth(s) > 63)
          throw new Error(
            "不支持代码块内过长的单词。为了可读性，请直接下发文件，而非在 PDF 中直接显示。",
          );
      }
    });
  },
  () => (tree: mdast.Root) => {
    tree.children.unshift({
      type: "typst",
      children: [{ type: "typstContent", data: `#import "header.typ": *\n\n` }],
    });
  },
];
