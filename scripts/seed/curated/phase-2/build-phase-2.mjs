#!/usr/bin/env node
/**
 * Writes scripts/seed/curated/regions/phase-2/*.json from courses-phase-2.mjs.
 * Run: node scripts/seed/curated/phase-2/build-phase-2.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  australiaNewZealandCourses,
  asiaCourses,
  canadaCourses,
  europeCourses,
  middleEastCourses,
  otherDestinationsCourses,
  unitedKingdomIrelandCourses,
  unitedStatesCourses,
} from "./courses-phase-2.mjs";

const root = join(fileURLToPath(new URL("../../../../", import.meta.url)));

async function loadExistingSlugs() {
  const slugs = new Set();
  for (const manifestPath of [
    "scripts/seed/curated/manifest.json",
    "scripts/seed/curated/manifest.phase-1.json",
  ]) {
    const manifest = JSON.parse(await readFile(join(root, manifestPath), "utf8"));
    const manifestDir = join(root, manifestPath, "..");
    for (const relativeFile of manifest.files) {
      const data = JSON.parse(await readFile(join(manifestDir, relativeFile), "utf8"));
      for (const course of data.courses ?? []) {
        if (course.slug) slugs.add(course.slug);
      }
    }
  }
  return slugs;
}

function assertNoDuplicates(courses, label, existingSlugs) {
  const seen = new Set();
  for (const course of courses) {
    if (seen.has(course.slug)) {
      throw new Error(`Duplicate slug in ${label}: ${course.slug}`);
    }
    seen.add(course.slug);
    if (existingSlugs.has(course.slug)) {
      throw new Error(`Slug already in phase 0/1: ${course.slug}`);
    }
  }
}

const regions = [
  ["united-states.json", "United States", unitedStatesCourses],
  ["united-kingdom-ireland.json", "United Kingdom & Ireland", unitedKingdomIrelandCourses],
  ["canada.json", "Canada", canadaCourses],
  ["australia-new-zealand.json", "Australia & New Zealand", australiaNewZealandCourses],
  ["europe.json", "Europe", europeCourses],
  ["asia.json", "Asia", asiaCourses],
  ["middle-east.json", "Middle East", middleEastCourses],
  ["other-destinations.json", "Other destination golf", otherDestinationsCourses],
];

const existingSlugs = await loadExistingSlugs();
const outDir = join(root, "scripts/seed/curated/regions/phase-2");
await mkdir(outDir, { recursive: true });

let total = 0;
for (const [filename, regionLabel, courses] of regions) {
  assertNoDuplicates(courses, regionLabel, existingSlugs);
  const payload = {
    version: 1,
    source_name: "elitetee_curated",
    region: regionLabel,
    phase: 2,
    courses,
  };
  await writeFile(join(outDir, filename), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  total += courses.length;
  console.log(`${filename}: ${courses.length} courses`);
}

const manifest = {
  version: 1,
  source_name: "elitetee_curated",
  description: "Phase 2 curated expansion batch (200 courses). Import after editorial review.",
  phase: 2,
  course_count: total,
  files: regions.map(([filename]) => `regions/phase-2/${filename}`),
};

await writeFile(
  join(root, "scripts/seed/curated/manifest.phase-2.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Total: ${total} courses`);
