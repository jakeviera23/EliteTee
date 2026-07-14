#!/usr/bin/env node
/**
 * Import EliteTee curated golf course seeds through the staged import pipeline.
 *
 * Usage:
 *   npm run import:curated-golf-courses -- --dry-run --manifest=scripts/seed/curated/manifest.json
 *   npm run import:curated-golf-courses -- --file=scripts/seed/curated/foundation.json
 *   npm run import:curated-golf-courses -- --file=scripts/seed/curated/courses.csv
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyCuratedDuplicateResolution,
  buildCuratedPostImportUpdate,
  CURATED_SOURCE_NAME,
  dedupeCuratedSeedRecords,
  hasCuratedPostImportFields,
  parseCuratedSeedFile,
  resolveCuratedImportExternalId,
  validateCuratedPipelineRecord,
} from "./lib/curatedSeedShared.mjs";
import {
  buildFailedRecordLog,
  summarizeBatch,
} from "./lib/courseImportShared.mjs";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
dotenv.config({ path: join(root, ".env.local") });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileArg = args.find((arg) => arg.startsWith("--file="));
const manifestArg = args.find((arg) => arg.startsWith("--manifest="));
const dirArg = args.find((arg) => arg.startsWith("--dir="));

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
  console.error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

async function readSeedFile(relativePath) {
  const absolutePath = resolve(root, relativePath);
  const content = await readFile(absolutePath, "utf8");
  return parseCuratedSeedFile(content, basename(absolutePath));
}

async function loadSeedRecords() {
  if (fileArg) {
    const filePath = fileArg.split("=")[1];
    return readSeedFile(filePath);
  }

  if (manifestArg) {
    const manifestPath = manifestArg.split("=")[1];
    const manifest = JSON.parse(await readFile(resolve(root, manifestPath), "utf8"));
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const manifestDir = join(resolve(root, manifestPath), "..");
    const records = [];

    for (const relativeFile of files) {
      const absolutePath = resolve(manifestDir, relativeFile);
      const content = await readFile(absolutePath, "utf8");
      records.push(...parseCuratedSeedFile(content, basename(absolutePath)));
    }

    return records;
  }

  if (dirArg) {
    const dirPath = resolve(root, dirArg.split("=")[1]);
    const entries = await readdir(dirPath, { withFileTypes: true });
    const records = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!/\.(json|csv)$/i.test(entry.name)) continue;
      const content = await readFile(join(dirPath, entry.name), "utf8");
      records.push(...parseCuratedSeedFile(content, entry.name));
    }

    return records;
  }

  console.error("Specify one data source:");
  console.error("  --file=scripts/seed/curated/foundation.json");
  console.error("  --manifest=scripts/seed/curated/manifest.json");
  console.error("  --dir=scripts/seed/curated/regions");
  process.exit(1);
}

async function fetchExistingCourses() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("golf_courses")
    .select("id, external_id, slug, name, city, country, source_name");

  if (error) throw error;
  return data ?? [];
}

async function createImportBatch(totalRecords) {
  const { data, error } = await supabase.rpc("service_import_create_course_batch", {
    p_source_name: CURATED_SOURCE_NAME,
    p_source_label: "curated-seed-import",
    p_notes: `Curated seed import (${totalRecords} records)`,
  });
  if (error) throw error;
  return data;
}

async function beginImportBatch(batchId) {
  const { data, error } = await supabase.rpc("service_import_begin_course_batch", {
    p_batch_id: batchId,
  });
  if (error) throw error;
  return data;
}

async function finalizeImportBatch(batchId) {
  const { data, error } = await supabase.rpc("service_import_finalize_course_batch", {
    p_batch_id: batchId,
    p_status: "completed",
  });
  if (error) throw error;
  return data;
}

async function stageImportRecord(batchId, pipelineRecord, raw) {
  const { data, error } = await supabase.rpc("service_import_stage_course_record", {
    p_batch_id: batchId,
    p_source_name: CURATED_SOURCE_NAME,
    p_external_id: pipelineRecord.external_id,
    p_name: pipelineRecord.name,
    p_city: pipelineRecord.city,
    p_region: pipelineRecord.region,
    p_country: pipelineRecord.country,
    p_raw_payload: { ...pipelineRecord, raw },
  });
  if (error) throw error;
  return data;
}

async function processImportRecord(recordId) {
  const { data, error } = await supabase.rpc("service_import_process_course_record", {
    p_record_id: recordId,
  });
  if (error) throw error;
  return data;
}

async function applyCuratedPostImport(golfCourseId, pipelineRecord) {
  if (!supabase || !hasCuratedPostImportFields(pipelineRecord)) return;

  const update = buildCuratedPostImportUpdate(pipelineRecord);
  if (Object.keys(update).length === 0) return;

  const { error } = await supabase
    .from("golf_courses")
    .update({
      ...update,
      updated_at: new Date().toISOString(),
    })
    .eq("id", golfCourseId);

  if (error) throw error;
}

async function main() {
  const rawRecords = dedupeCuratedSeedRecords(await loadSeedRecords());
  const existingCourses = dryRun ? [] : await fetchExistingCourses();

  const summary = {
    loaded: rawRecords.length,
    staged: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    duplicate: 0,
    skipped: 0,
    error: 0,
    failures: [],
  };

  console.log(
    dryRun
      ? `DRY RUN — curated seed preview (${rawRecords.length} records)`
      : `Starting curated seed import (${rawRecords.length} records)…`,
  );

  let batch = null;
  if (!dryRun) {
    batch = await createImportBatch(rawRecords.length);
    batch = await beginImportBatch(batch.id);
    console.log(`Import batch ${batch.id}`);
  }

  for (const record of rawRecords) {
    try {
      const resolution = resolveCuratedImportExternalId(record, existingCourses);
      const pipelineRecord = applyCuratedDuplicateResolution(record, resolution);

      if (!pipelineRecord) {
        summary.skipped += 1;
        if (dryRun) {
          console.log(`[dry-run] skip duplicate: ${record.name} (${resolution.reason})`);
        }
        continue;
      }

      const validation = validateCuratedPipelineRecord(pipelineRecord);
      if (!validation.ok) {
        summary.error += 1;
        summary.failures.push(buildFailedRecordLog(pipelineRecord, validation.error));
        continue;
      }

      if (dryRun) {
        summary.staged += 1;
        console.log(
          `[dry-run] ${resolution.action} ${pipelineRecord.external_id} — ${record.name} (${resolution.reason})`,
        );
        continue;
      }

      const staged = await stageImportRecord(batch.id, pipelineRecord, record);
      summary.staged += 1;

      const processed = await processImportRecord(staged.id);
      summary.processed += 1;

      if (processed.status === "inserted") summary.inserted += 1;
      else if (processed.status === "updated") summary.updated += 1;
      else if (processed.status === "duplicate") summary.duplicate += 1;
      else if (processed.status === "error") {
        summary.error += 1;
        summary.failures.push(
          buildFailedRecordLog(pipelineRecord, processed.error_message ?? "Processing failed."),
        );
        continue;
      }

      if (processed.resulting_golf_course_id && hasCuratedPostImportFields(pipelineRecord)) {
        await applyCuratedPostImport(processed.resulting_golf_course_id, pipelineRecord);
      }
    } catch (error) {
      summary.error += 1;
      const message = error instanceof Error ? error.message : String(error);
      summary.failures.push({ name: record.name, error_message: message });
      console.error(`Failed curated row (${record.name}):`, message);
    }
  }

  if (!dryRun && batch) {
    batch = await finalizeImportBatch(batch.id);
    console.log("\nBatch summary");
    console.log(summarizeBatch(batch));
  }

  console.log("\nCurated import summary");
  console.log(`  Loaded:     ${summary.loaded}`);
  console.log(`  Staged:     ${summary.staged}`);
  console.log(`  Processed:  ${summary.processed}`);
  console.log(`  Inserted:   ${summary.inserted}`);
  console.log(`  Updated:    ${summary.updated}`);
  console.log(`  Duplicate:  ${summary.duplicate}`);
  console.log(`  Skipped:    ${summary.skipped}`);
  console.log(`  Errors:     ${summary.error}`);

  if (summary.failures.length > 0) {
    console.log("\nFailed records");
    for (const failure of summary.failures) {
      console.log(`  - ${failure.external_id ?? failure.name ?? "unknown"}: ${failure.error_message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
