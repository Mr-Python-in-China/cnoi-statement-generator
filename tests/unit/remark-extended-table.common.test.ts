import { describe, expect, test } from "vitest";
import remarkExtendedTable from "@/compiler/remarkExtendedTable";
import type { Root, Table, TableRow, TableCell } from "mdast";
import { unified } from "unified";

// Helper function to create a table cell
function createCell(text: string): TableCell {
  return {
    type: "tableCell",
    children: [{ type: "text", value: text }],
  };
}

// Helper function to create a table row
function createRow(...cells: string[]): TableRow {
  return {
    type: "tableRow",
    children: cells.map(createCell),
  };
}

// Helper function to create a table
function createTable(...rows: TableRow[]): Table {
  return {
    type: "table",
    children: rows,
  };
}

// Helper function to process a tree with the plugin
function processTree(tree: Root): Root {
  return unified().use(remarkExtendedTable).runSync(tree);
}

describe("remarkExtendedTable", () => {
  describe("Horizontal colspan (< marker)", () => {
    test("should merge two adjacent cells horizontally", () => {
      const tree: Root = {
        type: "root",
        children: [createTable(createRow("A", "<"), createRow("B", "C"))],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;
      const firstRow = table.children[0];
      const firstCell = firstRow.children[0];
      const secondCell = firstRow.children[1];

      expect(firstCell.data?.colspan).toBe(2);
      expect(secondCell.data?.removedByExtendedTable).toBe(true);
    });

    test("should merge multiple cells horizontally", () => {
      const tree: Root = {
        type: "root",
        children: [
          createTable(createRow("A", "<", "<"), createRow("B", "C", "D")),
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;
      const firstRow = table.children[0];
      const firstCell = firstRow.children[0];
      const secondCell = firstRow.children[1];
      const thirdCell = firstRow.children[2];

      expect(firstCell.data?.colspan).toBe(3);
      expect(secondCell.data?.removedByExtendedTable).toBe(true);
      expect(thirdCell.data?.removedByExtendedTable).toBe(true);
    });

    test("should handle multiple separate merges in the same row", () => {
      const tree: Root = {
        type: "root",
        children: [
          createTable(
            createRow("A", "<", "B", "<"),
            createRow("C", "D", "E", "F"),
          ),
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;
      const firstRow = table.children[0];

      expect(firstRow.children[0].data?.colspan).toBe(2);
      expect(firstRow.children[1].data?.removedByExtendedTable).toBe(true);
      expect(firstRow.children[2].data?.colspan).toBe(2);
      expect(firstRow.children[3].data?.removedByExtendedTable).toBe(true);
    });

    test("should not merge if cell content has additional characters", () => {
      const tree: Root = {
        type: "root",
        children: [createTable(createRow("A", "<<"), createRow("B", "C"))],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;
      const firstRow = table.children[0];

      expect(firstRow.children[0].data?.colspan).toBeUndefined();
      expect(firstRow.children[1].data?.removedByExtendedTable).toBeUndefined();
    });

    test("should handle '<' with whitespace correctly", () => {
      const tree: Root = {
        type: "root",
        children: [createTable(createRow("A", "  <  "), createRow("B", "C"))],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;
      const firstRow = table.children[0];
      const firstCell = firstRow.children[0];
      const secondCell = firstRow.children[1];

      expect(firstCell.data?.colspan).toBe(2);
      expect(secondCell.data?.removedByExtendedTable).toBe(true);
    });

    test("should not merge if previous cell doesn't exist", () => {
      const tree: Root = {
        type: "root",
        children: [createTable(createRow("<", "A"), createRow("B", "C"))],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;
      const firstRow = table.children[0];

      expect(firstRow.children[0].data?.colspan).toBeUndefined();
      expect(firstRow.children[0].data?.removedByExtendedTable).toBeUndefined();
    });

    test("should cumulate colspan when merging pre-merged cells", () => {
      const tree: Root = {
        type: "root",
        children: [
          createTable(
            createRow("A", "<", "<", "<"),
            createRow("B", "C", "D", "E"),
          ),
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;
      const firstRow = table.children[0];

      expect(firstRow.children[0].data?.colspan).toBe(4);
    });
  });

  describe("Vertical rowspan (^ marker)", () => {
    test("should merge two adjacent cells vertically", () => {
      const tree: Root = {
        type: "root",
        children: [createTable(createRow("A", "B"), createRow("^", "C"))],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;
      const firstRow = table.children[0];
      const secondRow = table.children[1];
      const firstCell = firstRow.children[0];
      const mergedCell = secondRow.children[0];

      expect(firstCell.data?.rowspan).toBe(2);
      expect(mergedCell.data?.removedByExtendedTable).toBe(true);
    });

    test("should merge multiple cells vertically", () => {
      const tree: Root = {
        type: "root",
        children: [
          createTable(
            createRow("A", "B"),
            createRow("^", "C"),
            createRow("^", "D"),
          ),
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;
      const firstRow = table.children[0];
      const firstCell = firstRow.children[0];

      expect(firstCell.data?.rowspan).toBe(3);
      expect(table.children[1].children[0].data?.removedByExtendedTable).toBe(
        true,
      );
      expect(table.children[2].children[0].data?.removedByExtendedTable).toBe(
        true,
      );
    });

    test("should handle multiple separate merges in the same column", () => {
      const tree: Root = {
        type: "root",
        children: [
          createTable(
            createRow("A", "B"),
            createRow("^", "C"),
            createRow("D", "E"),
            createRow("F", "^"),
          ),
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      expect(table.children[0].children[0].data?.rowspan).toBe(2);
      expect(table.children[1].children[0].data?.removedByExtendedTable).toBe(
        true,
      );
      expect(table.children[2].children[1].data?.rowspan).toBe(2);
      expect(table.children[3].children[1].data?.removedByExtendedTable).toBe(
        true,
      );
    });

    test("should not merge if cell content has additional characters", () => {
      const tree: Root = {
        type: "root",
        children: [createTable(createRow("A", "B"), createRow("^^", "C"))],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      expect(table.children[0].children[0].data?.rowspan).toBeUndefined();
      expect(
        table.children[1].children[0].data?.removedByExtendedTable,
      ).toBeUndefined();
    });

    test("should handle '^' with whitespace correctly", () => {
      const tree: Root = {
        type: "root",
        children: [createTable(createRow("A", "B"), createRow("  ^  ", "C"))],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      expect(table.children[0].children[0].data?.rowspan).toBe(2);
      expect(table.children[1].children[0].data?.removedByExtendedTable).toBe(
        true,
      );
    });

    test("should not merge if previous row doesn't exist", () => {
      const tree: Root = {
        type: "root",
        children: [createTable(createRow("^", "A"))],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      expect(table.children[0].children[0].data?.rowspan).toBeUndefined();
      expect(
        table.children[0].children[0].data?.removedByExtendedTable,
      ).toBeUndefined();
    });

    test("should not merge if previous cell is removed by horizontal merge", () => {
      const tree: Root = {
        type: "root",
        children: [
          createTable(createRow("A", "<", "C"), createRow("D", "^", "E")),
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      // First row: A merges with <
      expect(table.children[0].children[0].data?.colspan).toBe(2);
      expect(table.children[0].children[1].data?.removedByExtendedTable).toBe(
        true,
      );

      // Second row: ^ cannot merge because the cell above is removed
      expect(table.children[1].children[1].data?.rowspan).toBeUndefined();
      expect(
        table.children[1].children[1].data?.removedByExtendedTable,
      ).toBeUndefined();
    });

    test("should cumulate rowspan when merging pre-merged cells", () => {
      const tree: Root = {
        type: "root",
        children: [
          createTable(
            createRow("A", "B"),
            createRow("^", "C"),
            createRow("^", "D"),
            createRow("^", "E"),
          ),
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      expect(table.children[0].children[0].data?.rowspan).toBe(4);
    });
  });

  describe("Combined horizontal and vertical spans", () => {
    test("should handle both colspan and rowspan in the same table", () => {
      const tree: Root = {
        type: "root",
        children: [
          createTable(
            createRow("A", "<", "C"),
            createRow("^", "^", "D"),
            createRow("E", "F", "G"),
          ),
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      // First row: A merges horizontally with <
      expect(table.children[0].children[0].data?.colspan).toBe(2);
      expect(table.children[0].children[1].data?.removedByExtendedTable).toBe(
        true,
      );

      // Second row: first ^ merges vertically with A
      expect(table.children[0].children[0].data?.rowspan).toBe(2);
      expect(table.children[1].children[0].data?.removedByExtendedTable).toBe(
        true,
      );

      // Second row: second ^ cannot merge because previous cell is removed by colspan
      expect(
        table.children[1].children[1].data?.removedByExtendedTable,
      ).toBeUndefined();
    });

    test("should handle a complex table with multiple merges", () => {
      const tree: Root = {
        type: "root",
        children: [
          createTable(
            createRow("A", "<", "C", "D"),
            createRow("^", "^", "^", "^"),
            createRow("G", "H", "I", "J"),
            createRow("K", "<", "M", "N"),
          ),
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      // Row 1: A merges with < horizontally
      expect(table.children[0].children[0].data?.colspan).toBe(2);
      expect(table.children[0].children[1].data?.removedByExtendedTable).toBe(
        true,
      );

      // Row 2: first ^ merges with A vertically
      expect(table.children[0].children[0].data?.rowspan).toBe(2);
      expect(table.children[1].children[0].data?.removedByExtendedTable).toBe(
        true,
      );

      // Row 2: third and fourth ^ merge with C and D vertically
      expect(table.children[0].children[2].data?.rowspan).toBe(2);
      expect(table.children[0].children[3].data?.rowspan).toBe(2);
      expect(table.children[1].children[2].data?.removedByExtendedTable).toBe(
        true,
      );
      expect(table.children[1].children[3].data?.removedByExtendedTable).toBe(
        true,
      );

      // Row 4: K merges with < horizontally
      expect(table.children[3].children[0].data?.colspan).toBe(2);
      expect(table.children[3].children[1].data?.removedByExtendedTable).toBe(
        true,
      );
    });
  });

  describe("Edge cases", () => {
    test("should handle empty table", () => {
      const tree: Root = {
        type: "root",
        children: [
          {
            type: "table",
            children: [],
          },
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      expect(table.children.length).toBe(0);
    });

    test("should handle table with single cell", () => {
      const tree: Root = {
        type: "root",
        children: [createTable(createRow("A"))],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      expect(table.children[0].children[0].data?.colspan).toBeUndefined();
      expect(table.children[0].children[0].data?.rowspan).toBeUndefined();
    });

    test("should handle table with only merge markers", () => {
      const tree: Root = {
        type: "root",
        children: [createTable(createRow("<", "^"))],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      // Both should not merge because there's no previous cell/row
      expect(table.children[0].children[0].data?.colspan).toBeUndefined();
      expect(table.children[0].children[1].data?.rowspan).toBeUndefined();
    });

    test("should handle non-text cell children", () => {
      const tree: Root = {
        type: "root",
        children: [
          {
            type: "table",
            children: [
              {
                type: "tableRow",
                children: [
                  {
                    type: "tableCell",
                    children: [
                      {
                        type: "emphasis",
                        children: [{ type: "text", value: "A" }],
                      },
                    ],
                  },
                  createCell("<"),
                ],
              },
            ],
          },
        ],
      };

      const result = processTree(tree);
      const table = result.children[0] as Table;

      // Should merge because second cell has text "<"
      expect(table.children[0].children[0].data?.colspan).toBe(2);
      expect(table.children[0].children[1].data?.removedByExtendedTable).toBe(
        true,
      );
    });

    test("should throw error if tree type is not root", () => {
      const tree = {
        type: "paragraph",
        children: [],
      } as never;

      expect(() => processTree(tree)).toThrow(
        "Expected root node, got paragraph",
      );
    });

    test("should handle multiple tables in the same document", () => {
      const tree: Root = {
        type: "root",
        children: [
          createTable(createRow("A", "<"), createRow("B", "C")),
          createTable(createRow("D", "E"), createRow("^", "F")),
        ],
      };

      const result = processTree(tree);
      const table1 = result.children[0] as Table;
      const table2 = result.children[1] as Table;

      // Table 1
      expect(table1.children[0].children[0].data?.colspan).toBe(2);
      expect(table1.children[0].children[1].data?.removedByExtendedTable).toBe(
        true,
      );

      // Table 2
      expect(table2.children[0].children[0].data?.rowspan).toBe(2);
      expect(table2.children[1].children[0].data?.removedByExtendedTable).toBe(
        true,
      );
    });
  });
});
