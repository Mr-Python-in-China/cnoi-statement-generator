import type mdast from "mdast";

export default [
  () => (tree: mdast.Root) => {
    tree.children.unshift({
      type: "typst",
      children: [{ type: "typstContent", data: `#import "header.typ": *\n\n` }],
    });
  },
];
