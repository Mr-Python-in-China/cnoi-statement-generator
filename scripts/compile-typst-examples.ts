import fs from "fs/promises";
import path from "path";
import remarkTypst from "../src/compiler/remarkTypst";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import type contestData from "../src/types/contestData";
import { exec } from "child_process";
import axiosInstance from "../src/utils/axiosInstance";

const TYPST_CMD = process.env.TYPST_CMD || "typst";

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkGfm)
  .use(remarkTypst)
  .freeze();

(async () => {
  const examplesDir = path.resolve("examples");
  const entries = await fs.readdir(examplesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(examplesDir, entry.name);
    const dataJsonPath = path.join(dirPath, "data.json");
    const jsonFile = await fs
      .readFile(dataJsonPath, { encoding: "utf8" })
      .catch(() => undefined);
    if (!jsonFile) continue;
    const jsonData = JSON.parse(jsonFile) as contestData;
    for (const mdFileName of [
      "precaution.md" as const,
      ...jsonData.problems.map((_, i) => `problem-${i}.md` as const),
    ]) {
      const md = await fs.readFile(path.resolve(dirPath, mdFileName), "utf8");
      const result = await processor.process(md);
      const outPath = path.join(dirPath, mdFileName.replace(/\.md$/i, ".typ"));
      await Promise.all([
        await fs.writeFile(outPath, result.toString(), "utf8"),
        ...(result.data.assets || []).map(async ({ assetUrl, filename }) =>
          fs
            .stat(path.resolve(dirPath, filename))
            .catch(() =>
              axiosInstance
                .get<ArrayBuffer>(assetUrl)
                .then((res) =>
                  fs.writeFile(
                    path.resolve(dirPath, filename),
                    Buffer.from(res.data),
                  ),
                ),
            ),
        ),
      ]);
    }
    const typstDocument = await fs.readFile(path.resolve(dirPath, "main.typ"), {
      encoding: "utf-8",
    });
    await new Promise<void>((resolve, reject) => {
      const cp = exec(
        TYPST_CMD +
          " compile - main.pdf --ignore-system-fonts --font-path ../../assets/typst/fonts",
        { cwd: dirPath },
        (err) => {
          if (err)
            reject(new Error("Typst compilation failed", { cause: err }));
          else resolve();
        },
      );
      cp.stdin?.write(typstDocument);
      cp.stdin?.end();
    });
  }
})();
