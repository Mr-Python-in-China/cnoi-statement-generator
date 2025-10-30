import type ContestData from "@/types/contestData";

const exampleFiles = import.meta.glob<true, "raw">(
  ["./*/data.json", "./*/precaution.md", "./*/problem-*.md"],
  {
    base: "/examples",
    eager: true,
    query: "?raw",
    import: "default",
  },
);

const exampleStatements: Record<
  string,
  ContestData<{ withMarkdown: true }>
> = {};

for (const [path, content] of Object.entries(exampleFiles)) {
  const name = path.match(/^\.\/(.*)\/data.json$/)?.[1];
  if (!name) continue;
  exampleStatements[name] = JSON.parse(content);
  exampleStatements[name].precautionMarkdown =
    exampleFiles[`./${name}/precaution.md`];
  exampleStatements[name].problems.forEach((x, i) => {
    x.statementMarkdown = exampleFiles[`./${name}/problem-${i}.md`];
  });
}

export default exampleStatements;
