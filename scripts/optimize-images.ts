import { readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicRoot = path.join(root, "docs", "public");
const sourceExtensions = new Set([".png", ".jpg", ".jpeg"]);
const textExtensions = new Set([".md", ".ts", ".vue", ".html", ".css"]);
const ignoredDirectories = new Set([".git", ".npm-cache", "node_modules", "dist", "cache"]);

async function collect(directory: string, extensions: Set<string>): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(absolute, extensions)));
    else if (extensions.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
  }
  return files;
}

const images = await collect(publicRoot, sourceExtensions);
if (images.length === 0) {
  console.log("No PNG or JPEG images need optimization.");
  process.exit(0);
}

const replacements = new Map<string, string>();
let beforeBytes = 0;
let afterBytes = 0;

for (const input of images) {
  const relative = path.relative(publicRoot, input).replaceAll("\\", "/");
  const outputRelative = relative.replace(/\.(?:png|jpe?g)$/i, ".webp");
  const output = path.join(publicRoot, outputRelative);
  const temporary = `${output}.tmp`;
  beforeBytes += (await stat(input)).size;

  await sharp(input)
    .rotate()
    .resize({ width: 1440, withoutEnlargement: true })
    .webp({ quality: 84, effort: 6, smartSubsample: true })
    .toFile(temporary);
  await rm(output, { force: true });
  await rename(temporary, output);
  afterBytes += (await stat(output)).size;

  replacements.set(`/${relative}`, `/${outputRelative}`);
  replacements.set(`docs/public/${relative}`, `docs/public/${outputRelative}`);
  await rm(input);
}

for (const file of await collect(root, textExtensions)) {
  const original = await readFile(file, "utf8");
  let updated = original;
  for (const [from, to] of replacements) updated = updated.replaceAll(from, to);
  if (updated !== original) await writeFile(file, updated, "utf8");
}

const savedPercent = Math.round((1 - afterBytes / beforeBytes) * 100);
console.log(
  `Optimized ${images.length} images: ${(beforeBytes / 1024 / 1024).toFixed(2)} MB -> ${(afterBytes / 1024 / 1024).toFixed(2)} MB (${savedPercent}% smaller).`,
);
