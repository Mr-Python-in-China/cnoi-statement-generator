// @ts-check

import { appendFile, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";

const workspaceRoot = process.cwd();
const packagePath = join(workspaceRoot, "package.json");
const changelogPath = join(workspaceRoot, "CHANGELOG.md");
const outputPath = process.env.GITHUB_OUTPUT;

/**
 * @param {string} key
 * @param {string} value
 */
async function writeOutput(key, value) {
  if (!outputPath) return;
  await appendFile(outputPath, `${key}=${value}\n`);
}

/**
 * @param {string} filePath
 */
async function readJson(filePath) {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

/**
 * @param {string} beforeSha
 */
function getBeforePackageJson(beforeSha) {
  if (!/^[0-9a-fA-F]+$/.test(beforeSha)) throw new Error("Invalid beforeSha");
  const content = execSync(`git show ${beforeSha}:package.json`, {
    encoding: "utf8",
  });
  return JSON.parse(content);
}

/**
 * @param {string} input
 */
function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} version
 */
async function buildReleaseNotes(version) {
  const md = await readFile(changelogPath, "utf8");
  const esc = escapeRegex(version);
  const re = new RegExp(
    String.raw`^##\s+${esc}\s*\([^\n]*\)\n\n([\s\S]*?)(?=^##\s+|$(?![^]))`,
    "m",
  );
  const match = md.match(re);
  if (!match) {
    throw new Error(`Changelog entry not found for version ${version}`);
  }
  await writeFile("release_body.md", match[1].trim() + "\n");
}

async function main() {
  const beforeSha = process.env.GITHUB_EVENT_BEFORE;
  if (!beforeSha) {
    throw new Error("GITHUB_EVENT_BEFORE is not set");
  }

  const afterVer = (await readJson(packagePath)).version;
  const beforeVer = getBeforePackageJson(beforeSha).version;

  if (beforeVer === afterVer) {
    await writeOutput("changed", "false");
    return;
  }

  await writeOutput("changed", "true");
  await writeOutput("version", afterVer);
  await buildReleaseNotes(afterVer);
}

await main();
