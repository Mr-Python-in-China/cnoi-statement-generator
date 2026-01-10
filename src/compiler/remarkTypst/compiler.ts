import type * as mdast from "mdast";
import { visit } from "unist-util-visit";
import { h64 } from "xxhashjs";

import type {} from "remark-directive";
import type {} from "remark-gfm";
import type {} from "remark-math";
import type {} from "remark-parse";
import type {} from "../remarkImageAttr";
import type {} from "../remarkExtendedTable";

declare module "mdast" {
  interface TypstContentNode {
    type: "typstContent";
    data: string;
  }
  interface TypstNode extends mdast.Node {
    type: "typst";
    children: (mdast.PhrasingContent | TypstContentNode)[];
  }
  interface PhrasingContentMap {
    typst: TypstNode;
  }
  interface BlockContentMap {
    typst: TypstNode;
  }
  interface RootContentMap {
    typst: TypstNode;
    typstContent: TypstContentNode;
  }
}

const hash = (s: string) => h64(s, 147154220).toString(16).padStart(16, "0");

export interface AssetInfo {
  assetUrl: string;
  filename: string;
}

export interface CompilerContext {
  assets: AssetInfo[];
  data: string[];
  definitionById: Map<string, mdast.Definition>;
  footnoteById: Map<
    string,
    { node: mdast.FootnoteDefinition; visited: boolean }
  >;
}

const FOOTNOTE_ID_PREFIX = "user-footnote: ";

export const TYPST_RELATIVE_VALUE_REGEX =
  /^(?: *[+-]? *(?:\d+(?:\.\d+)?|\.\d+)(?:pt|mm|cm|in|em|%))(?: *[+-] *(?:\d+(?:\.\d+)?|\.\d+)(?:pt|mm|cm|in|em|%))* *$/;

export function escapeTypstString(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r");
}

export function initContext(): CompilerContext {
  return {
    assets: [],
    data: [],
    definitionById: new Map(),
    footnoteById: new Map(),
  };
}

export function collectDefinitions(
  tree: mdast.Root,
  { definitionById, footnoteById }: CompilerContext,
) {
  // Collect definitions and footnote definitions
  visit(tree, (node) => {
    if (node.type === "definition") {
      if (!definitionById.has(node.identifier))
        definitionById.set(node.identifier, node);
    } else if (node.type === "footnoteDefinition") {
      if (!footnoteById.has(node.identifier))
        footnoteById.set(node.identifier, { node, visited: false });
    }
  });
}

// https://github.com/syntax-tree/mdast-util-to-hast/blob/f511a93817b131fb73419bf7d24d73a5b8b0f0c2/lib/revert.js#L23
// Revert reference nodes to plain text
function revert(
  node: Extract<mdast.Nodes, mdast.Reference>,
  ctx: CompilerContext,
) {
  const { data } = ctx;
  let suffix = '#"]';
  if (node.referenceType === "collapsed") {
    suffix += "[]";
  } else if (node.referenceType === "full") {
    suffix += "[" + escapeTypstString(node.label || node.identifier) + "]";
  }
  suffix += '"';
  if (node.type === "imageReference") {
    data.push(
      '#"!["#"',
      node.alt ? escapeTypstString(node.alt) : "",
      '"',
      suffix,
    );
    return;
  }
  node.type satisfies "linkReference";
  data.push('#"["');
  for (const child of node.children) parseContent(child, ctx);
  data.push(suffix);
}

function fallbackHandler(node: mdast.Parent, ctx: CompilerContext) {
  for (const child of node.children) parseContent(child, ctx);
}
export const handlers = {
  text: (node, ctx) => {
    const { data } = ctx;
    data.push('#"', escapeTypstString(node.value), '"');
  },
  paragraph: (node, ctx) => {
    const { data } = ctx;
    data.push("#par[");
    for (const child of node.children) parseContent(child, ctx);
    data.push("]\n");
  },
  heading: (node, ctx) => {
    const { data } = ctx;
    data.push(`#heading(level: ${node.depth}, [`);
    for (const child of node.children) parseContent(child, ctx);
    data.push("])\n");
  },
  break: (_node, ctx) => {
    const { data } = ctx;
    data.push(`#"\\n"`);
  },
  emphasis: (node, ctx) => {
    const { data } = ctx;
    data.push("#emph[");
    for (const child of node.children) parseContent(child, ctx);
    data.push("]");
  },
  strong: (node, ctx) => {
    const { data } = ctx;
    data.push("#strong[");
    for (const child of node.children) parseContent(child, ctx);
    data.push("]");
  },
  delete: (node, ctx) => {
    const { data } = ctx;
    data.push("#strike[");
    for (const child of node.children) parseContent(child, ctx);
    data.push("]");
  },
  blockquote: (node, ctx) => {
    const { data } = ctx;
    data.push("#quote(block: true)[\n");
    for (const child of node.children) parseContent(child, ctx);
    data.push("]\n");
  },
  code: (node, ctx) => {
    const { data } = ctx;
    data.push(
      `#raw(block: true, lang: "${escapeTypstString(
        !node.lang
          ? "txt"
          : node.lang === "plain"
            ? "txt"
            : node.lang === "markdown"
              ? "md"
              : node.lang,
      )}", "`,
      escapeTypstString(node.value),
      '")\n',
    );
  },
  inlineCode: (node, ctx) => {
    const { data } = ctx;
    data.push(
      `#raw(block: false, lang: "txt", "`,
      escapeTypstString(node.value),
      '")',
    );
  },
  list: (node, ctx) => {
    const { data } = ctx;
    if (node.ordered) {
      data.push("#enum(");
      if (typeof node.start === "number") data.push(`start: ${node.start},`);
    } else {
      data.push("#list(");
    }
    data.push("\n");
    for (const item of node.children) {
      data.push("[");
      parseContent(item, ctx);
      data.push("],\n");
    }
    data.push(")\n");
  },
  listItem: (node, ctx) => {
    for (const item of node.children) {
      if (item.type === "paragraph")
        for (const child of item.children) parseContent(child, ctx);
      else parseContent(item, ctx);
    }
  },
  link: (node, ctx) => {
    const { data } = ctx;
    data.push('#link("', escapeTypstString(node.url), '", [');
    for (const child of node.children) parseContent(child, ctx);
    data.push("])");
  },
  math: (node, ctx) => {
    const { data } = ctx;
    data.push('#mi(block: true, "', escapeTypstString(node.value), '")\n');
  },
  inlineMath: (node, ctx) => {
    const { data } = ctx;
    data.push('#mi(block: false, "', escapeTypstString(node.value), '")');
  },
  table: (node, ctx) => {
    const { data } = ctx;
    if (node.children.length === 0) return;
    const columns = node.align?.length ?? node.children[0].children.length;
    data.push(`#figure(table(columns: ${columns}, align: (`);
    for (let i = 0; i < columns; ++i) {
      const align = node.align?.[i];
      if (!align || align === "center") data.push("center + horizon, ");
      else if (align === "left") data.push("left + horizon, ");
      else if (align === "right") data.push("right + horizon, ");
      else {
        align satisfies never;
        throw new Error(`Unknown table alignment: ${align}`, { cause: node });
      }
    }
    data.push("),\n");
    for (const row of node.children) {
      row.type satisfies "tableRow";
      for (let i = 0; i < columns; ++i) {
        const cell: mdast.TableCell | undefined = row.children[i];
        if (!cell) {
          parseContent(
            {
              type: "tableCell",
              children: [],
            },
            ctx,
          );
          data.push(", ");
        } else if (!cell.data?.removedByExtendedTable) {
          parseContent(cell, ctx);
          data.push(", ");
        }
      }
      data.push("\n");
    }
    data.push("))\n");
  },
  tableRow: () => {
    throw new Error("tableRow nodes should be handled in table nodes");
  },
  tableCell: (node, ctx) => {
    const { data } = ctx;
    data.push("table.cell(");
    if (node.data?.colspan) data.push(`colspan: ${node.data.colspan}, `);
    if (node.data?.rowspan) data.push(`rowspan: ${node.data.rowspan}, `);
    data.push(")[");
    for (const child of node.children) parseContent(child, ctx);
    data.push("]");
  },
  thematicBreak: (_node, ctx) => {
    const { data } = ctx;
    data.push("#thematic-break\n");
  },
  image: (node, ctx) => {
    const { data, assets } = ctx;
    const assertID = "img-" + hash(node.url);
    data.push('#box(image("', assertID, '"');
    for (const k of ["width", "height"] as const) {
      const val = node.data?.attr?.[k];
      if (typeof val !== "string" || !TYPST_RELATIVE_VALUE_REGEX.test(val))
        continue;
      data.push(`, ${k}: ${val}`);
    }
    if (node.alt) data.push(', alt: "', escapeTypstString(node.alt), '"');
    data.push("))");
    assets.push({
      assetUrl: node.url,
      filename: assertID,
    });
  },
  definition: () => {
    // We have already processed definitions, skip here.
  },
  footnoteDefinition: () => {
    // We have already processed footnote definitions, skip here.
  },
  linkReference: (node, ctx) => {
    const { data, definitionById } = ctx;
    const def = definitionById.get(node.identifier);
    if (def) {
      data.push('#link("', escapeTypstString(def.url), '", [');
      for (const child of node.children) parseContent(child, ctx);
      data.push("])");
    } else revert(node, ctx);
  },
  imageReference: (node, ctx) => {
    const { data, assets, definitionById } = ctx;
    const def = definitionById.get(node.identifier);
    if (def) {
      const assertID = "img-" + hash(def.url);
      data.push('#box(image("', assertID, '"');
      for (const k of ["width", "height"] as const) {
        const val = node.data?.attr?.[k];
        if (typeof val !== "string" || !TYPST_RELATIVE_VALUE_REGEX.test(val))
          continue;
        data.push(`, ${k}: ${val}`);
      }
      if (node.alt) data.push(', alt: "', escapeTypstString(node.alt), '"');
      data.push("))");
      assets.push({
        assetUrl: def.url,
        filename: assertID,
      });
    } else revert(node, ctx);
  },
  footnoteReference: (node, ctx) => {
    const { data, footnoteById } = ctx;
    const footnote = footnoteById.get(node.identifier);
    if (footnote) {
      footnote.visited = true;
      data.push(
        '#footnote(label("',
        FOOTNOTE_ID_PREFIX + escapeTypstString(node.identifier),
        '"))',
      );
    } else {
      data.push('#"[^', escapeTypstString(node.identifier), ']"');
    }
  },
  html: (node, ctx) => {
    const { data } = ctx;
    // HTML is not supported in Typst, render as raw
    data.push(
      '#raw(block: false, lang: "html", "',
      escapeTypstString(node.value),
      '")',
    );
  },
  yaml: () => {
    // we have no use now, skip it
  },
  containerDirective: (node, ctx) => {
    const { data } = ctx;
    if (node.name === "figure") {
      data.push("#figure(");
      if (node.attributes?.caption)
        data.push(
          'caption: "',
          escapeTypstString(String(node.attributes.caption)),
          '", ',
        );
      data.push(")[\n");
      for (const child of node.children) parseContent(child, ctx);
      data.push("]\n");
    } else fallbackHandler(node, ctx);
  },
  textDirective: (node, ctx) => {
    fallbackHandler(node, ctx);
  },
  leafDirective: (node, ctx) => {
    fallbackHandler(node, ctx);
  },
  typst: (node, ctx) => {
    fallbackHandler(node, ctx);
  },
  typstContent: (node, ctx) => {
    const { data } = ctx;
    data.push(node.data);
  },
} as const satisfies {
  [K in keyof mdast.RootContentMap]: (
    node: mdast.RootContentMap[K],
    ctx: CompilerContext,
  ) => void;
};

true satisfies "math" extends keyof mdast.RootContentMap ? true : false;

function parseContent(node: mdast.RootContent, ctx: CompilerContext): void {
  handlers[node.type](node as never, ctx);
}

function parseRoot(node: mdast.Root, ctx: CompilerContext) {
  const { data, footnoteById } = ctx;
  for (const child of node.children) parseContent(child, ctx);
  data.push("\n");
  // footnotes
  data.push("#hide(place(top+left, [\n");
  for (const [id, { node, visited }] of footnoteById) {
    if (!visited) continue;
    data.push("#footnote[\n");
    for (const child of node.children) parseContent(child, ctx);
    data.push(']#label("', FOOTNOTE_ID_PREFIX + escapeTypstString(id), '")\n');
  }
  data.push("]))\n");
}

export default function compileMdast(tree: mdast.Root): [string, AssetInfo[]] {
  const ctx = initContext();
  collectDefinitions(tree, ctx);
  parseRoot(tree, ctx);
  return [ctx.data.join(""), ctx.assets];
}
