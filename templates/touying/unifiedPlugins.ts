import type mdast from "mdast";
import { visit } from "unist-util-visit";

export default [
  () => (tree: mdast.Root) => {
    tree.children.unshift({
      type: "typst",
      children: [{ type: "typstContent", data: `#import "header.typ": *\n\n` }],
    });
  },
  () => (tree: mdast.Root) => {
    visit(tree, "leafDirective", (node, index, parent) => {
      if (node.name === "pause")
        parent!.children[index!] = {
          type: "typst",
          children: [{ type: "typstContent", data: `#pause\n` }],
        };
      else if (node.name === "meanwhile")
        parent!.children[index!] = {
          type: "typst",
          children: [{ type: "typstContent", data: `#meanwhile\n` }],
        };
    });
  },
];
