import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const dist = path.join(process.cwd(), "docs", ".vitepress", "dist");
const budgets = {
  totalBytes: 8 * 1024 * 1024,
  largestJavaScriptBytes: 1_300 * 1024,
  largestImageBytes: 100 * 1024,
};

async function collect(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(absolute)));
    else files.push(absolute);
  }
  return files;
}

const files = await collect(dist);
const sizes = await Promise.all(
  files.map(async (file) => ({ file, bytes: (await stat(file)).size })),
);
const totalBytes = sizes.reduce((sum, item) => sum + item.bytes, 0);
const javascript = sizes
  .filter((item) => item.file.endsWith(".js"))
  .sort((a, b) => b.bytes - a.bytes);
const images = sizes
  .filter((item) => /\.(?:png|jpe?g|webp|avif)$/i.test(item.file))
  .sort((a, b) => b.bytes - a.bytes);

const failures: string[] = [];
if (totalBytes > budgets.totalBytes) {
  failures.push(
    `total output ${(totalBytes / 1024 / 1024).toFixed(2)} MB exceeds ${budgets.totalBytes / 1024 / 1024} MB`,
  );
}
if ((javascript[0]?.bytes ?? 0) > budgets.largestJavaScriptBytes) {
  failures.push(
    `largest JS ${(javascript[0].bytes / 1024).toFixed(1)} KB exceeds ${budgets.largestJavaScriptBytes / 1024} KB`,
  );
}
if ((images[0]?.bytes ?? 0) > budgets.largestImageBytes) {
  failures.push(
    `largest image ${(images[0].bytes / 1024).toFixed(1)} KB exceeds ${budgets.largestImageBytes / 1024} KB`,
  );
}

console.log(
  `Bundle: ${(totalBytes / 1024 / 1024).toFixed(2)} MB total; ` +
    `${((javascript[0]?.bytes ?? 0) / 1024).toFixed(1)} KB largest JS; ` +
    `${((images[0]?.bytes ?? 0) / 1024).toFixed(1)} KB largest image.`,
);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
