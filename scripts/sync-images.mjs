import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const downloads = join(homedir(), "Downloads");
const dest = join(root, "public", "images");

const files = [
  ["andrew-rice-waE_CT2q8Os-unsplash.jpg", "hero-coastal.jpg"],
  ["andrew-anderson-CtyC2JjLhVg-unsplash.jpg", "hero-aerial.jpg"],
  ["peter-drew-YBRMHuQIk2Q-unsplash.jpg", "hero-swing.jpg"],
  ["benny-hassum-c6UloF3fF4U-unsplash.jpg", "hero-sunset.jpg"],
  ["avansear-3NpJk7j20HY-unsplash.jpg", "hero-clubhouse.jpg"],
];

mkdirSync(dest, { recursive: true });

for (const [src, dst] of files) {
  const from = join(downloads, src);
  const to = join(dest, dst);
  if (!existsSync(from)) {
    console.warn(`Missing: ${from}`);
    continue;
  }
  copyFileSync(from, to);
  console.log(`Copied ${dst}`);
}
