#!/usr/bin/env node
/**
 * Diagnostic: NY reviewed courses directory visibility.
 * Read-only against linked Supabase.
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const NY_REGIONS = new Set(["ny", "new york"]);

function isNy(course) {
  const region = (course.region ?? "").trim().toLowerCase();
  const country = (course.country ?? "").trim().toLowerCase();
  return country === "united states" && NY_REGIONS.has(region);
}

async function fetchAllSearch(query = "", limit = 50) {
  const rows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.rpc("search_golf_courses", {
      p_query: query,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  return rows;
}

async function main() {
  console.log("=== NY Course Directory Diagnostics ===\n");

  // 1. All courses with member rounds
  const { data: rounds, error: roundsError } = await supabase
    .from("member_course_rounds")
    .select("golf_course_id");
  if (roundsError) throw roundsError;

  const roundCounts = new Map();
  for (const row of rounds ?? []) {
    roundCounts.set(row.golf_course_id, (roundCounts.get(row.golf_course_id) ?? 0) + 1);
  }

  const reviewedIds = [...roundCounts.keys()];
  const { data: reviewedCourses, error: reviewedError } = await supabase
    .from("golf_courses")
    .select(
      "id,name,slug,source_name,lifecycle_status,city,region,country,architect,year_opened",
    )
    .in("id", reviewedIds);
  if (reviewedError) throw reviewedError;

  console.log("## All courses with member rounds/reviews\n");
  console.log("| Course | ID | Slug | source_name | lifecycle | City | Region | Rounds |");
  console.log("|--------|-----|------|-------------|-----------|------|--------|--------|");

  const nyReviewed = [];
  for (const course of (reviewedCourses ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
    const count = roundCounts.get(course.id) ?? 0;
    const ny = isNy(course);
    if (ny) nyReviewed.push(course);
    console.log(
      `| ${course.name} | \`${course.id.slice(0, 8)}…\` | ${course.slug} | ${course.source_name} | ${course.lifecycle_status} | ${course.city ?? ""} | ${course.region ?? ""} | ${count} |`,
    );
  }

  console.log(`\nTotal reviewed courses: ${reviewedCourses?.length ?? 0}`);
  console.log(`NY reviewed courses: ${nyReviewed.length}\n`);

  // 2. Verify member_course_rounds links
  console.log("## member_course_rounds integrity\n");
  for (const course of reviewedCourses ?? []) {
    const { count, error } = await supabase
      .from("member_course_rounds")
      .select("id", { count: "exact", head: true })
      .eq("golf_course_id", course.id);
    if (error) throw error;
    const expected = roundCounts.get(course.id) ?? 0;
    const ok = count === expected ? "OK" : "MISMATCH";
    console.log(`${course.name}: ${count} rounds (${ok})`);
  }

  // 3. Named courses check
  const named = [
    "National Golf Links of America",
    "Shinnecock Hills",
    "Laurel Links",
    "Friar",
    "Garden City Golf Club",
    "Essex County",
    "Bandon Trails",
    "Pacific Dunes",
    "Kinloch",
  ];
  console.log("\n## Named course lookup (golf_courses)\n");
  for (const term of named) {
    const { data } = await supabase
      .from("golf_courses")
      .select("id,name,slug,source_name,lifecycle_status,region,city")
      .ilike("name", `%${term}%`);
    console.log(`\n**${term}** (${data?.length ?? 0} rows):`);
    for (const row of data ?? []) {
      const rc = roundCounts.get(row.id) ?? 0;
      console.log(
        `  - ${row.name} | ${row.slug} | ${row.source_name} | ${row.lifecycle_status} | ${row.region} | rounds=${rc}`,
      );
    }
  }

  // 4. search_golf_courses page 1
  const page1 = await fetchAllSearch("", 20);
  console.log("\n## search_golf_courses page 1 (limit=20, offset=0)\n");
  console.log(`Returned: ${page1.length} courses`);
  const page1Ny = page1.filter(isNy);
  const page1Reviewed = page1.filter((c) => (c.round_count ?? 0) > 0);
  console.log(`NY on page 1: ${page1Ny.length}`);
  console.log(`Reviewed on page 1: ${page1Reviewed.length}`);
  console.log("Page 1 courses:");
  for (const c of page1) {
    console.log(
      `  - ${c.name} | rounds=${c.round_count ?? 0} | ${c.region ?? ""} | ${c.slug}`,
    );
  }

  // 5. NY search
  const nySearch = await fetchAllSearch("New York", 50);
  console.log("\n## search_golf_courses query='New York'\n");
  console.log(`Total NY matches: ${nySearch.length}`);
  const nyReviewedInSearch = nySearch.filter((c) => (c.round_count ?? 0) > 0);
  console.log(`With reviews: ${nyReviewedInSearch.length}`);
  for (const c of nyReviewedInSearch) {
    console.log(
      `  - ${c.name} | rounds=${c.round_count} | rating=${c.avg_rating} | ${c.slug}`,
    );
  }

  // 6. Curated duplicates near reviewed
  console.log("\n## Potential curated duplicates (same country, overlapping name tokens)\n");
  for (const reviewed of reviewedCourses ?? []) {
    if ((roundCounts.get(reviewed.id) ?? 0) === 0) continue;
    const tokens = reviewed.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter((t) => t.length > 3);
    const first = tokens[0];
    if (!first) continue;
    const { data: candidates } = await supabase
      .from("golf_courses")
      .select("id,name,slug,source_name,lifecycle_status,region,city,country")
      .eq("source_name", "elitetee_curated")
      .neq("id", reviewed.id)
      .ilike("name", `%${first}%`)
      .eq("country", reviewed.country ?? "United States");
    for (const cand of candidates ?? []) {
      const candRounds = roundCounts.get(cand.id) ?? 0;
      if (candRounds > 0) continue;
      const candNorm = cand.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const revNorm = reviewed.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const overlap =
        candNorm.includes(first) &&
        (tokens.some((t) => candNorm.includes(t)) || candNorm.includes(revNorm.split(" ")[0]));
      if (overlap) {
        console.log(
          `  REVIEWED: ${reviewed.name} (${reviewed.id.slice(0, 8)}) ↔ CURATED: ${cand.name} (${cand.id.slice(0, 8)}) | ${cand.lifecycle_status} | ${cand.slug}`,
        );
      }
    }
  }

  console.log("\n=== Diagnostics complete ===");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
