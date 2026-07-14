#!/usr/bin/env node
/**
 * Apply a single SQL migration file to Supabase via the Management API.
 * Requires SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF in .env.local
 * OR uses direct postgres DATABASE_URL if set.
 *
 * Usage: node scripts/apply-migration.mjs supabase/migrations/057_golf_course_par_yardage.sql
 */
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
dotenv.config({ path: join(root, ".env.local") });

const migrationPath = process.argv[2];
if (!migrationPath) {
  console.error("Usage: node scripts/apply-migration.mjs <path-to-migration.sql>");
  process.exit(1);
}

const sql = await readFile(resolve(root, migrationPath), "utf8");
const projectRef =
  process.env.SUPABASE_PROJECT_REF ??
  (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "")
    .replace(/^https:\/\//, "")
    .replace(/\.supabase\.co.*$/, "");

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

async function applyViaManagementApi() {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Management API ${response.status}: ${body}`);
  }

  return body;
}

async function applyViaPostgres() {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function verifyColumns() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("golf_courses")
    .select("par, yardage")
    .limit(1);

  if (error) return { ok: false, error: error.message };
  return { ok: true, sample: data?.[0] ?? null };
}

console.log(`Applying migration: ${migrationPath}`);

try {
  if (databaseUrl) {
    console.log("Using DATABASE_URL…");
    await applyViaPostgres();
  } else if (accessToken && projectRef) {
    console.log(`Using Management API for project ${projectRef}…`);
    await applyViaManagementApi();
  } else {
    console.error(
      "Set DATABASE_URL or SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF in .env.local",
    );
    process.exit(1);
  }

  const verification = await verifyColumns();
  if (verification?.ok) {
    console.log("Migration applied. golf_courses.par/yardage columns verified.");
  } else if (verification) {
    console.warn("Migration ran but column verification failed:", verification.error);
  } else {
    console.log("Migration applied (verification skipped — no service role key).");
  }
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
