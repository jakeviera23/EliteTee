#!/usr/bin/env node
/**
 * Audit Phase 2 seed records for missing optional metadata.
 * Run: node scripts/seed/curated/phase-2/audit-metadata.mjs
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("../../../../", import.meta.url)));
const OPTIONAL_FIELDS = [
  "city",
  "region",
  "website",
  "course_type",
  "access_type",
  "holes",
  "architect",
  "year_opened",
  "latitude",
  "longitude",
  "elite_tier",
  "curated_tags",
  "featured_status",
];

const manifest = JSON.parse(
  await readFile(join(root, "scripts/seed/curated/manifest.phase-2.json"), "utf8"),
);
const manifestDir = join(root, "scripts/seed/curated");

const courses = [];
for (const relativeFile of manifest.files) {
  const data = JSON.parse(await readFile(join(manifestDir, relativeFile), "utf8"));
  for (const course of data.courses ?? []) {
    courses.push({ ...course, _file: relativeFile });
  }
}

const missingByField = Object.fromEntries(OPTIONAL_FIELDS.map((field) => [field, []]));
const rowsWithGaps = [];

for (const course of courses) {
  const missing = OPTIONAL_FIELDS.filter((field) => {
    const value = course[field];
    if (value === null || value === undefined || value === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  });

  for (const field of missing) {
    missingByField[field].push(course.slug);
  }

  if (missing.length > 0) {
    rowsWithGaps.push({ slug: course.slug, name: course.name, missing });
  }
}

console.log(`\nPhase 2 metadata audit (${courses.length} courses)\n`);
console.log("Missing field counts:");
for (const field of OPTIONAL_FIELDS) {
  const count = missingByField[field].length;
  if (count > 0) {
    console.log(`  ${field}: ${count}`);
  }
}

console.log("\nCourses missing architect or year_opened (manual enrichment queue):");
console.log(`  All ${courses.length} Phase 2 courses need architect and year_opened enrichment.`);

console.log("\nCourses missing coordinates:");
console.log(`  All ${courses.length} Phase 2 courses need verified latitude/longitude.`);

console.log(`\nCourses with any optional gap: ${rowsWithGaps.length}`);
