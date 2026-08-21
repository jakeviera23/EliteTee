#!/usr/bin/env node
/**
 * Local / CI preflight for EAS preview builds.
 * Does not print or write secret values — only validates presence/shape.
 */

const PLACEHOLDER_VALUES = new Set([
  "undefined",
  "null",
  "your_supabase_url",
  "your-project.supabase.co",
  "your_anon_key",
  "your_supabase_anon_key",
]);

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidSupabaseUrl(url) {
  if (!url || PLACEHOLDER_VALUES.has(url.toLowerCase())) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidAnonKey(key) {
  if (!key || PLACEHOLDER_VALUES.has(key.toLowerCase())) return false;
  return key.length >= 20;
}

const url = normalize(process.env.EXPO_PUBLIC_SUPABASE_URL);
const anonKey = normalize(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const missing = [];
if (!isValidSupabaseUrl(url)) missing.push("EXPO_PUBLIC_SUPABASE_URL");
if (!isValidAnonKey(anonKey)) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");

if (missing.length > 0) {
  console.error(
    [
      "Preview env preflight failed.",
      `Missing or invalid: ${missing.join(", ")}`,
      "Set these in your shell or EAS project env/secrets before `eas build --profile preview`.",
      "Do not commit .env files with secrets.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Preview env preflight OK (EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY).");
