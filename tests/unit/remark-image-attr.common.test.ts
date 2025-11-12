import { describe, expect, test } from "vitest";
import { remark } from "remark";
import type { Root, Paragraph, Image, ImageReference, Text } from "mdast";
import remarkImageAttr, { parseAttr } from "@/compiler/remarkImageAttr";

describe("parseAttr", () => {
  test("must start with '{' at the first character", () => {
    expect(parseAttr("{a=1}")).toEqual([{ a: "1" }, ""]);
    expect(parseAttr(" {a=1}")).toBeUndefined();
    expect(parseAttr("x{a=1}")).toBeUndefined();
  });

  test("supports key=value with commas and spaces around tokens", () => {
    expect(parseAttr("{ a = 1 }")).toEqual([{ a: "1" }, ""]);
    expect(parseAttr("{a=1 , b=2}")).toEqual([{ a: "1", b: "2" }, ""]);
    expect(parseAttr("{  a = 1  ,  b = 2  }")).toEqual([
      { a: "1", b: "2" },
      "",
    ]);
  });

  test("allows quoted values with '=' and ',' inside", () => {
    const input = "{a='1,2=3', b=\"x,y=z\"}";
    const res = parseAttr(input);
    expect(res).toEqual([{ a: "1,2=3", b: "x,y=z" }, ""]);
  });

  test("allows trailing comma and spaces before '}'", () => {
    expect(parseAttr("{a=1,}")).toEqual([{ a: "1" }, ""]);
    expect(parseAttr("{a=1,   }")).toEqual([{ a: "1" }, ""]);
    expect(parseAttr("{ a = 1 , }rest")).toEqual([{ a: "1" }, "rest"]);
  });

  test("duplicate keys override with the latter value", () => {
    expect(parseAttr("{a=1,a=2}")).toEqual([{ a: "2" }, ""]);
    expect(parseAttr("{ a = 1 , a = 'x,y' }")).toEqual([{ a: "x,y" }, ""]);
    expect(parseAttr("{a=1,a=2,}")).toEqual([{ a: "2" }, ""]);
  });

  test("empty value becomes empty string", () => {
    expect(parseAttr("{a=,}")).toEqual([{ a: "" }, ""]);
    expect(parseAttr("{a=}")).toEqual([{ a: "" }, ""]);
    expect(parseAttr("{a=   }")).toEqual([{ a: "" }, ""]);
    expect(parseAttr("{a='', b=\"\"}")).toEqual([{ a: "", b: "" }, ""]);
  });

  test("only-key (no value) entries are accepted and produce undefined values", () => {
    expect(parseAttr("{a,b,c}")).toEqual([
      { a: undefined, b: undefined, c: undefined },
      "",
    ]);
    expect(parseAttr("{ a , b }rest")).toEqual([
      { a: undefined, b: undefined },
      "rest",
    ]);
    // trailing comma after a key
    expect(parseAttr("{a,}")).toEqual([{ a: undefined }, ""]);
  });

  test("malformed blocks return undefined", () => {
    // unterminated quotes
    expect(parseAttr("{a='unterminated}")).toBeUndefined();
    // missing comma between pairs
    expect(parseAttr("{a=1 b=2}")).toBeUndefined();
    // double equals is invalid
    expect(parseAttr("{a==1}")).toBeUndefined();
    // missing key before '=' should be rejected
    expect(parseAttr("{=1}")).toBeUndefined();
    // newline inside block is invalid
    expect(parseAttr("{a=1\n}")).toBeUndefined();
  });

  test("returns rest string after the attr block", () => {
    expect(parseAttr("{a=1} trailing")).toEqual([{ a: "1" }, " trailing"]);
    expect(parseAttr("{a='x,y', b=2}and more")).toEqual([
      { a: "x,y", b: "2" },
      "and more",
    ]);
  });

  test("accepts spaces before quoted values (value unknown -> quoted)", () => {
    // covers the branch where a space is skipped before a quote
    expect(parseAttr("{a= 'x'}")).toEqual([{ a: "x" }, ""]);
    expect(parseAttr('{b= "y"}')).toEqual([{ b: "y" }, ""]);
  });

  test("rejects extra characters immediately after closing quote", () => {
    // after closing quote, only space/comma/} are allowed; other chars should make parse fail
    expect(parseAttr("{a='x'y}")).toBeUndefined();
    expect(parseAttr('{a="x"y}')).toBeUndefined();
    // even if there's a space then other chars, it's invalid
    expect(parseAttr("{a='x' y}")).toBeUndefined();
  });
});

describe("remarkImageAttr plugin", () => {
  function run(md: string): Root {
    const processor = remark().use(remarkImageAttr);
    const tree = processor.parse(md);
    const transformed = processor.runSync(tree);
    return transformed;
  }

  function getAttr(
    node: Image | ImageReference,
  ): Record<string, string | undefined> | undefined {
    const data = node.data;
    if (data && typeof data === "object" && "attr" in data) {
      return data.attr;
    }
    return undefined;
  }

  test("attaches attrs to image and removes consumed text node", () => {
    const tree = run("![alt](url){a=1, b='x,y'}");
    // paragraph with a single image
    expect(tree.type).toBe("root");
    const para = tree.children[0] as Paragraph;
    expect(para.type).toBe("paragraph");
    expect(para.children.length).toBe(1);
    const img = para.children[0] as Image | ImageReference;
    expect(["image", "imageReference"]).toContain(img.type);
    expect(getAttr(img)).toEqual({ a: "1", b: "x,y" });
  });

  test("plugin does not attach attrs when quoted value is followed by invalid chars", () => {
    const tree = run("![alt](u){a='x'y}");
    const para = tree.children[0] as Paragraph;
    // parseAttr should fail, so image remains and text node with the brace remains
    expect(para.children.length).toBe(2);
    const img = para.children[0] as Image | ImageReference;
    expect(getAttr(img)).toBeUndefined();
    const txt = para.children[1] as Text;
    expect(txt.value.startsWith("{")).toBe(true);
  });

  test("keeps remaining text after the attr block", () => {
    const tree = run("![alt](url){a=1}trailing");
    const para = tree.children[0] as Paragraph;
    expect(para.children.length).toBe(2);
    const img = para.children[0] as Image | ImageReference;
    const txt = para.children[1] as Text;
    expect(getAttr(img)).toEqual({ a: "1" });
    expect(txt.type).toBe("text");
    expect(txt.value).toBe("trailing");
  });

  test("supports imageReference nodes", () => {
    const md = [
      "![logo][id]{width=100}",
      "",
      "[id]: https://example.com/logo.png",
    ].join("\n");
    const tree = run(md);
    const para = tree.children[0] as Paragraph;
    const node = para.children[0] as ImageReference;
    // still an imageReference at this stage (before remark-rehype etc.)
    expect(node.type).toBe("imageReference");
    expect(getAttr(node)).toEqual({ width: "100" });
  });

  test("does not attach when text does not start with '{'", () => {
    const tree = run("![alt](url) {a=1}");
    const para = tree.children[0] as Paragraph;
    const img = para.children[0] as Image | ImageReference;
    const txt = para.children[1] as Text;
    expect(getAttr(img)).toBeUndefined();
    expect(txt.type).toBe("text");
    expect(txt.value.startsWith(" ")).toBe(true);
  });

  test("handles multiple images in one paragraph", () => {
    const tree = run("![a](u){x=1}![b](v){y=2}");
    const para = tree.children[0] as Paragraph;
    expect(para.children.length).toBe(2);
    expect(getAttr(para.children[0] as Image | ImageReference)).toEqual({
      x: "1",
    });
    expect(getAttr(para.children[1] as Image | ImageReference)).toEqual({
      y: "2",
    });
  });

  test("attaches only-key attrs to image nodes (integration)", () => {
    const tree = run("![alt](u){a,b}");
    const para = tree.children[0] as Paragraph;
    expect(para.children.length).toBe(1);
    const img = para.children[0] as Image | ImageReference;
    expect(getAttr(img)).toEqual({ a: undefined, b: undefined });
  });

  test("filters out empty text nodes after consumption", () => {
    // a paragraph: image + text where text becomes empty after consuming attr
    const tree = run("![alt](u){a=1}");
    const para = tree.children[0] as Paragraph;
    // only the image node should remain (the consumed text node removed)
    expect(para.children.length).toBe(1);
    const img = para.children[0] as Image | ImageReference;
    expect(getAttr(img)).toEqual({ a: "1" });
  });
});
