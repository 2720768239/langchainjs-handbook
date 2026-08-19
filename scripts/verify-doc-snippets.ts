import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { transform } from "sucrase";

const docsRoot = path.join(process.cwd(), "docs");

async function collectMarkdown(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".vitepress") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectMarkdown(absolute)));
    else if (entry.name.endsWith(".md")) files.push(absolute);
  }
  return files;
}

const failures: string[] = [];
for (const file of await collectMarkdown(docsRoot)) {
  const content = await readFile(file, "utf8");
  const blocks = content.matchAll(/```(ts|typescript|js|javascript)\s*\n([\s\S]*?)```/g);
  let blockNumber = 0;
  for (const match of blocks) {
    blockNumber += 1;
    const language = match[1];
    const source = match[2];
    try {
      transform(source, {
        transforms: language.startsWith("j") ? [] : ["typescript"],
        filePath: `${path.basename(file)}-block-${blockNumber}.${language.startsWith("j") ? "js" : "ts"}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
      failures.push(`${path.relative(process.cwd(), file)} block ${blockNumber}: ${message}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Invalid documentation code blocks:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("All JavaScript and TypeScript documentation blocks parse successfully.");
