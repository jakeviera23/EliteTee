#!/usr/bin/env node
/**
 * Hide curated duplicate rows that shadow member-reviewed courses.
 * Merges curated metadata into the reviewed canonical row; never deletes rows
 * or changes member_course_rounds links.
 *
 * Usage:
 *   node scripts/repair-reviewed-course-duplicates.mjs --dry-run
 *   node scripts/repair-reviewed-course-duplicates.mjs
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";

const root = join(process.cwd());
dotenv.config({ path: join(root, ".env.local") });

const dryRun = process.argv.includes("--dry-run");

function normalizeGolfCourseNameForMatch(value) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeLocationToken(value) {
  return (value ?? "").trim().toLowerCase();
}

function findGolfCourseDuplicateCandidatesLocal(input, existingCourses) {
  const normalizedName = normalizeGolfCourseNameForMatch(input.name);
  const cityKey = normalizeLocationToken(input.city) || null;
  const countryKey = normalizeLocationToken(input.country) || null;
  const matches = [];

  for (const course of existingCourses) {
    const courseNormalizedName = normalizeGolfCourseNameForMatch(course.name);
    const courseCity = normalizeLocationToken(course.city);
    const courseCountry = normalizeLocationToken(course.country);

    if (!normalizedName || !countryKey) continue;
    if (courseNormalizedName !== normalizedName) continue;
    if (courseCountry !== countryKey) continue;

    if (cityKey && courseCity === cityKey) {
      matches.push({ golf_course_id: course.id, match_rank: 2 });
      continue;
    }

    matches.push({ golf_course_id: course.id, match_rank: 3 });
  }

  return matches.sort((a, b) => a.match_rank - b.match_rank);
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MERGE_FIELDS = [
  "architect",
  "year_opened",
  "holes",
  "par",
  "yardage",
  "description",
  "website_url",
  "course_type",
  "access_type",
  "latitude",
  "longitude",
  "image_url",
  "thumbnail_url",
  "elite_tier",
  "featured_status",
  "curated_tags",
];

function isEmpty(value) {
  return value === null || value === undefined || value === "";
}

function buildMergeUpdate(reviewed, curated) {
  const update = {};
  for (const field of MERGE_FIELDS) {
    if (!isEmpty(reviewed[field]) || isEmpty(curated[field])) continue;
    update[field] = curated[field];
  }
  return update;
}

function extractResortCourseName(name) {
  const parts = String(name ?? "")
    .split(/—|-/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : String(name ?? "");
}

function isResortStyleDuplicate(reviewed, curated) {
  if (curated.source_name !== "elitetee_curated") return false;
  if (normalizeLocationToken(reviewed.country) !== normalizeLocationToken(curated.country)) {
    return false;
  }

  const reviewedCity = normalizeLocationToken(reviewed.city);
  const curatedCity = normalizeLocationToken(curated.city);
  if (reviewedCity && curatedCity && reviewedCity !== curatedCity) return false;

  const reviewedName = normalizeGolfCourseNameForMatch(reviewed.name);
  const curatedSuffix = normalizeGolfCourseNameForMatch(extractResortCourseName(curated.name));
  if (!reviewedName || !curatedSuffix) return false;

  return curatedSuffix === reviewedName;
}

async function loadRoundCounts() {
  const { data, error } = await supabase
    .from("member_course_rounds")
    .select("golf_course_id");
  if (error) throw error;

  const counts = new Map();
  for (const row of data ?? []) {
    counts.set(row.golf_course_id, (counts.get(row.golf_course_id) ?? 0) + 1);
  }
  return counts;
}

async function main() {
  console.log(`=== Repair reviewed course duplicates (${dryRun ? "DRY RUN" : "LIVE"}) ===\n`);

  const roundCounts = await loadRoundCounts();
  const { data: courses, error } = await supabase
    .from("golf_courses")
    .select(
      "id,name,slug,source_name,lifecycle_status,city,region,country,external_id,architect,year_opened,holes,par,yardage,description,website_url,course_type,access_type,latitude,longitude,image_url,thumbnail_url,elite_tier,featured_status,curated_tags",
    );
  if (error) throw error;

  const reviewed = (courses ?? []).filter((course) => (roundCounts.get(course.id) ?? 0) > 0);
  const curatedCandidates = (courses ?? []).filter(
    (course) =>
      course.source_name === "elitetee_curated" &&
      course.lifecycle_status !== "hidden" &&
      (roundCounts.get(course.id) ?? 0) === 0,
  );

  const hideActions = [];
  const mergeActions = [];

  for (const curated of curatedCandidates) {
    const strictMatches = findGolfCourseDuplicateCandidatesLocal(
      {
        name: curated.name,
        city: curated.city,
        country: curated.country,
        external_id: curated.external_id,
      },
      reviewed.map((course) => ({
        id: course.id,
        external_id: course.external_id,
        name: course.name,
        city: course.city,
        country: course.country,
      })),
    );

    let reviewedMatch = reviewed.find((course) => course.id === strictMatches[0]?.golf_course_id);

    if (!reviewedMatch) {
      reviewedMatch = reviewed.find((course) => isResortStyleDuplicate(course, curated));
    }

    if (!reviewedMatch) continue;

    const mergeUpdate = buildMergeUpdate(reviewedMatch, curated);
    mergeActions.push({
      reviewedId: reviewedMatch.id,
      reviewedName: reviewedMatch.name,
      curatedId: curated.id,
      curatedName: curated.name,
      mergeUpdate,
    });
    hideActions.push({
      curatedId: curated.id,
      curatedName: curated.name,
      reviewedName: reviewedMatch.name,
    });
  }

  console.log(`Reviewed courses: ${reviewed.length}`);
  console.log(`Curated candidates checked: ${curatedCandidates.length}`);
  console.log(`Duplicates to hide: ${hideActions.length}\n`);

  const changedRows = [];

  for (const action of mergeActions) {
    if (Object.keys(action.mergeUpdate).length > 0) {
      console.log(
        `MERGE into ${action.reviewedName} (${action.reviewedId}): ${JSON.stringify(action.mergeUpdate)}`,
      );
      if (!dryRun) {
        const { error: mergeError } = await supabase
          .from("golf_courses")
          .update(action.mergeUpdate)
          .eq("id", action.reviewedId);
        if (mergeError) throw mergeError;
        changedRows.push({ id: action.reviewedId, action: "merge", fields: action.mergeUpdate });
      }
    }
  }

  for (const action of hideActions) {
    console.log(
      `HIDE curated duplicate ${action.curatedName} (${action.curatedId}) → keep ${action.reviewedName}`,
    );
    if (!dryRun) {
      const { error: hideError } = await supabase
        .from("golf_courses")
        .update({ lifecycle_status: "hidden" })
        .eq("id", action.curatedId);
      if (hideError) throw hideError;
      changedRows.push({ id: action.curatedId, action: "hide", lifecycle_status: "hidden" });
    }
  }

  console.log(`\n=== ${dryRun ? "Dry run" : "Repair"} complete: ${changedRows.length} row updates ===`);
  if (!dryRun) {
    console.log(JSON.stringify(changedRows, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
