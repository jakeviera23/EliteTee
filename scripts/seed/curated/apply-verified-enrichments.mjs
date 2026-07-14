#!/usr/bin/env node
/**
 * Merge verified-course-metadata into curated seed JSON files.
 * Only fills empty fields — never overwrites existing values.
 *
 * Run: node scripts/seed/curated/apply-verified-enrichments.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import verifiedMetadata from "./verified-course-metadata.mjs";

const root = join(fileURLToPath(new URL("../../../", import.meta.url)));
const curatedRoot = join(root, "scripts/seed/curated");

const ENRICHMENT_FIELDS = [
  "architect",
  "year_opened",
  "holes",
  "par",
  "yardage",
  "website",
  "description",
  "latitude",
  "longitude",
];

function isEmpty(value) {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function mergeCourse(course) {
  const enrichment = verifiedMetadata[course.slug];
  if (!enrichment) return { course, changed: false };

  let changed = false;
  const merged = { ...course };

  for (const field of ENRICHMENT_FIELDS) {
    if (!(field in enrichment) || isEmpty(enrichment[field])) continue;
    if (!isEmpty(merged[field])) continue;
    merged[field] = enrichment[field];
    changed = true;
  }

  return { course: merged, changed };
}

async function listSeedFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSeedFiles(path)));
      continue;
    }
    if (
      entry.name.endsWith(".json") &&
      !entry.name.startsWith("manifest") &&
      entry.name !== "schema.json" &&
      !entry.name.startsWith("_")
    ) {
      files.push(path);
    }
  }

  return files;
}

const files = await listSeedFiles(curatedRoot);
let coursesTouched = 0;
let fieldsApplied = 0;

for (const filePath of files) {
  const raw = await readFile(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.courses)) continue;

  let fileChanged = false;
  const courses = data.courses.map((course) => {
    const { course: merged, changed } = mergeCourse(course);
    if (!changed) return course;

    fileChanged = true;
    coursesTouched += 1;
    for (const field of ENRICHMENT_FIELDS) {
      if (isEmpty(course[field]) && !isEmpty(merged[field])) fieldsApplied += 1;
    }
    return merged;
  });

  if (fileChanged) {
    await writeFile(filePath, `${JSON.stringify({ ...data, courses }, null, 2)}\n`, "utf8");
  }
}

console.log(`Applied verified enrichments to ${coursesTouched} courses (${fieldsApplied} fields).`);
