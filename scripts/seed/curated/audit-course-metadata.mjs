#!/usr/bin/env node
/**
 * Audit curated course metadata completeness and write a markdown report.
 *
 * Run: node scripts/seed/curated/audit-course-metadata.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("../../../", import.meta.url)));
const curatedRoot = join(root, "scripts/seed/curated");
const reportPath = join(root, "docs/curated-course-metadata-audit.md");

const PRIORITY_FIELDS = [
  "architect",
  "year_opened",
  "holes",
  "par",
  "yardage",
  "website",
  "description",
];

const LOCATION_FIELDS = ["city", "region", "country", "latitude", "longitude"];

function isEmpty(value) {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function missingFields(course, fields) {
  return fields.filter((field) => isEmpty(course[field]));
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
const courses = [];

for (const filePath of files) {
  const data = JSON.parse(await readFile(filePath, "utf8"));
  const relativeFile = filePath.replace(`${curatedRoot}/`, "");
  for (const course of data.courses ?? []) {
    courses.push({ ...course, _file: relativeFile });
  }
}

const seen = new Set();
const unique = courses.filter((course) => {
  if (seen.has(course.slug)) return false;
  seen.add(course.slug);
  return true;
});

const fieldCounts = Object.fromEntries(PRIORITY_FIELDS.map((field) => [field, 0]));
const incomplete = [];

for (const course of unique) {
  for (const field of PRIORITY_FIELDS) {
    if (!isEmpty(course[field])) fieldCounts[field] += 1;
  }

  const missingPriority = missingFields(course, PRIORITY_FIELDS);
  const missingLocation = missingFields(course, LOCATION_FIELDS);
  const isComplete = missingPriority.length === 0;

  if (!isComplete) {
    incomplete.push({
      slug: course.slug,
      name: course.name,
      file: course._file,
      elite_tier: course.elite_tier ?? "—",
      missing: missingPriority,
      missingLocation,
    });
  }
}

incomplete.sort((left, right) => {
  const tierOrder = {
    global_icon: 0,
    elite_private: 1,
    destination: 2,
    notable: 3,
    member_course: 4,
    "—": 5,
  };
  const tierCompare =
    (tierOrder[left.elite_tier] ?? 99) - (tierOrder[right.elite_tier] ?? 99);
  if (tierCompare !== 0) return tierCompare;
  return left.slug.localeCompare(right.slug);
});

const completeCount = unique.length - incomplete.length;
const lines = [
  "# Curated Course Metadata Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  `- **Total curated courses:** ${unique.length}`,
  `- **Fully enriched (all priority fields):** ${completeCount}`,
  `- **Incomplete:** ${incomplete.length}`,
  "",
  "### Priority field coverage",
  "",
  "| Field | Populated | Missing |",
  "| --- | ---: | ---: |",
];

for (const field of PRIORITY_FIELDS) {
  const populated = fieldCounts[field];
  lines.push(`| ${field} | ${populated} | ${unique.length - populated} |`);
}

lines.push(
  "",
  "## Incomplete courses",
  "",
  "Priority fields: architect, year_opened, holes, par, yardage, website, description.",
  "",
  "| Course | Tier | Missing fields | Seed file |",
  "| --- | --- | --- | --- |",
);

for (const row of incomplete) {
  lines.push(
    `| ${row.name} | ${row.elite_tier} | ${row.missing.join(", ")} | ${row.file} |`,
  );
}

lines.push(
  "",
  "## Location gaps",
  "",
  "Courses missing city, region, country, or verified coordinates:",
  "",
);

const locationGaps = unique
  .map((course) => ({
    slug: course.slug,
    name: course.name,
    missing: missingFields(course, LOCATION_FIELDS),
  }))
  .filter((row) => row.missing.length > 0);

if (locationGaps.length === 0) {
  lines.push("None.");
} else {
  for (const row of locationGaps) {
    lines.push(`- **${row.name}** (\`${row.slug}\`): ${row.missing.join(", ")}`);
  }
}

await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");

console.log(`Audit complete: ${unique.length} courses, ${incomplete.length} incomplete.`);
console.log(`Report: ${reportPath}`);
