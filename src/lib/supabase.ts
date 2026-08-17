import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { captureAuthCallbackFromLocation } from "./authCallbackParams";

const PLACEHOLDER_VALUES = new Set([
  "undefined",
  "null",
  "your_supabase_url",
  "your-project.supabase.co",
  "your_supabase_anon_key",
]);

function normalizeEnv(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidSupabaseUrl(url: string): boolean {
  if (!url || PLACEHOLDER_VALUES.has(url.toLowerCase())) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidAnonKey(key: string): boolean {
  if (!key || PLACEHOLDER_VALUES.has(key.toLowerCase())) return false;
  return key.length >= 20;
}

if (typeof window !== "undefined") {
  captureAuthCallbackFromLocation(window.location.href);
}

const supabaseUrl = normalizeEnv(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const isSupabaseConfigured =
  isValidSupabaseUrl(supabaseUrl) && isValidAnonKey(supabaseAnonKey);

function createSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    console.warn(
      "Supabase is not configured. Missing or invalid VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Member login is disabled.",
    );
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: "implicit",
      },
    });
  } catch (error) {
    console.warn("Supabase client failed to initialize. Member login is disabled.", error);
    return null;
  }
}

export const supabase: SupabaseClient | null = createSupabaseClient();
