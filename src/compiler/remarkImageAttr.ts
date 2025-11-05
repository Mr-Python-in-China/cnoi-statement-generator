import { type Plugin } from "unified";
import type * as mdast from "mdast";
import { visit } from "unist-util-visit";

declare module "mdast" {
  interface ImageData {
    attr?: Record<string, string | undefined>;
  }
  interface ImageReferenceData {
    attr?: Record<string, string | undefined>;
  }
}

export function parseAttr(
  s: string,
): [attr: Record<string, string | undefined>, rest: string] | undefined {
  const attr: Record<string, string | undefined> = {};
  let status:
    | {
        type: "didn't start";
      }
    | {
        type: "ended";
      }
    | {
        type: "key";
        buf: string[];
      }
    | {
        type: "value unknown";
        key: string;
      }
    | {
        type:
          | "value without quote"
          | "value with single quote"
          | "value with double quote";
        key: string;
        buf: string[];
      }
    | { type: "wait for next" } = { type: "didn't start" };
  let len = 0;
  for (const c of s) {
    ++len;
    if (c === "\n" || c === "\r" || c === "\t") break;
    if (status.type === "didn't start") {
      if (c !== "{") break;
      status = { type: "key", buf: [] };
    } else if (status.type === "key") {
      if (c === "=") {
        if (status.buf.length === 0) break;
        status = {
          type: "value unknown",
          key: status.buf.join("").trim(),
        };
      } else if (c === ",") {
        attr[status.buf.join("").trim()] = undefined;
        status = { type: "key", buf: [] };
      } else if (c === "}") {
        status = { type: "ended" };
        break;
      } else status.buf.push(c);
    } else if (status.type === "value unknown") {
      if (c === " ") continue;
      else if (c === "'")
        status = {
          type: "value with single quote",
          key: status.key,
          buf: [],
        };
      else if (c === '"')
        status = {
          type: "value with double quote",
          key: status.key,
          buf: [],
        };
      else if (c === ",") {
        attr[status.key] = "";
        status = { type: "key", buf: [] };
      } else if (c === "}") {
        attr[status.key] = "";
        status = { type: "ended" };
        break;
      } else if (c === "=") break;
      else
        status = {
          type: "value without quote",
          key: status.key,
          buf: [c],
        };
    } else if (status.type === "value without quote") {
      if (c === ",") {
        attr[status.key] = status.buf.join("").trim();
        status = { type: "key", buf: [] };
      } else if (c === "}") {
        attr[status.key] = status.buf.join("").trim();
        status = { type: "ended" };
        break;
      } else if (c === "=") break;
      else status.buf.push(c);
    } else if (status.type === "value with single quote") {
      if (c === "'") {
        attr[status.key] = status.buf.join("");
        status = { type: "wait for next" };
      } else status.buf.push(c);
    } else if (status.type === "value with double quote") {
      if (c === '"') {
        attr[status.key] = status.buf.join("");
        status = { type: "wait for next" };
      } else status.buf.push(c);
    } else if (status.type === "wait for next") {
      if (c === ",") {
        status = { type: "key", buf: [] };
      } else if (c === "}") {
        status = { type: "ended" };
        break;
      } else if (c !== " ") break;
    }
  }
  if (status.type !== "ended") return undefined;
  else return [attr, s.slice(len)];
}

const remarkImageAttr: Plugin<[], mdast.Root, mdast.Root> = () => {
  return (tree) => {
    if (tree.type !== "root")
      throw new TypeError(`Expected root node, got ${tree.type}`);
    visit(tree, (node) => {
      if (!("children" in node)) return;
      for (let i = 1; i < node.children.length; ++i) {
        const pre = node.children[i - 1],
          cur = node.children[i];
        if (
          (pre.type !== "image" && pre.type !== "imageReference") ||
          cur.type !== "text"
        )
          continue;
        const res = parseAttr(cur.value);
        if (!res) continue;
        const [attr, rest] = res;
        if (!pre.data) pre.data = {};
        if (!pre.data.attr) pre.data.attr = {};
        Object.assign(pre.data.attr, attr);
        cur.value = rest;
      }
      node.children = node.children.filter((n) => n.type !== "text" || n.value);
    });
  };
};

export default remarkImageAttr;
