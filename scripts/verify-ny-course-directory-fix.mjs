#!/usr/bin/env node
/**
 * Post-fix verification for NY reviewed course directory visibility.
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

const NY_SLUGS = [
  "national-golf-links-of-america",
  "shinnecock-hills-golf-club-southampton-ny",
  "laurel-links-cc-laurel-new-york",
  "sebonack-golf-club-southampton-ny",
  "southampton-golf-club-southampton-golf-club",
  "westhampton-country-club-westhampton-beach-ny",
];

async function main() {
  const { data: page1, error: page1Error } = await supabase.rpc("search_golf_courses", {
    p_query: "",
    p_limit: 20,
    p_offset: 0,
  });
  if (page1Error) throw page1Error;

  console.log("## Page 1 ordering (limit=20)");
  for (const course of page1 ?? []) {
    console.log(
      `- ${course.name} | rounds=${course.round_count} | ${course.region} | ${course.slug}`,
    );
  }

  const nyOnPage1 = (page1 ?? []).filter((c) => NY_SLUGS.includes(c.slug));
  console.log(`\nNY reviewed on page 1: ${nyOnPage1.length}/${NY_SLUGS.length}`);

  for (const slug of NY_SLUGS) {
    const { data: detail, error } = await supabase.rpc("get_golf_course_by_slug", {
      p_slug: slug,
    });
    if (error) throw error;
    const row = Array.isArray(detail) ? detail[0] : detail;
    console.log(
      `\n${slug}: rounds=${row?.round_count ?? 0} rating=${row?.avg_rating ?? "n/a"} lifecycle/searchable=${Boolean(row)}`,
    );
  }

  const { data: geoCounts, error: geoError } = await supabase.rpc(
    "golf_course_directory_geo_counts",
    { p_query: "" },
  );
  if (geoError) throw geoError;

  const nyCounts = (geoCounts ?? []).filter(
    (row) =>
      String(row.country).toLowerCase() === "united states" &&
      ["new york", "ny"].includes(String(row.region).toLowerCase()),
  );
  console.log("\n## NY geo counts from RPC");
  console.log(JSON.stringify(nyCounts, null, 2));

  const { data: hiddenDupes } = await supabase
    .from("golf_courses")
    .select("id,name,slug,lifecycle_status")
    .in("slug", [
      "bandon-dunes-golf-resort-bandon-trails",
      "bandon-dunes-golf-resort-pacific-dunes",
    ]);
  console.log("\n## Hidden duplicate rows");
  console.log(JSON.stringify(hiddenDupes, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
