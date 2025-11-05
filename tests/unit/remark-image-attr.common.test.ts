import { describe, expect, test } from "vitest";
import { parseAttr } from "@/compiler/remarkImageAttr";

describe("parseAttr", () => {
  test("must start with '{' at the first character", () => {
    expect(parseAttr("{a=1}" as string)).toEqual([{ a: "1" }, ""]);
    expect(parseAttr(" {a=1}" as string)).toBeUndefined();
    expect(parseAttr("x{a=1}" as string)).toBeUndefined();
  });

  test("supports key=value with commas and spaces around tokens", () => {
    expect(parseAttr("{ a = 1 }" as string)).toEqual([{ a: "1" }, ""]);
    expect(parseAttr("{a=1 , b=2}" as string)).toEqual([
      { a: "1", b: "2" },
      "",
    ]);
    expect(parseAttr("{  a = 1  ,  b = 2  }" as string)).toEqual([
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
    expect(parseAttr("{a=1,}" as string)).toEqual([{ a: "1" }, ""]);
    expect(parseAttr("{a=1,   }" as string)).toEqual([{ a: "1" }, ""]);
    expect(parseAttr("{ a = 1 , }rest" as string)).toEqual([
      { a: "1" },
      "rest",
    ]);
  });

  test("duplicate keys override with the latter value", () => {
    expect(parseAttr("{a=1,a=2}" as string)).toEqual([{ a: "2" }, ""]);
    expect(parseAttr("{ a = 1 , a = 'x,y' }" as string)).toEqual([
      { a: "x,y" },
      "",
    ]);
    expect(parseAttr("{a=1,a=2,}" as string)).toEqual([{ a: "2" }, ""]);
  });

  test("empty value becomes empty string", () => {
    expect(parseAttr("{a=,}" as string)).toEqual([{ a: "" }, ""]);
    expect(parseAttr("{a=}" as string)).toEqual([{ a: "" }, ""]);
    expect(parseAttr("{a=   }" as string)).toEqual([{ a: "" }, ""]);
    expect(parseAttr("{a='', b=\"\"}" as string)).toEqual([
      { a: "", b: "" },
      "",
    ]);
  });

  test("malformed blocks return undefined", () => {
    // unterminated quotes
    expect(parseAttr("{a='unterminated}" as string)).toBeUndefined();
    // missing comma between pairs
    expect(parseAttr("{a=1 b=2}" as string)).toBeUndefined();
    // double equals is invalid
    expect(parseAttr("{a==1}" as string)).toBeUndefined();
    // newline inside block is invalid
    expect(parseAttr("{a=1\n}" as string)).toBeUndefined();
  });

  test("returns rest string after the attr block", () => {
    expect(parseAttr("{a=1} trailing" as string)).toEqual([
      { a: "1" },
      " trailing",
    ]);
    expect(parseAttr("{a='x,y', b=2}and more" as string)).toEqual([
      { a: "x,y", b: "2" },
      "and more",
    ]);
  });
});
