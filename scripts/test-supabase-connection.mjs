import dotenv from "dotenv";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const envPath = join(root, ".env.local");

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error(`Failed to load ${envPath}:`, result.error.message);
  process.exit(1);
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const { data, error } = await supabase.auth.getSession();

if (error) {
  console.error("Supabase connection failed:", error.message);
  process.exit(1);
}

console.log("Supabase connection OK");
console.log(`URL: ${url}`);
console.log(`Session: ${data.session ? "active" : "none (expected without auth)"}`);
