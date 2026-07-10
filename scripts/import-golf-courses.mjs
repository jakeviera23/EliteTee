#!/usr/bin/env node
/**
 * Server-side golf course import for EliteTee.
 *
 * NEVER use VITE_* variables for provider or service-role secrets.
 *
 * Required environment variables (e.g. in .env.local for local runs):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Provider (configure when you have a legitimate data source):
 *   GOLF_COURSE_PROVIDER_URL      — REST endpoint base URL
 *   GOLF_COURSE_PROVIDER_API_KEY  — provider API key
 *   GOLF_COURSE_PROVIDER_PAGE_SIZE — optional, default 100
 *   GOLF_COURSE_PROVIDER_RATE_MS  — optional delay between pages, default 500
 *
 * Usage:
 *   node scripts/import-golf-courses.mjs --dry-run
 *   node scripts/import-golf-courses.mjs
 *   node scripts/import-golf-courses.mjs --max-pages 5
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
dotenv.config({ path: join(root, ".env.local") });

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const maxPagesArg = process.argv.find((arg) => arg.startsWith("--max-pages="));
const maxPages = maxPagesArg ? Number(maxPagesArg.split("=")[1]) : Infinity;

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const providerUrl = process.env.GOLF_COURSE_PROVIDER_URL;
const providerApiKey = process.env.GOLF_COURSE_PROVIDER_API_KEY;
const pageSize = Number(process.env.GOLF_COURSE_PROVIDER_PAGE_SIZE ?? 100);
const rateMs = Number(process.env.GOLF_COURSE_PROVIDER_RATE_MS ?? 500);

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Set these in .env.local (do NOT prefix the service role key with VITE_).");
  process.exit(1);
}

if (!providerUrl || !providerApiKey) {
  console.error("Provider is not configured.");
  console.error("Set GOLF_COURSE_PROVIDER_URL and GOLF_COURSE_PROVIDER_API_KEY when ready.");
  console.error("See docs/golf-course-import.md for integration steps.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalize a provider record into EliteTee's golf_courses shape.
 * Adapt this function to your provider's JSON schema.
 */
export function normalizeProviderCourse(raw) {
  const name = String(raw.name ?? raw.course_name ?? "").trim();
  if (!name) return null;

  const city = raw.city ? String(raw.city).trim() : null;
  const region = raw.region ?? raw.state ?? raw.province ?? null;
  const country = raw.country ? String(raw.country).trim() : null;

  const imageUrl = raw.image_url ?? raw.image ?? raw.photo_url ?? null;
  const thumbnailUrl = raw.thumbnail_url ?? raw.thumb_url ?? raw.image_thumbnail ?? null;

  return {
    external_id: raw.id ? String(raw.id) : raw.external_id ? String(raw.external_id) : null,
    name,
    slug: raw.slug ? String(raw.slug) : slugify(name),
    city,
    region: region ? String(region).trim() : null,
    country,
    latitude: raw.latitude ?? raw.lat ?? null,
    longitude: raw.longitude ?? raw.lng ?? raw.lon ?? null,
    website_url: raw.website ?? raw.website_url ?? null,
    course_type: raw.course_type ?? raw.type ?? null,
    access_type: raw.access_type ?? raw.access ?? null,
    holes: raw.holes ?? null,
    description: raw.description ?? null,
    image_url: imageUrl ? String(imageUrl).trim() : null,
    thumbnail_url: thumbnailUrl ? String(thumbnailUrl).trim() : null,
    image_source: raw.image_source
      ? String(raw.image_source)
      : imageUrl
        ? (process.env.GOLF_COURSE_PROVIDER_NAME ?? "external_provider")
        : null,
    image_attribution: raw.image_attribution ?? raw.photo_credit ?? raw.attribution ?? null,
    image_license: raw.image_license ?? raw.license ?? null,
    image_updated_at: imageUrl ? (raw.image_updated_at ?? new Date().toISOString()) : null,
    source_name: process.env.GOLF_COURSE_PROVIDER_NAME ?? "external_provider",
    source_updated_at: raw.updated_at ?? new Date().toISOString(),
  };
}

async function fetchProviderPage(page) {
  const url = new URL(providerUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(pageSize));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${providerApiKey}`,
      Accept: "application/json",
    },
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after") ?? 5);
    console.warn(`Rate limited. Waiting ${retryAfter}s…`);
    await sleep(retryAfter * 1000);
    return fetchProviderPage(page);
  }

  if (!response.ok) {
    throw new Error(`Provider HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload.data ?? payload.courses ?? [];
  const hasMore = Array.isArray(payload)
    ? rows.length === pageSize
    : Boolean(payload.has_more ?? payload.next_page ?? rows.length === pageSize);

  return { rows, hasMore };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertCourse(course) {
  if (dryRun) return { action: "dry-run" };

  const { data: existing, error: lookupError } = await supabase
    .from("golf_courses")
    .select("id, slug")
    .eq("external_id", course.external_id)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const payload = {
    ...course,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("golf_courses").update(payload).eq("id", existing.id);
    if (error) throw error;
    return { action: "updated" };
  }

  const { error } = await supabase.from("golf_courses").upsert(payload, {
    onConflict: "external_id",
    ignoreDuplicates: false,
  });

  if (error) {
    if (error.code === "23505" && error.message.includes("slug")) {
      payload.slug = `${payload.slug}-${course.external_id?.slice(0, 8) ?? Date.now()}`;
      const { error: retryError } = await supabase.from("golf_courses").upsert(payload, {
        onConflict: "external_id",
      });
      if (retryError) throw retryError;
      return { action: "inserted" };
    }
    throw error;
  }

  return { action: "inserted" };
}

async function main() {
  const summary = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  let page = 1;
  let hasMore = true;

  console.log(dryRun ? "DRY RUN — no database writes" : "Starting golf course import…");

  while (hasMore && page <= maxPages) {
    const { rows, hasMore: more } = await fetchProviderPage(page);
    hasMore = more;

    for (const raw of rows) {
      try {
        const normalized = normalizeProviderCourse(raw);
        if (!normalized?.external_id) {
          summary.skipped += 1;
          continue;
        }

        const result = await upsertCourse(normalized);
        if (result.action === "inserted") summary.inserted += 1;
        else if (result.action === "updated") summary.updated += 1;
        else if (result.action === "dry-run") summary.skipped += 1;
      } catch (error) {
        summary.failed += 1;
        console.error("Failed row:", error instanceof Error ? error.message : error);
      }
    }

    console.log(`Page ${page}: processed ${rows.length} rows`);
    page += 1;
    if (hasMore) await sleep(rateMs);
  }

  console.log("\nImport summary");
  console.log(`  Inserted: ${summary.inserted}`);
  console.log(`  Updated:  ${summary.updated}`);
  console.log(`  Skipped:  ${summary.skipped}`);
  console.log(`  Failed:   ${summary.failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
