const PLACEHOLDER_VALUES = new Set([
  "undefined",
  "null",
  "your_supabase_url",
  "your-project.supabase.co",
  "your_anon_key",
  "your_supabase_anon_key",
]);

function normalizeEnv(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidSupabaseUrl(url: string): boolean {
  if (!url || PLACEHOLDER_VALUES.has(url.toLowerCase())) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isValidAnonKey(key: string): boolean {
  if (!key || PLACEHOLDER_VALUES.has(key.toLowerCase())) return false;
  return key.length >= 20;
}

export function getSupabaseUrl(): string {
  return normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
}

export const isSupabaseConfigured =
  isValidSupabaseUrl(getSupabaseUrl()) && isValidAnonKey(getSupabaseAnonKey());

export function getSiteUrl(): string {
  const configured = normalizeEnv(process.env.EXPO_PUBLIC_SITE_URL);
  return configured || "https://www.elitetee.club";
}
