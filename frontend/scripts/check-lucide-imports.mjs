import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "app");
const TARGET = /import\s*\{([\s\S]*?)\}\s*from\s*["']lucide-react["'];?/gm;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}

const errors = [];

for (const file of walk(APP_DIR)) {
  const content = fs.readFileSync(file, "utf8");
  for (const match of content.matchAll(TARGET)) {
    const rawSpecifiers = match[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const counts = new Map();
    for (const spec of rawSpecifiers) {
      counts.set(spec, (counts.get(spec) || 0) + 1);
    }
    const dupes = [...counts.entries()].filter(([, count]) => count > 1);
    if (dupes.length > 0) {
      errors.push({
        file: path.relative(ROOT, file),
        specifiers: dupes.map(([name, count]) => `${name} (x${count})`).join(", "),
      });
    }
  }
}

if (errors.length > 0) {
  console.error("Duplicate lucide-react import specifiers found:");
  for (const err of errors) {
    console.error(`- ${err.file}: ${err.specifiers}`);
  }
  process.exit(1);
}

console.log("Lucide import check passed.");
