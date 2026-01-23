import { describe, expect, test } from "vitest";
import compileMdast, {
  initContext,
  collectDefinitions,
  escapeTypstString,
  handlers,
  TYPST_RELATIVE_VALUE_REGEX,
} from "@/compiler/remarkTypst/compiler";
import { h64 } from "xxhashjs";

const hash = (s: string) => h64(s, 147154220).toString(16).padStart(16, "0");

describe("TYPST_RELATIVE_VALUE_REGEX", () => {
  test("should match valid relative length expressions", () => {
    const valid = [
      // single term
      "1pt",
      "+1pt",
      "-1pt",
      "1.5pt",
      ".5pt",
      "0pt",
      "  1pt  ",

      // multiple terms with different spacings
      "1pt+2mm",
      "1pt +2mm",
      "1pt+ 2mm",
      "1pt + 2mm",
      "  +.5em - .25em +1em   ",
      "1pt-2mm+3.25cm-.5in+10em-20%",
      "12cm+0.5in- .75mm + 100%",
      "  -   .5mm    +   2cm    ",
    ];

    for (const s of valid)
      expect(TYPST_RELATIVE_VALUE_REGEX.test(s)).toBeTruthy();
  });

  test("should not match invalid expressions", () => {
    const invalid = [
      "",
      " ",
      // missing unit
      "1",
      "1.5",
      ".5",
      // bad decimals
      "1.pt",
      ".pt",
      "-.pt",
      // invalid units or spaces between number and unit
      "1 px",
      "1pxs",
      "1pt + 2 px",
      "1pt + 2. mm",
      // operator issues
      "1pt +",
      "+",
      "1pt ++ 2mm",
      "1pt -+ 2mm",
      "1pt + -2mm",
      // missing unit in subsequent term
      "1pt + 2",
      // missing operator between terms
      "1% 2%",
    ];

    for (const s of invalid)
      expect(TYPST_RELATIVE_VALUE_REGEX.test(s)).toBeFalsy();
  });
});

test("Context Initialization", () => {
  const ctx = initContext();
  expect(ctx.data).toBeInstanceOf(Array);
  expect(ctx.data.length).toBe(0);
  expect(ctx.assets).toBeInstanceOf(Array);
  expect(ctx.assets.length).toBe(0);
  expect(ctx.definitionById).toBeInstanceOf(Map);
  expect(ctx.definitionById.size).toBe(0);
  expect(ctx.footnoteById).toBeInstanceOf(Map);
  expect(ctx.footnoteById.size).toBe(0);
});

test("Collect Definitions", () => {
  const ctx = initContext();
  collectDefinitions(
    {
      type: "root",
      children: [
        {
          type: "definition",
          identifier: "def1",
          url: "https://example.com/def1",
        },
        {
          type: "footnoteDefinition",
          identifier: "fn1",
          children: [],
        },
        {
          type: "text",
          value: "some text",
        },
        {
          type: "definition",
          identifier: "def2",
          url: "https://example.com/def2",
        },
        {
          type: "definition",
          identifier: "def3",
          url: "https://example.com/def3",
        },
        {
          type: "footnoteDefinition",
          identifier: "fn2",
          children: [],
        },
        {
          type: "definition",
          identifier: "def3",
          url: "https://example.com/def3-repeated",
        },
        {
          type: "footnoteDefinition",
          identifier: "fn2",
          children: [{ type: "html", value: "Repeated" }],
        },
      ],
    },
    ctx,
  );
  expect(ctx.definitionById.size).toBe(3);
  expect(ctx.footnoteById.size).toBe(2);
  for (let i = 0; i < 3; ++i) {
    const dat = ctx.definitionById.get(`def${i + 1}`)!;
    expect(dat.identifier).toBe(`def${i + 1}`);
    expect(dat.url).toBe(`https://example.com/def${i + 1}`);
  }
  for (let i = 0; i < 2; ++i) {
    const dat = ctx.footnoteById.get(`fn${i + 1}`)!;
    expect(dat.node.identifier).toBe(`fn${i + 1}`);
    expect(dat.node.children.length).toBe(0);
    expect(dat.visited).toBe(false);
  }
});

test("Escape Typst String", () => {
  expect(
    escapeTypstString(
      'This is a "test" string with \\ backslash,\nnew line,\ttab, and \rcarriage return.' +
        '"These" \\ backslash,\nnew line,\ttab, and \rcarriage appears again.',
    ),
  ).toBe(
    'This is a \\"test\\" string with \\\\ backslash,\\nnew line,\\ttab, and \\rcarriage return.' +
      '\\"These\\" \\\\ backslash,\\nnew line,\\ttab, and \\rcarriage appears again.',
  );
});

describe("Handlers", () => {
  test("Text", () => {
    const ctx = initContext();
    handlers.text({ type: "text", value: 'Hello "Typst" \\ Test\n' }, ctx);
    expect(ctx.data.join("")).toBe('#"Hello \\"Typst\\" \\\\ Test\\n"');
  });
  test("Paragraph", () => {
    const ctx = initContext();
    handlers.paragraph(
      {
        type: "paragraph",
        children: [
          { type: "text", value: "This is a paragraph with " },
          { type: "text", value: "some text." },
        ],
      },
      ctx,
    );
    expect(ctx.data.join("")).toBe(
      '#par[#"This is a paragraph with "#"some text."]\n',
    );
  });
  describe("Heading", () => {
    test.for([1, 2, 3, 4, 5, 6] as const)("Heading Level %d", (level) => {
      const ctx = initContext();
      handlers.heading(
        {
          type: "heading",
          depth: level,
          children: [
            { type: "text", value: `Heading Level ${level} ` },
            { type: "text", value: 'and some "text"' },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#heading(level: ${level}, [#"Heading Level ${level} "#"and some \\"text\\""])\n`,
      );
    });
  });
  test("Line Break", () => {
    const ctx = initContext();
    handlers.break({ type: "break" }, ctx);
    expect(ctx.data.join("")).toBe(`#"\\n"`);
  });
  test("Emphasis", () => {
    const ctx = initContext();
    handlers.emphasis(
      {
        type: "emphasis",
        children: [
          { type: "text", value: "emphasized text" },
          { type: "text", value: "maybe with \\ special chars" },
        ],
      },
      ctx,
    );
    expect(ctx.data.join("")).toBe(
      '#emph[#"emphasized text"#"maybe with \\\\ special chars"]',
    );
  });
  test("Strong", () => {
    const ctx = initContext();
    handlers.strong(
      {
        type: "strong",
        children: [
          { type: "text", value: "strong text" },
          { type: "text", value: "maybe with \\ special chars" },
        ],
      },
      ctx,
    );
    expect(ctx.data.join("")).toBe(
      '#strong[#"strong text"#"maybe with \\\\ special chars"]',
    );
  });
  test("Delete", () => {
    const ctx = initContext();
    handlers.delete(
      {
        type: "delete",
        children: [
          { type: "text", value: "deleted text" },
          { type: "text", value: "maybe with \\ special chars" },
        ],
      },
      ctx,
    );
    expect(ctx.data.join("")).toBe(
      '#strike[#"deleted text"#"maybe with \\\\ special chars"]',
    );
  });
  test("Block Quote", () => {
    const ctx = initContext();
    handlers.blockquote(
      {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: "Quote Paragraph 1" }],
          },
          {
            type: "paragraph",
            children: [{ type: "text", value: "Quote Paragraph 2" }],
          },
          {
            type: "blockquote",
            children: [
              {
                type: "paragraph",
                children: [
                  {
                    type: "text",
                    value: "Quote in Qoute",
                  },
                ],
              },
            ],
          },
        ],
      },
      ctx,
    );
    expect(ctx.data.join("")).toBe(
      `#quote(block: true)[
#par[#"Quote Paragraph 1"]
#par[#"Quote Paragraph 2"]
#quote(block: true)[
#par[#"Quote in Qoute"]
]
]
`,
    );
  });
  describe("Block Code", () => {
    test("Common Code Block", () => {
      const ctx = initContext();
      handlers.code(
        {
          type: "code",
          lang: "javascript",
          value: 'const x = 1, y = 2;\nconsole.log("Hello, Typst!", x + y);\n',
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        '#raw(block: true, lang: "javascript", "const x = 1, y = 2;\\nconsole.log(\\"Hello, Typst!\\", x + y);\\n")\n',
      );
    });
    test('"Plain" Language is TXT', () => {
      const ctx = initContext();
      handlers.code(
        {
          type: "code",
          lang: "plain",
          value: "This is plain text code block.\nLine 2 of the code.\n",
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        '#raw(block: true, lang: "txt", "This is plain text code block.\\nLine 2 of the code.\\n")\n',
      );
    });
    test("No Language is TXT", () => {
      const ctx = initContext();
      handlers.code(
        {
          type: "code",
          value: "This is code block without language.\nAnother line.\n",
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        '#raw(block: true, lang: "txt", "This is code block without language.\\nAnother line.\\n")\n',
      );
    });
    test("Markdown Language is MD", () => {
      const ctx = initContext();
      handlers.code(
        {
          type: "code",
          lang: "markdown",
          value: "# This is a markdown code block\nSome *emphasis* here.\n",
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        '#raw(block: true, lang: "md", "# This is a markdown code block\\nSome *emphasis* here.\\n")\n',
      );
    });
  });
  test("Inline Code", () => {
    const ctx = initContext();
    handlers.inlineCode(
      {
        type: "inlineCode",
        value: 'inline code with "quotes" and \\ backslash',
      },
      ctx,
    );
    expect(ctx.data.join("")).toBe(
      '#raw(block: false, lang: "txt", "inline code with \\"quotes\\" and \\\\ backslash")',
    );
  });
  describe("List", () => {
    test("Unordered List", () => {
      const ctx = initContext();
      handlers.list(
        {
          type: "list",
          ordered: false,
          children: [
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 2" }],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#list(
[#"Item 1"],
[#"Item 2"],
)
`,
      );
    });
    test("Ordered List", () => {
      const ctx = initContext();
      handlers.list(
        {
          type: "list",
          ordered: true,
          children: [
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 2" }],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#enum(
[#"Item 1"],
[#"Item 2"],
)
`,
      );
    });
    test("Ordered List with start value", () => {
      const ctx = initContext();
      handlers.list(
        {
          type: "list",
          ordered: true,
          start: 5,
          children: [
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 2" }],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#enum(start: 5,
[#"Item 1"],
[#"Item 2"],
)
`,
      );
    });
    test("List in List", () => {
      const ctx = initContext();
      handlers.list(
        {
          type: "list",
          ordered: false,
          children: [
            {
              type: "listItem",
              children: [
                {
                  type: "list",
                  ordered: true,
                  children: [
                    {
                      type: "listItem",
                      children: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", value: "A.1" }],
                        },
                      ],
                    },
                    {
                      type: "listItem",
                      children: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", value: "A.2" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              children: [
                {
                  type: "list",
                  ordered: false,
                  children: [
                    {
                      type: "listItem",
                      children: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", value: "B.a" }],
                        },
                      ],
                    },
                    {
                      type: "listItem",
                      children: [
                        {
                          type: "paragraph",
                          children: [{ type: "text", value: "B.b" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#list(
[#enum(
[#"A.1"],
[#"A.2"],
)
],
[#list(
[#"B.a"],
[#"B.b"],
)
],
)
`,
      );
    });
    test("Spread List", () => {
      const ctx = initContext();
      handlers.list(
        {
          type: "list",
          ordered: true,
          spread: true,
          children: [
            {
              type: "listItem",
              spread: false,
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              spread: false,
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 2" }],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#enum(
[#"Item 1"],
[#"Item 2"],
)
`,
      );
    });
    test("Spread List Item", () => {
      const ctx = initContext();
      handlers.list(
        {
          type: "list",
          ordered: true,
          spread: false,
          children: [
            {
              type: "listItem",
              spread: false,
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              spread: true,
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 2" }],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#enum(
[#"Item 1"],
[#"Item 2"],
)
`,
      );
    });
    test("List Item with Multiple Children", () => {
      const ctx = initContext();
      handlers.list(
        {
          type: "list",
          ordered: true,
          children: [
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 1.1" }],
                },
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 1.2" }],
                },
              ],
            },
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 2" }],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#enum(
[#"Item 1.1"#"Item 1.2"],
[#"Item 2"],
)
`,
      );
    });
    test("Unspread List Item with Multiple Children", () => {
      const ctx = initContext();
      handlers.list(
        {
          type: "list",
          ordered: true,
          children: [
            {
              type: "listItem",
              spread: false,
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 1.1" }],
                },
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 1.2" }],
                },
              ],
            },
            {
              type: "listItem",
              children: [
                {
                  type: "paragraph",
                  children: [{ type: "text", value: "Item 2" }],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#enum(
[#"Item 1.1"#"Item 1.2"],
[#"Item 2"],
)
`,
      );
    });
  });
  test("Link", () => {
    const ctx = initContext();
    handlers.link(
      {
        type: "link",
        url: "https://example.com",
        children: [
          { type: "text", value: "Example Link" },
          { type: "text", value: " with \\ special chars" },
        ],
      },
      ctx,
    );
    expect(ctx.data.join("")).toBe(
      '#link("https://example.com", [#"Example Link"#" with \\\\ special chars"])',
    );
  });
  test("Block Math", () => {
    const ctx = initContext();
    handlers.math(
      {
        type: "math",
        value: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}",
      },
      ctx,
    );
    expect(ctx.data.join("")).toBe(
      '#mi(block: true, "\\\\sum_{i=1}^{n} i = \\\\frac{n(n+1)}{2}")\n',
    );
  });
  test("Inline Math", () => {
    const ctx = initContext();
    handlers.inlineMath(
      {
        type: "inlineMath",
        value: "p_s = \\{s_{1:i} | 0 \\leq i \\leq \\left|s\right| \\}",
      },
      ctx,
    );
    expect(ctx.data.join("")).toBe(
      '#mi(block: false, "p_s = \\\\{s_{1:i} | 0 \\\\leq i \\\\leq \\\\left|s\\right| \\\\}")',
    );
  });
  describe("Table", () => {
    test("Structure", () => {
      const ctx = initContext();
      handlers.table(
        {
          type: "table",
          align: ["left", "center", "right", null],
          children: [
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Header 1" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Header 2" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Header 3" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Header 4" }],
                },
              ],
            },
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 1,1" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 1,2" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 1,3" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 1,4" }],
                },
              ],
            },
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 2,1" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 2,2" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 2,3" }],
                }, // 2,4 should be empty cell
              ],
            },
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 3,1" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 3,2" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 3,3" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 3,4" }],
                },
                {
                  // Should be removed as extra cell
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 3,5" }],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#figure(table(columns: 4, align: (left + horizon, center + horizon, right + horizon, center + horizon, ),
table.cell()[#"Header 1"], table.cell()[#"Header 2"], table.cell()[#"Header 3"], table.cell()[#"Header 4"], 
table.cell()[#"Body 1,1"], table.cell()[#"Body 1,2"], table.cell()[#"Body 1,3"], table.cell()[#"Body 1,4"], 
table.cell()[#"Body 2,1"], table.cell()[#"Body 2,2"], table.cell()[#"Body 2,3"], table.cell()[], 
table.cell()[#"Body 3,1"], table.cell()[#"Body 3,2"], table.cell()[#"Body 3,3"], table.cell()[#"Body 3,4"], 
))
`,
      );
    });
    test("Columns decided by align.lenth", () => {
      const ctx = initContext();
      handlers.table(
        {
          type: "table",
          align: ["left", "right"],
          children: [
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Header 1" }],
                },
              ],
            },
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 1,1" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 1,2" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 1,3" }],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#figure(table(columns: 2, align: (left + horizon, right + horizon, ),
table.cell()[#"Header 1"], table.cell()[], 
table.cell()[#"Body 1,1"], table.cell()[#"Body 1,2"], 
))
`,
      );
    });
    test("Columns decided by header row when align is undefined", () => {
      const ctx = initContext();
      handlers.table(
        {
          type: "table",
          // align is undefined
          children: [
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Header 1" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Header 2" }],
                },
              ],
            },
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 1,1" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 1,2" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "Body 1,3" }],
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#figure(table(columns: 2, align: (center + horizon, center + horizon, ),
table.cell()[#"Header 1"], table.cell()[#"Header 2"], 
table.cell()[#"Body 1,1"], table.cell()[#"Body 1,2"], 
))
`,
      );
    });
    test("Empty Table", () => {
      const ctx = initContext();
      handlers.table(
        {
          type: "table",
          children: [],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe("");
    });
    test("Unknown Alignment Error", () => {
      const ctx = initContext();
      expect(() =>
        handlers.table(
          {
            type: "table",
            align: ["left", "unknownString" as never, "right"],
            children: [
              {
                type: "tableRow",
                children: [
                  {
                    type: "tableCell",
                    children: [{ type: "text", value: "Header 1" }],
                  },
                  {
                    type: "tableCell",
                    children: [{ type: "text", value: "Header 2" }],
                  },
                  {
                    type: "tableCell",
                    children: [{ type: "text", value: "Header 3" }],
                  },
                ],
              },
            ],
          },
          ctx,
        ),
      ).toThrowError("Unknown table alignment: unknownString");
    });
    test("Cell with colspan merges horizontally", () => {
      const ctx = initContext();
      handlers.table(
        {
          type: "table",
          align: ["center", "center", "center"],
          children: [
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "H1" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "H2" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "H3" }],
                },
              ],
            },
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  data: { colspan: 2 },
                  children: [{ type: "text", value: "A" }],
                },
                {
                  type: "tableCell",
                  data: { removedByExtendedTable: true },
                  children: [{ type: "text", value: "should be removed" }],
                },
                { type: "tableCell", children: [{ type: "text", value: "B" }] },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#figure(table(columns: 3, align: (center + horizon, center + horizon, center + horizon, ),
table.cell()[#"H1"], table.cell()[#"H2"], table.cell()[#"H3"], 
table.cell(colspan: 2, )[#"A"], table.cell()[#"B"], 
))
`,
      );
    });
    test("Cell with rowspan merges vertically", () => {
      const ctx = initContext();
      handlers.table(
        {
          type: "table",
          align: ["left", "right"],
          children: [
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "H1" }],
                },
                {
                  type: "tableCell",
                  children: [{ type: "text", value: "H2" }],
                },
              ],
            },
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  data: { rowspan: 2 },
                  children: [{ type: "text", value: "X" }],
                },
                { type: "tableCell", children: [{ type: "text", value: "Y" }] },
              ],
            },
            {
              type: "tableRow",
              children: [
                {
                  type: "tableCell",
                  data: { removedByExtendedTable: true },
                  children: [],
                },
                { type: "tableCell", children: [{ type: "text", value: "Z" }] },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        `#figure(table(columns: 2, align: (left + horizon, right + horizon, ),
table.cell()[#"H1"], table.cell()[#"H2"], 
table.cell(rowspan: 2, )[#"X"], table.cell()[#"Y"], 
table.cell()[#"Z"], 
))
`,
      );
    });
    test("Row Handler Error", () => {
      expect(() => handlers.tableRow()).toThrowError(
        "tableRow nodes should be handled in table nodes",
      );
    });
  });
  describe("Thematic Break", () => {
    test("Thematic Break Handler", () => {
      const ctx = initContext();
      handlers.thematicBreak({ type: "thematicBreak" }, ctx);
      expect(ctx.data.join("")).toBe("#thematic-break\n");
    });
  });
  describe("Image", () => {
    test("Image with alt text", () => {
      const ctx = initContext();
      handlers.image(
        {
          type: "image",
          url: "https://example.com/image.png",
          alt: "Example\\Image",
        },
        ctx,
      );
      const result = ctx.data.join("");
      const imageId = result.match(
        /^#box\(image\("(img-[0-9a-f]{16})", alt: "Example\\\\Image"\)\)$/,
      )?.[1];
      expect(imageId).toBe("img-" + hash("https://example.com/image.png"));
      expect(ctx.assets.length).toBe(1);
      expect(ctx.assets[0]).toEqual({
        assetUrl: "https://example.com/image.png",
        filename: imageId!,
      });
    });
    test("Image without alt text", () => {
      const ctx = initContext();
      handlers.image(
        {
          type: "image",
          url: "https://example.com/image.png",
        },
        ctx,
      );
      const result = ctx.data.join("");
      const imageId = result.match(
        /^#box\(image\("(img-[0-9a-f]{16})"\)\)$/,
      )?.[1];
      expect(imageId).toBe("img-" + hash("https://example.com/image.png"));
      expect(ctx.assets.length).toBe(1);
      expect(ctx.assets[0]).toEqual({
        assetUrl: "https://example.com/image.png",
        filename: imageId!,
      });
    });
    describe("Image with width and height", () => {
      for (const width of ["100pt", "50%", "5em", undefined])
        for (const height of ["200pt", "75%", "10em", undefined])
          test(`width: ${width ?? "undefined"}, height: ${
            height ?? "undefined"
          }`, () => {
            const ctx = initContext();
            handlers.image(
              {
                type: "image",
                url: "https://example.com/image.png",
                alt: "test",
                data: {
                  attr: {
                    width,
                    height,
                  },
                },
              },
              ctx,
            );
            const result = ctx.data.join("");
            expect(result.startsWith('#box(image("img-')).toBeTruthy();
            expect(
              result.endsWith(
                '"' +
                  (width ? `, width: ${width}` : "") +
                  (height ? `, height: ${height}` : "") +
                  ', alt: "test"))',
              ),
            ).toBeTruthy();
          });
    });
  });
  describe("Link Reference", () => {
    describe("Defined Reference", () => {
      test.for(["full", "collapsed", "shortcut"])(
        `Reference Type: %s`,
        (referenceType) => {
          const ctx = initContext();
          ctx.definitionById.set("ref1 \\", {
            type: "definition",
            identifier: "ref1 \\",
            url: "https://example.com/ref1",
          });
          ctx.definitionById.set("ref2 \\", {
            type: "definition",
            identifier: "ref2 \\",
            url: "https://example.com/ref2",
          });
          handlers.linkReference(
            {
              type: "linkReference",
              identifier: "ref1 \\",
              referenceType: referenceType as never,
              children: [{ type: "text", value: "Link Ref Text \\" }],
            },
            ctx,
          );
          expect(ctx.data.join("")).toBe(
            '#link("https://example.com/ref1", [#"Link Ref Text \\\\"])',
          );
        },
      );
    });
    describe("Undefined Reference", () => {
      test.for(["full", "collapsed", "shortcut"])(
        `Reference Type: %s`,
        (referenceType) => {
          const ctx = initContext();
          handlers.linkReference(
            {
              type: "linkReference",
              identifier: "undefined-ref \\",
              referenceType: referenceType as never,
              children: [{ type: "text", value: "Undefined Link Ref \\" }],
            },
            ctx,
          );
          expect(ctx.data.join("")).toBe(
            '#"["#"Undefined Link Ref \\\\"#"]' +
              (referenceType === "collapsed"
                ? "[]"
                : referenceType === "full"
                  ? "[undefined-ref \\\\]"
                  : "") +
              '"',
          );
        },
      );
    });
  });
  describe("Image Reference", () => {
    describe("Defined Reference", () => {
      test.for(["full", "collapsed", "shortcut"] as const)(
        `Reference Type: %s`,
        (referenceType) => {
          const ctx = initContext();
          ctx.definitionById.set("ref1 \\", {
            type: "definition",
            identifier: "ref1 \\",
            url: "https://example.com/ref1.png",
          });
          ctx.definitionById.set("ref2 \\", {
            type: "definition",
            identifier: "ref2 \\",
            url: "https://example.com/ref2.jpg",
          });
          handlers.imageReference(
            {
              type: "imageReference",
              identifier: "ref1 \\",
              referenceType: referenceType,
              alt: "img \\",
            },
            ctx,
          );
          const result = ctx.data.join("");
          const imageId = result.match(
            /^#box\(image\("(img-[0-9a-f]{16})", alt: "img \\\\"\)\)$/,
          )?.[1];
          expect(imageId).toBe("img-" + hash("https://example.com/ref1.png"));
          expect(ctx.assets.length).toBe(1);
          expect(ctx.assets[0]).toEqual({
            assetUrl: "https://example.com/ref1.png",
            filename: imageId!,
          });
        },
      );
    });
    describe("Defined Reference without alt", () => {
      test.for(["full", "collapsed", "shortcut"] as const)(
        `Reference Type: %s`,
        (referenceType) => {
          const ctx = initContext();
          ctx.definitionById.set("ref1 \\", {
            type: "definition",
            identifier: "ref1 \\",
            url: "https://example.com/ref1.png",
          });
          ctx.definitionById.set("ref2 \\", {
            type: "definition",
            identifier: "ref2 \\",
            url: "https://example.com/ref2.jpg",
          });
          handlers.imageReference(
            {
              type: "imageReference",
              identifier: "ref1 \\",
              referenceType: referenceType,
            },
            ctx,
          );
          const result = ctx.data.join("");
          const imageId = result.match(
            /^#box\(image\("(img-[0-9a-f]{16})"\)\)$/,
          )?.[1];
          expect(imageId).toBe("img-" + hash("https://example.com/ref1.png"));
          expect(ctx.assets.length).toBe(1);
          expect(ctx.assets[0]).toEqual({
            assetUrl: "https://example.com/ref1.png",
            filename: imageId!,
          });
        },
      );
    });
    describe("Undefined Reference", () => {
      test.for(["full", "collapsed", "shortcut"] as const)(
        `Reference Type: %s`,
        (referenceType) => {
          const ctx = initContext();
          handlers.imageReference(
            {
              type: "imageReference",
              identifier: "undefined-ref \\",
              referenceType: referenceType,
              alt: "img \\",
            },
            ctx,
          );
          expect(ctx.data.join("")).toBe(
            '#"!["#"img \\\\"#"]' +
              (referenceType === "collapsed"
                ? "[]"
                : referenceType === "full"
                  ? "[undefined-ref \\\\]"
                  : "") +
              '"',
          );
        },
      );
    });
    describe("Undefined Reference with no alt", () => {
      test.for(["full", "collapsed", "shortcut"] as const)(
        `Reference Type: %s`,
        (referenceType) => {
          const ctx = initContext();
          handlers.imageReference(
            {
              type: "imageReference",
              identifier: "undefined-ref \\",
              referenceType: referenceType,
            },
            ctx,
          );
          expect(ctx.data.join("")).toBe(
            '#"!["#""#"]' +
              (referenceType === "collapsed"
                ? "[]"
                : referenceType === "full"
                  ? "[undefined-ref \\\\]"
                  : "") +
              '"',
          );
        },
      );
    });
    describe("Image Reference with width and height", () => {
      for (const width of ["100pt", "50%", "5em", undefined])
        for (const height of ["200pt", "75%", "10em", undefined])
          test(`width: ${width ?? "undefined"}, height: ${height ?? "undefined"}`, () => {
            const ctx = initContext();
            ctx.definitionById.set("ref1", {
              type: "definition",
              identifier: "ref1",
              url: "https://example.com/ref1.png",
            });
            handlers.imageReference(
              {
                type: "imageReference",
                identifier: "ref1",
                referenceType: "full",
                alt: "test",
                data: {
                  attr: {
                    width,
                    height,
                  },
                },
              },
              ctx,
            );
            const result = ctx.data.join("");
            expect(result.startsWith('#box(image("img-')).toBeTruthy();
            expect(
              result.endsWith(
                '"' +
                  (width ? `, width: ${width}` : "") +
                  (height ? `, height: ${height}` : "") +
                  ', alt: "test"))',
              ),
            ).toBeTruthy();
          });
    });
  });
  describe("Footnote Reference", () => {
    test("Defined Footnote", () => {
      const ctx = initContext();
      ctx.footnoteById.set("fn1 \\", {
        node: {
          type: "footnoteDefinition",
          identifier: "fn1 \\",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", value: "Footnote 1 text" }],
            },
          ],
        },
        visited: false,
      });
      ctx.footnoteById.set("fn2 \\", {
        node: {
          type: "footnoteDefinition",
          identifier: "fn2 \\",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", value: "Footnote 2 text" }],
            },
          ],
        },
        visited: false,
      });
      handlers.footnoteReference(
        {
          type: "footnoteReference",
          identifier: "fn1 \\",
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(
        '#footnote(label("user-footnote: fn1 \\\\"))',
      );
      expect(ctx.footnoteById.get("fn1 \\")!.visited).toBe(true);
      expect(ctx.footnoteById.get("fn2 \\")!.visited).toBe(false);
    });
    test("Undefined Footnote", () => {
      const ctx = initContext();
      handlers.footnoteReference(
        {
          type: "footnoteReference",
          identifier: "undefined-fn \\",
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe('#"[^undefined-fn \\\\]"');
    });
  });
  test("HTML", () => {
    const ctx = initContext();
    handlers.html({ type: "html", value: "<div>Some HTML</div>" }, ctx);
    expect(ctx.data.join("")).toBe(
      '#raw(block: false, lang: "html", "<div>Some HTML</div>")',
    );
  });
  test("Definition, Footnote Definition, YAML", () => {
    const ctx = initContext();
    handlers.definition();
    handlers.footnoteDefinition();
    handlers.yaml();
    // nothing should be happened
    expect(ctx.data.length).toBe(0);
    expect(ctx.assets.length).toBe(0);
    expect(ctx.definitionById.size).toBe(0);
    expect(ctx.footnoteById.size).toBe(0);
  });
  describe("Figure", () => {
    test("Figure without caption", () => {
      const ctx = initContext();
      handlers.containerDirective(
        {
          type: "containerDirective",
          name: "figure",
          children: [
            {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  value: "This is a figure caption.",
                },
              ],
            },
            {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  value: "This is figure content.",
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(`#figure()[
#par[#"This is a figure caption."]
#par[#"This is figure content."]
]
`);
    });
    test("Figure with caption", () => {
      const ctx = initContext();
      handlers.containerDirective(
        {
          type: "containerDirective",
          name: "figure",
          children: [
            {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  value: "This is a figure caption.",
                },
              ],
            },
            {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  value: "This is figure content.",
                },
              ],
            },
          ],
          attributes: {
            caption: "Figure Caption Attribute",
          },
        },
        ctx,
      );
      expect(ctx.data.join(""))
        .toBe(`#figure(caption: "Figure Caption Attribute", )[
#par[#"This is a figure caption."]
#par[#"This is figure content."]
]
`);
    });
  });
  describe("unknown directive node", () => {
    test("unknown container directive", () => {
      const ctx = initContext();
      handlers.containerDirective(
        {
          type: "containerDirective",
          name: "unknown",
          children: [
            {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  value: "Some content",
                },
              ],
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(`#par[#"Some content"]
`);
    });
    test("unknown leaf directive", () => {
      const ctx = initContext();
      handlers.leafDirective(
        {
          type: "leafDirective",
          name: "unknownLeaf",
          children: [
            {
              type: "text",
              value: "Leaf content",
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(`#"Leaf content"`);
    });
    test("unknown text directive", () => {
      const ctx = initContext();
      handlers.textDirective(
        {
          type: "textDirective",
          name: "unknownText",
          children: [
            {
              type: "text",
              value: "Text content",
            },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe(`#"Text content"`);
    });
  });

  describe("Typst nodes", () => {
    test("Typst renders its children without wrappers", () => {
      const ctx = initContext();
      handlers.typst(
        {
          type: "typst",
          children: [
            { type: "text", value: "Before " },
            { type: "typstContent", data: "#strong[inner]" },
            { type: "text", value: " After" },
          ],
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe('#"Before "#strong[inner]#" After"');
    });

    test("TypstContent injects raw typst code", () => {
      const ctx = initContext();
      handlers.typstContent(
        {
          type: "typstContent",
          data: '#rect(fill: rgb("12,34,56"))',
        },
        ctx,
      );
      expect(ctx.data.join("")).toBe('#rect(fill: rgb("12,34,56"))');
    });
  });
});

test("Compiler Integration Test", () => {
  const [text, assets] = compileMdast({
    type: "root",
    children: [
      {
        type: "heading",
        depth: 1,
        children: [
          {
            type: "text",
            value: "Remark-typst",
          },
          {
            type: "footnoteReference",
            identifier: "fn1",
          },
          {
            type: "text",
            value: " Integration Test",
          },
          {
            type: "footnoteReference",
            identifier: "fn2",
          },
          { type: "text", value: " Document" },
        ],
      },
      {
        type: "paragraph",
        children: [
          {
            type: "imageReference",
            identifier: "img1",
            alt: "Undefined Image Reference",
            referenceType: "full",
          },
        ],
      },
      {
        type: "paragraph",
        children: [
          {
            type: "imageReference",
            identifier: "img2",
            alt: "Defined Image Reference",
            referenceType: "full",
          },
        ],
      },
      {
        type: "paragraph",
        children: [
          {
            type: "linkReference",
            identifier: "link1",
            referenceType: "full",
            children: [
              {
                type: "text",
                value: "Undefined Link Reference",
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        children: [
          {
            type: "linkReference",
            identifier: "link2",
            referenceType: "full",
            children: [
              {
                type: "text",
                value: "Defined Link Reference",
              },
            ],
          },
        ],
      },
      {
        type: "footnoteDefinition",
        identifier: "fn2",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "Test with ",
              },
              {
                type: "link",
                url: "https://vitest.dev/",
                children: [
                  {
                    type: "text",
                    value: "Vitest",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "footnoteDefinition",
        identifier: "fn3",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "An unused footnote definition.",
              },
            ],
          },
        ],
      },
      {
        type: "definition",
        identifier: "img2",
        url: "https://example.com/img2.png",
      },
      {
        type: "definition",
        identifier: "img3",
        url: "https://example.com/img3.jpg",
      },
      {
        type: "definition",
        identifier: "link2",
        url: "https://example.com/link2",
      },
      {
        type: "definition",
        identifier: "link3",
        url: "https://example.com/link3",
      },
    ],
  });
  const templateStr = String.raw`#heading(level: 1, [#"Remark-typst"#"[^fn1]"#" Integration Test"#footnote(label("user-footnote: fn2"))#" Document"])
#par[#"!["#"Undefined Image Reference"#"][img1]"]
#par[#box(image("{{hash}}", alt: "Defined Image Reference"))]
#par[#"["#"Undefined Link Reference"#"][link1]"]
#par[#link("https://example.com/link2", [#"Defined Link Reference"])]

#hide(place(top+left, [
#footnote[
#par[#"Test with "#link("https://vitest.dev/", [#"Vitest"])]
]#label("user-footnote: fn2")
]))
`;
  const reg = new RegExp(
    "^" +
      templateStr
        .split("{{hash}}")
        .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("(img-[0-9a-f]{16})") +
      "$",
  );
  const id = text.match(reg)?.[1];
  expect(id).toBe("img-" + hash("https://example.com/img2.png"));
  expect(assets.length).toBe(1);
  expect(assets[0]).toEqual({
    assetUrl: "https://example.com/img2.png",
    filename: id,
  });
});
