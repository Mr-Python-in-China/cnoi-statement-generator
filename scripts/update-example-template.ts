import type { ContentBase } from "@/types/document";
import type ExampleMetaExport from "@/types/examples";
import type TemplateExport from "@/types/templates";
import fsp from "node:fs/promises";

for (const exampleName of await fsp.readdir("examples")) {
  console.log(`Updating example template: ${exampleName}`);
  for (const file of await fsp.readdir(`examples/${exampleName}`))
    if (!/^(?:content\.json|problem-.*\.md|extra-.*\.md|.*\.tsx?)$/.test(file))
      await fsp.rm(`examples/${exampleName}/${file}`);
  const meta = (await import(`examples/${exampleName}/meta.ts`).catch(() =>
    import(`examples/${exampleName}/meta.tsx`).then((m) => m.default),
  )) as ExampleMetaExport;
  const templates = await import(`templates/${meta.template}`)
    .then((m) => m.default)
    .then((m: TemplateExport<ContentBase>) => m.typst());
  for (const [name, content] of Object.entries(templates))
    await fsp.writeFile(`examples/${exampleName}/${name}`, content, "utf-8");
}
