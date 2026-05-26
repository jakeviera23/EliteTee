/**
 * Ensures hero images exist in public/images before build.
 * 1. Copies from ~/Downloads when present (local dev).
 * 2. Downloads curated Unsplash fallbacks when files are missing (CI / Vercel).
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const downloads = join(homedir(), "Downloads");
const dest = join(root, "public", "images");
const UA =
  "Mozilla/5.0 (compatible; EliteTee/1.0; +https://github.com/vercel/vercel)";

const localFiles = [
  ["andrew-rice-waE_CT2q8Os-unsplash.jpg", "hero-coastal.jpg"],
  ["andrew-anderson-CtyC2JjLhVg-unsplash.jpg", "hero-aerial.jpg"],
  ["peter-drew-YBRMHuQIk2Q-unsplash.jpg", "hero-swing.jpg"],
  ["benny-hassum-c6UloF3fF4U-unsplash.jpg", "hero-sunset.jpg"],
  ["avansear-3NpJk7j20HY-unsplash.jpg", "hero-clubhouse.jpg"],
];

/** Remote fallbacks (Unsplash, then Pexels) when local copies are unavailable. */
const remoteFallbacks = {
  "hero-coastal.jpg": [
    "https://images.unsplash.com/photo-1593111774240-d529f12be814?ixlib=rb-4.0.3&auto=format&fit=crop&w=2400&q=85",
    "https://images.pexels.com/photos/1325732/pexels-photo-1325732.jpeg?auto=compress&cs=tinysrgb&w=2400",
  ],
  "hero-aerial.jpg": [
    "https://images.unsplash.com/photo-1535131749008-b7f58c99034b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=85",
    "https://images.pexels.com/photos/2485476/pexels-photo-2485476.jpeg?auto=compress&cs=tinysrgb&w=2000",
  ],
  "hero-swing.jpg": [
    "https://images.unsplash.com/photo-1594756202469-9b2f9aef0e56?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=85",
    "https://images.pexels.com/photos/2484449/pexels-photo-2484449.jpeg?auto=compress&cs=tinysrgb&w=2000",
  ],
  "hero-sunset.jpg": [
    "https://images.unsplash.com/photo-1629996359799-8a84e501188d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=85",
    "https://images.pexels.com/photos/22383/pexels-photo-22383.jpeg?auto=compress&cs=tinysrgb&w=2000",
  ],
  "hero-clubhouse.jpg": [
    "https://images.unsplash.com/photo-1587174486079-ae7e9c218df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=85",
    "https://images.pexels.com/photos/1325732/pexels-photo-1325732.jpeg?auto=compress&cs=tinysrgb&w=2000",
  ],
};

const MIN_BYTES = 8_000;
const strictDeploy = Boolean(process.env.VERCEL);

mkdirSync(dest, { recursive: true });

function isValidImage(path) {
  if (!existsSync(path)) return false;
  try {
    return statSync(path).size >= MIN_BYTES;
  } catch {
    return false;
  }
}

async function download(url, to) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) {
    throw new Error(`Response too small (${buf.length} bytes) for ${url}`);
  }
  writeFileSync(to, buf);
}

let failed = 0;

for (const [srcName, dstName] of localFiles) {
  const to = join(dest, dstName);
  if (isValidImage(to)) {
    console.log(`OK ${dstName} (already present)`);
    continue;
  }

  const from = join(downloads, srcName);
  if (existsSync(from)) {
    try {
      copyFileSync(from, to);
      console.log(`Copied ${dstName} from Downloads`);
      continue;
    } catch (err) {
      console.warn(`Copy failed for ${dstName}: ${err.message}`);
    }
  }

  const urls = remoteFallbacks[dstName] ?? [];
  let downloaded = false;
  for (const url of urls) {
    try {
      await download(url, to);
      console.log(`Downloaded ${dstName}`);
      downloaded = true;
      break;
    } catch (err) {
      console.warn(`${dstName}: ${err.message}`);
    }
  }
  if (!downloaded) failed += 1;
}

if (failed > 0) {
  console.error(
    `\n${failed} image(s) missing. Run "npm run sync-images", set VITE_IMAGE_SOURCE=local, or use default remote images.`,
  );
  if (strictDeploy) process.exit(1);
}
