#!/usr/bin/env node
/**
 * Server-side staged golf course import for EliteTee.
 *
 * Flow:
 *   create import batch → fetch provider/fixture records → normalize → stage records
 *   → process records (duplicate detection + draft inserts) → finalize batch
 *
 * NEVER use VITE_* variables for provider or service-role secrets.
 *
 * Required for live runs (not --dry-run):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Data source (one of):
 *   --fixture=path/to.json     Local JSON array (no provider required)
 *   GOLF_COURSE_PROVIDER_URL + GOLF_COURSE_PROVIDER_API_KEY when a provider is connected
 *
 * Usage:
 *   node scripts/import-golf-courses.mjs --dry-run --fixture=scripts/fixtures/golf-courses-sample.json
 *   node scripts/import-golf-courses.mjs --fixture=scripts/fixtures/golf-courses-sample.json --provider=fixture_provider
 *   node scripts/import-golf-courses.mjs --max-pages=5 --provider=my_provider
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  buildFailedRecordLog,
  normalizeProviderCourse,
  summarizeBatch,
  validateImportRecord,
} from "./lib/courseImportShared.mjs";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
dotenv.config({ path: join(root, ".env.local") });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const maxPagesArg = args.find((arg) => arg.startsWith("--max-pages="));
const maxPages = maxPagesArg ? Number(maxPagesArg.split("=")[1]) : Infinity;
const providerArg = args.find((arg) => arg.startsWith("--provider="));
const fixtureArg = args.find((arg) => arg.startsWith("--fixture="));

const providerName =
  providerArg?.split("=")[1]?.trim() ||
  process.env.GOLF_COURSE_PROVIDER_NAME ||
  "external_provider";
const fixturePath = fixtureArg ? fixtureArg.split("=")[1] : null;

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const providerUrl = process.env.GOLF_COURSE_PROVIDER_URL;
const providerApiKey = process.env.GOLF_COURSE_PROVIDER_API_KEY;
const pageSize = Number(process.env.GOLF_COURSE_PROVIDER_PAGE_SIZE ?? 100);
const rateMs = Number(process.env.GOLF_COURSE_PROVIDER_RATE_MS ?? 500);

if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
  console.error("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Set these in .env.local (do NOT prefix the service role key with VITE_).");
  process.exit(1);
}

if (!fixturePath && (!providerUrl || !providerApiKey)) {
  console.error("No data source configured.");
  console.error("Use --fixture=path/to.json for local staged imports, or configure:");
  console.error("  GOLF_COURSE_PROVIDER_URL");
  console.error("  GOLF_COURSE_PROVIDER_API_KEY");
  console.error("See docs/golf-course-import.md for integration steps.");
  process.exit(1);
}

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

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

async function loadFixtureRows() {
  const resolvedPath = join(root, fixturePath);
  const raw = await readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Fixture must be a JSON array: ${resolvedPath}`);
  }
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createImportBatch() {
  const { data, error } = await supabase.rpc("service_import_create_course_batch", {
    p_source_name: providerName,
    p_source_label: fixturePath ? `fixture:${fixturePath}` : null,
    p_notes: dryRun ? null : "Staged import via scripts/import-golf-courses.mjs",
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

async function finalizeImportBatch(batchId, status = "completed") {
  const { data, error } = await supabase.rpc("service_import_finalize_course_batch", {
    p_batch_id: batchId,
    p_status: status,
  });
  if (error) throw error;
  return data;
}

async function stageImportRecord(batchId, normalized, raw) {
  const { data, error } = await supabase.rpc("service_import_stage_course_record", {
    p_batch_id: batchId,
    p_source_name: providerName,
    p_external_id: normalized.external_id,
    p_name: normalized.name,
    p_city: normalized.city,
    p_region: normalized.region,
    p_country: normalized.country,
    p_raw_payload: { ...normalized, raw },
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

async function processRows(rows, handlers) {
  const summary = {
    staged: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    duplicate: 0,
    error: 0,
    skipped: 0,
    failures: [],
  };

  for (const raw of rows) {
    try {
      const normalized = normalizeProviderCourse(raw, providerName);
      if (!normalized) {
        summary.skipped += 1;
        continue;
      }

      const validation = validateImportRecord(normalized);
      if (!validation.ok) {
        summary.error += 1;
        summary.failures.push(buildFailedRecordLog(normalized, validation.error));
        if (dryRun) {
          console.log(`[dry-run] error: ${validation.error}`, normalized.external_id ?? normalized.name);
        } else if (handlers.onInvalid) {
          const processed = await handlers.onInvalid(normalized, validation.error);
          summary.processed += 1;
          if (processed?.status === "error") {
            summary.failures.push(
              buildFailedRecordLog(normalized, processed.error_message ?? validation.error),
            );
          }
        }
        continue;
      }

      if (dryRun) {
        summary.staged += 1;
        console.log(
          `[dry-run] would stage + process ${normalized.external_id} (${normalized.name}, ${normalized.country})`,
        );
        continue;
      }

      const staged = await handlers.onStage(normalized, raw);
      summary.staged += 1;

      const processed = await handlers.onProcess(staged.id);
      summary.processed += 1;

      if (processed.status === "inserted") summary.inserted += 1;
      else if (processed.status === "updated") summary.updated += 1;
      else if (processed.status === "duplicate") summary.duplicate += 1;
      else if (processed.status === "error") {
        summary.error += 1;
        summary.failures.push(
          buildFailedRecordLog(normalized, processed.error_message ?? "Processing failed."),
        );
      }
    } catch (error) {
      summary.error += 1;
      const message = error instanceof Error ? error.message : String(error);
      summary.failures.push({ raw, error_message: message });
      console.error("Failed row:", message);
    }
  }

  return summary;
}

async function main() {
  const pageSummary = {
    staged: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    duplicate: 0,
    error: 0,
    skipped: 0,
    failures: [],
  };

  console.log(
    dryRun
      ? "DRY RUN — validate and preview only (no database writes)"
      : `Starting staged golf course import (${providerName})…`,
  );

  let batch = null;
  const handlers = {
    onStage: async (normalized, raw) => stageImportRecord(batch.id, normalized, raw),
    onProcess: async (recordId) => processImportRecord(recordId),
    onInvalid: async (normalized, errorMessage) => {
      const staged = await stageImportRecord(batch.id, normalized, normalized);
      return processImportRecord(staged.id);
    },
  };

  if (!dryRun) {
    batch = await createImportBatch();
    batch = await beginImportBatch(batch.id);
    console.log(`Import batch ${batch.id} (${batch.status})`);
  }

  if (fixturePath) {
    const rows = await loadFixtureRows();
    const summary = await processRows(rows, handlers);
    Object.keys(summary).forEach((key) => {
      if (key === "failures") {
        pageSummary.failures.push(...summary.failures);
        return;
      }
      pageSummary[key] += summary[key];
    });
    console.log(`Fixture: processed ${rows.length} rows from ${fixturePath}`);
  } else {
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const { rows, hasMore: more } = await fetchProviderPage(page);
      hasMore = more;

      const summary = await processRows(rows, handlers);
      Object.keys(summary).forEach((key) => {
        if (key === "failures") {
          pageSummary.failures.push(...summary.failures);
          return;
        }
        pageSummary[key] += summary[key];
      });

      console.log(`Page ${page}: fetched ${rows.length} rows`);
      page += 1;
      if (hasMore) await sleep(rateMs);
    }
  }

  if (!dryRun && batch) {
    batch = await finalizeImportBatch(batch.id, "completed");
    console.log("\nBatch summary");
    console.log(summarizeBatch(batch));
  }

  console.log("\nImport summary");
  console.log(`  Staged:     ${pageSummary.staged}`);
  console.log(`  Processed:  ${pageSummary.processed}`);
  console.log(`  Inserted:   ${pageSummary.inserted}`);
  console.log(`  Updated:    ${pageSummary.updated}`);
  console.log(`  Duplicate:  ${pageSummary.duplicate}`);
  console.log(`  Errors:     ${pageSummary.error}`);
  console.log(`  Skipped:    ${pageSummary.skipped}`);

  if (pageSummary.failures.length > 0) {
    console.log("\nFailed records");
    for (const failure of pageSummary.failures) {
      console.log(`  - ${failure.external_id ?? failure.name ?? "unknown"}: ${failure.error_message}`);
    }
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
