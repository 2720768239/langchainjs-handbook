import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", ".npm-cache", "node_modules", "dist", "cache"]);

async function collectMarkdown(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectMarkdown(absolute)));
    else if (entry.name.endsWith(".md")) files.push(absolute);
  }
  return files;
}

async function exists(candidate: string): Promise<boolean> {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

function lineAt(content: string, offset: number): number {
  return content.slice(0, offset).split("\n").length;
}

const failures: string[] = [];
for (const file of await collectMarkdown(root)) {
  const content = await readFile(file, "utf8");
  const links = content.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g);
  for (const match of links) {
    const link = match[1];
    if (/^(?:https?:|mailto:|#)/.test(link)) continue;
    const clean = link.split("#")[0].split("?")[0];
    if (!clean) continue;

    const candidates = clean.startsWith("/")
      ? [
          path.join(root, "docs", clean.slice(1)),
          path.join(root, "docs", `${clean.slice(1)}.md`),
          path.join(root, "docs", clean.slice(1), "index.md"),
          path.join(root, "docs", "public", clean.slice(1)),
        ]
      : [
          path.resolve(path.dirname(file), clean),
          path.resolve(path.dirname(file), `${clean}.md`),
          path.resolve(path.dirname(file), clean, "index.md"),
        ];

    if (
      !(await Promise.any(
        candidates.map(async (candidate) => {
          if (await exists(candidate)) return true;
          throw new Error("missing");
        }),
      ).catch(() => false))
    ) {
      failures.push(`${path.relative(root, file)}:${lineAt(content, match.index ?? 0)} -> ${link}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Broken local Markdown links:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("All local Markdown links resolve.");
