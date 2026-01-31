import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type PluginOption, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { exec } from "node:child_process";
import "vitest/config";
import viteAssetsSplitPlugin from "vite-plugin-assets-split";
import ViteRemarkRehypePlugin from "@mr.python/vite-plugin-remark-rehype";

const fontMetaPlugin = (): PluginOption => ({
  name: "font-meta",
  enforce: "pre",
  async load(id) {
    const [rawPath, queryString] = id.split("?", 2);
    if (queryString !== "font-meta") return null;

    const fontPath = rawPath.startsWith("file://")
      ? fileURLToPath(rawPath)
      : rawPath;

    const fontkit = await import("fontkit");
    const font = fontkit.openSync(fontPath);
    if (!("postscriptName" in font))
      throw new Error(`Font file ${fontPath} does not have a PostScript name.`);
    const postScriptName = font?.postscriptName ?? null;

    const assetImportPath = `${rawPath}?url`;
    return `import url from ${JSON.stringify(assetImportPath)};
export default { postscriptName: ${JSON.stringify(postScriptName)}, url };`;
  },
});

// https://vite.dev/config/
export default defineConfig(async (): Promise<UserConfig> => {
  const gitCommitHash = await new Promise<undefined | string>((resolve) =>
    exec("git rev-parse --short HEAD", (err, stdout) => {
      if (err) resolve(undefined);
      else resolve(stdout.trim());
    }),
  );
  const isDirty = await new Promise<boolean>((resolve) =>
    exec("git diff-index --quiet HEAD", (err) => resolve(Boolean(err))),
  );
  return {
    base: "./",
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler"]],
        },
      }),
      fontMetaPlugin(),
      viteAssetsSplitPlugin({
        limit: 20 * 1024 * 1024, // 20 MB
      }),
      ViteRemarkRehypePlugin(),
    ],
    resolve: {
      alias: [
        { find: "@", replacement: resolve("src") },
        { find: "typst-template", replacement: resolve("typst-template") },
        { find: "assets", replacement: resolve("assets") },
        // a dirty workaround because <https://github.com/vitejs/vite/issues/7439>
        {
          find: "decode-named-character-reference",
          // replacement: "decode-named-character-reference/index.js",
          replacement: resolve(
            fileURLToPath(
              dirname(import.meta.resolve("decode-named-character-reference")),
            ),
            "index.js",
          ),
        },
      ],
    },
    define: {
      GIT_COMMIT_INFO: JSON.stringify(
        gitCommitHash === undefined
          ? "unknown"
          : gitCommitHash + (isDirty ? "-dirty" : ""),
      ),
    },
    server: {
      port: 4481,
    },
    worker: {
      format: "es",
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            const reg =
              /\/examples\/([^/]+)\/(?:(?:problem-(?:[^/]+)\.md)|(?:extra-(?:[^/]+)\.md)|(?:content\.json))\?raw$/;
            const match = id.match(reg);
            if (match) return `example-content-${match[1]}`;
          },
        },
      },
    },
    test: {
      coverage: {
        include: ["src/**/*.{ts,tsx}"],
      },
      projects: [
        {
          extends: true,
          test: {
            name: "node",
            environment: "node",
            include: ["tests/**/*.test.ts", "tests/**/*.node.test.ts"],
          },
        },
      ],
    },
  };
});
