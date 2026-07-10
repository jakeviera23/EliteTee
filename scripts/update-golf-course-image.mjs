#!/usr/bin/env node
/**
 * Server-side tool to set a licensed golf course image on golf_courses.
 *
 * NEVER use VITE_* for service-role keys.
 *
 * Required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Identify course by exactly one of:
 *   --slug=pebble-beach-golf-links
 *   --external-id=provider-123
 *
 * Image fields:
 *   --image-url=https://...        (required)
 *   --thumbnail-url=https://...    (optional, for list cards)
 *   --image-source=provider|admin|verified_rep
 *   --image-attribution=...
 *   --image-license=...
 *
 * Usage:
 *   node scripts/update-golf-course-image.mjs --slug=bandon-dunes --image-url=https://example.com/bandon.jpg --image-source=admin --dry-run
 *   node scripts/update-golf-course-image.mjs --external-id=abc123 --image-url=https://...
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
dotenv.config({ path: join(root, ".env.local") });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function readArg(name) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : null;
}

const slug = readArg("slug");
const externalId = readArg("external-id");
const imageUrl = readArg("image-url");
const thumbnailUrl = readArg("thumbnail-url");
const imageSource = readArg("image-source");
const imageAttribution = readArg("image-attribution");
const imageLicense = readArg("image-license");

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!slug && !externalId) {
  console.error("Provide --slug=... or --external-id=...");
  process.exit(1);
}

if (!imageUrl) {
  console.error("Provide --image-url=...");
  process.exit(1);
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

if (!isValidHttpUrl(imageUrl)) {
  console.error("image-url must be a valid http(s) URL.");
  process.exit(1);
}

if (thumbnailUrl && !isValidHttpUrl(thumbnailUrl)) {
  console.error("thumbnail-url must be a valid http(s) URL.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  let query = supabase.from("golf_courses").select("id, name, slug, external_id, image_url");

  if (slug) {
    query = query.eq("slug", slug);
  } else {
    query = query.eq("external_id", externalId);
  }

  const { data: course, error: lookupError } = await query.maybeSingle();

  if (lookupError) {
    console.error("Lookup failed:", lookupError.message);
    process.exit(1);
  }

  if (!course) {
    console.error("No matching course found.");
    process.exit(1);
  }

  const payload = {
    image_url: imageUrl,
    thumbnail_url: thumbnailUrl ?? null,
    image_source: imageSource ?? "admin",
    image_attribution: imageAttribution ?? null,
    image_license: imageLicense ?? null,
    image_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log(`Course: ${course.name} (${course.slug})`);
  console.log("Update payload:", payload);

  if (dryRun) {
    console.log("DRY RUN — no database write.");
    return;
  }

  const { error: updateError } = await supabase
    .from("golf_courses")
    .update(payload)
    .eq("id", course.id);

  if (updateError) {
    console.error("Update failed:", updateError.message);
    process.exit(1);
  }

  console.log("Course image updated.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
