#!/usr/bin/env node
/**
 * Dry-run readiness check for sandbox notify-admin-safety.
 * Does NOT deploy, does NOT set secrets, does NOT print secret values.
 *
 * Usage:
 *   node scripts/prepare-notify-admin-safety-sandbox.mjs
 *
 * After you set Resend secrets and approve deploy:
 *   npx supabase functions deploy notify-admin-safety --project-ref zbjcdegqqtbgrnfbwbmf
 *   # then submit a sandbox report and confirm email_notified_at + inbox delivery
 */

import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SANDBOX = "zbjcdegqqtbgrnfbwbmf";
const PROD = "nbacvtscjhdvwggbecbz";
const FUNCTION_NAME = "notify-admin-safety";

const REQUIRED_SECRET_NAMES = [
  "RESEND_API_KEY",
  "ADMIN_NOTIFY_FROM_EMAIL", // or RESEND_FROM_EMAIL
  "ADMIN_NOTIFY_EMAILS",
];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

function present(value) {
  return Boolean(value && String(value).trim());
}

function main() {
  const env = {
    ...loadEnvFile(resolve(".env.sandbox.local")),
    ...loadEnvFile(resolve(".env.sandbox.g12-qa.local")),
    ...process.env,
  };

  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
  if (!url.includes(SANDBOX)) {
    console.error(`Refusing: VITE_SUPABASE_URL is not sandbox ${SANDBOX}`);
    process.exit(1);
  }
  if (url.includes(PROD)) {
    console.error("Refusing: production project detected");
    process.exit(1);
  }

  console.log("=== notify-admin-safety sandbox readiness (dry-run) ===");
  console.log(`project: ${SANDBOX}`);
  console.log(`function: ${FUNCTION_NAME}`);
  console.log("");

  // Local env (never print values)
  console.log("Local env files (.env.sandbox*):");
  for (const key of [
    "RESEND_API_KEY",
    "ADMIN_NOTIFY_FROM_EMAIL",
    "RESEND_FROM_EMAIL",
    "ADMIN_NOTIFY_EMAILS",
    "VITE_ADMIN_EMAILS",
  ]) {
    console.log(`  ${key}: ${present(env[key]) ? "SET" : "MISSING"}`);
  }

  // Supabase function secrets (names only via CLI)
  console.log("\nSupabase Edge Function secrets (sandbox, names only):");
  const secretsProc = spawnSync(
    "npx",
    ["supabase", "secrets", "list", "--project-ref", SANDBOX, "-o", "json"],
    { encoding: "utf8", shell: false },
  );
  let secretNames = [];
  if (secretsProc.status === 0) {
    try {
      const parsed = JSON.parse(secretsProc.stdout);
      const list = Array.isArray(parsed) ? parsed : parsed.secrets || [];
      secretNames = list.map((s) => s.name).filter(Boolean);
    } catch {
      console.log("  (could not parse secrets list JSON)");
    }
  } else {
    console.log("  (CLI secrets list failed — are you logged into supabase?)");
  }

  const has = (name) => secretNames.includes(name);
  const fromConfigured = has("ADMIN_NOTIFY_FROM_EMAIL") || has("RESEND_FROM_EMAIL");
  console.log(`  RESEND_API_KEY: ${has("RESEND_API_KEY") ? "PRESENT" : "MISSING"}`);
  console.log(
    `  ADMIN_NOTIFY_FROM_EMAIL|RESEND_FROM_EMAIL: ${fromConfigured ? "PRESENT" : "MISSING"}`,
  );
  console.log(`  ADMIN_NOTIFY_EMAILS: ${has("ADMIN_NOTIFY_EMAILS") ? "PRESENT" : "MISSING"}`);
  console.log(
    `  SUPABASE_SERVICE_ROLE_KEY (platform): ${has("SUPABASE_SERVICE_ROLE_KEY") ? "PRESENT" : "MISSING"}`,
  );

  // Function deployed?
  console.log("\nFunction HTTP probe:");
  // async probe below
  return { url, env, secretNames, fromConfigured, has };
}

const state = main();

const anon = state.env.VITE_SUPABASE_ANON_KEY || state.env.SUPABASE_ANON_KEY;
const client = createClient(state.url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const probe = await fetch(`${state.url}/functions/v1/${FUNCTION_NAME}`, {
  method: "OPTIONS",
  headers: { apikey: anon },
});
console.log(`  OPTIONS status: ${probe.status} ${probe.status === 404 ? "(NOT DEPLOYED)" : ""}`);

const { count: pendingCount } = await client
  .from("admin_safety_alerts")
  .select("id", { count: "exact", head: true })
  .is("email_notified_at", null);
const { count: emailedCount } = await client
  .from("admin_safety_alerts")
  .select("id", { count: "exact", head: true })
  .not("email_notified_at", "is", null);

console.log("\nAlert email state (sandbox):");
console.log(`  pending email_notified_at: ${pendingCount ?? "n/a"}`);
console.log(`  emailed: ${emailedCount ?? "n/a"}`);

const readySecrets =
  state.has("RESEND_API_KEY") &&
  (state.has("ADMIN_NOTIFY_FROM_EMAIL") || state.has("RESEND_FROM_EMAIL")) &&
  state.has("ADMIN_NOTIFY_EMAILS");
const deployed = probe.status !== 404;

console.log("\n=== Verdict ===");
console.log(`secrets ready: ${readySecrets ? "YES" : "NO"}`);
console.log(`function deployed: ${deployed ? "YES" : "NO"}`);
console.log(`sandbox deploy approved by this script: NO (dry-run only)`);

console.log("\nManual next steps (when you approve):");
console.log("1. Create/login Resend; for sandbox you may use onboarding@resend.dev → your Resend account email");
console.log("   OR verify elitetee.club (or a send subdomain) and use e.g. safety@elitetee.club");
console.log("2. Set sandbox secrets (values never committed):");
console.log("   npx supabase secrets set --project-ref zbjcdegqqtbgrnfbwbmf \\");
console.log('     RESEND_API_KEY="..." \\');
console.log('     ADMIN_NOTIFY_FROM_EMAIL="..." \\');
console.log('     ADMIN_NOTIFY_EMAILS="you@example.com"');
console.log("3. Deploy function:");
console.log(
  `   npx supabase functions deploy ${FUNCTION_NAME} --project-ref ${SANDBOX}`,
);
console.log("4. Submit a sandbox report as Member A; confirm:");
console.log("   - email arrives");
console.log("   - admin_safety_alerts.email_notified_at is set");
console.log("   - Moderation panel still shows the alert until acknowledged");

if (!readySecrets || !deployed) {
  process.exitCode = 2;
}
