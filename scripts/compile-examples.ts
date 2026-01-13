import fsp from "node:fs/promises";
import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";
import {
  importContentZod,
  importFontUrlEnteries,
  importUnifiedPlugins,
} from "@/utils/importTemplate";
import type ExampleMetaExport from "@/types/examples";
import getProcessor from "@/compiler/getProcessor";
import { resolve } from "node:path";
import { pdf } from "pdf-to-img";
import sharp from "sharp";

for (const exampleName of await fsp.readdir("examples")) {
  console.log(`Compiling example: ${exampleName}`);
  const meta = (await import(`examples/${exampleName}/meta.ts`).then(
    (m) => m.default,
  )) as ExampleMetaExport;
  const processor = getProcessor(await importUnifiedPlugins(meta.template));
  const contentZod = await importContentZod(meta.template);
  const contentRaw = (await import(`examples/${exampleName}/content.json`))
    .default;
  if (
    !(contentRaw instanceof Object) ||
    !Array.isArray(contentRaw.problems) ||
    !(contentRaw.extraContents instanceof Object)
  )
    throw new Error(`Invalid content: examples/${exampleName}/content.json`);
  for (let i = 0; i < contentRaw.problems.length; ++i) {
    const md = await fsp.readFile(
      `examples/${exampleName}/problem-${i}.md`,
      "utf-8",
    );
    contentRaw.problems[i].markdown = md; // for validation
    const typ = processor.processSync(md).toString();
    await fsp.writeFile(
      `examples/${exampleName}/problem-${i}.typ`,
      typ,
      "utf-8",
    );
  }
  for (const i of Object.keys(contentRaw.extraContents)) {
    const md = await fsp.readFile(
      `examples/${exampleName}/extra-${i}.md`,
      "utf-8",
    );
    contentRaw.extraContents[i].markdown = md; // for validation
    const typ = processor.processSync(md).toString();
    await fsp.writeFile(`examples/${exampleName}/extra-${i}.typ`, typ, "utf-8");
  }
  contentZod.parse(contentRaw); // Just for validationd

  const compiler = NodeCompiler.create({
    workspace: `examples/${exampleName}`,
    fontArgs: [
      {
        fontPaths: (await importFontUrlEnteries(meta.template)).map(([, url]) =>
          resolve(
            url.slice(1), // path start with '/' means root of workspace in vite
          ),
        ),
      },
    ],
  });
  const pdfBuffer = compiler.pdf({
    mainFilePath: resolve(`examples/${exampleName}/main.typ`),
  });
  await fsp.writeFile(`examples/${exampleName}/output.pdf`, pdfBuffer);
  const pngBuffer = await (await pdf(pdfBuffer)).getPage(1);
  const webpBuffer = await sharp(pngBuffer)
    .resize({
      width: 512,
      height: 512,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 60 })
    .toBuffer();
  await fsp.writeFile(`examples/${exampleName}/preview.webp`, webpBuffer);
}

console.log("All examples compiled.");
