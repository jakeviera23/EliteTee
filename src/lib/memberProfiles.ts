import type { MemberProfileInsert, MemberProfileRecord } from "../types/memberProfileRecord";
import {
  AUTH_USER_ID_LINKING_NOTE,
  getCurrentAuthUserId,
  isValidAuthUserId,
  upsertPublicUser,
} from "./authUserLinking";
import { supabase } from "./supabase";

export type MemberProfileSelfUpdate = {
  full_name: string;
  primary_club: string;
  based_in: string;
  industry: string;
  additional_clubs: string[];
  regions: string[];
  golf_interests: string[];
  business_interests: string[];
  current_request: string;
  traveling_to: string;
};

function parsePostgresArrayString(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "{}") return [];

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];

    const items: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < inner.length; index += 1) {
      const char = inner[index];

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === "," && !inQuotes) {
        const item = current.trim();
        if (item) items.push(item);
        current = "";
        continue;
      }

      current += char;
    }

    const lastItem = current.trim();
    if (lastItem) items.push(lastItem);
    return items;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    // Fall through to comma/newline parsing.
  }

  return parseListInput(trimmed);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return parsePostgresArrayString(value);
  }

  return [];
}

export function coerceProfileStringList(value: unknown): string[] {
  return asStringArray(value);
}

export function displayProfileText(value: unknown, fallback = "Not specified") {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();
  return text || fallback;
}

export function normalizeMemberProfileRecord(row: Record<string, unknown>): MemberProfileRecord {
  return {
    id: String(row.id ?? ""),
    full_name: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    primary_club: String(row.primary_club ?? ""),
    additional_clubs: asStringArray(row.additional_clubs),
    based_in: String(row.based_in ?? ""),
    regions: asStringArray(row.regions),
    industry: String(row.industry ?? ""),
    golf_interests: asStringArray(row.golf_interests),
    business_interests: asStringArray(row.business_interests),
    current_request: String(row.current_request ?? ""),
    traveling_to: String(row.traveling_to ?? ""),
    club_logo_url: row.club_logo_url ? String(row.club_logo_url) : null,
    membership_status: String(row.membership_status ?? ""),
    is_verified: Boolean(row.is_verified),
    user_id: row.user_id ? String(row.user_id) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function parseListInput(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildListFieldUpdate({
  formValue,
  initialFormValue,
  existingValues,
}: {
  formValue: string;
  initialFormValue: string;
  existingValues: string[];
}) {
  if (formValue.trim() === initialFormValue.trim()) {
    return existingValues;
  }

  if (!formValue.trim()) {
    return [];
  }

  return parseListInput(formValue);
}

export function buildTextFieldUpdate({
  formValue,
  initialFormValue,
  existingValue,
}: {
  formValue: string;
  initialFormValue: string;
  existingValue: string;
}) {
  if (formValue.trim() === initialFormValue.trim()) {
    return existingValue;
  }

  return formValue.trim();
}

export function formatListForInput(value: string[] | null | undefined | unknown) {
  return asStringArray(value).join("\n");
}

export { AUTH_USER_ID_LINKING_NOTE };

export async function createMemberProfile(record: MemberProfileInsert) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const authUserId = record.user_id?.trim();
  if (!authUserId) {
    return {
      error: new Error(
        "Supabase Auth User UID is required. It must match public.users.id and member_profiles.user_id.",
      ),
    };
  }

  if (!isValidAuthUserId(authUserId)) {
    return { error: new Error("Supabase Auth User UID must be a valid UUID.") };
  }

  const { error: userError } = await upsertPublicUser({
    id: authUserId,
    email: record.email,
  });

  if (userError) {
    return { error: userError };
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .insert({
      ...record,
      email: record.email.trim().toLowerCase(),
      user_id: authUserId,
    })
    .select("id")
    .single();

  return { data, error };
}

export async function linkMemberProfileToAuthUser({
  email,
  authUserId,
}: {
  email: string;
  authUserId: string;
}) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedAuthUserId = authUserId.trim();

  if (!isValidAuthUserId(normalizedAuthUserId)) {
    return { error: new Error("Supabase Auth User UID must be a valid UUID.") };
  }

  const { error: userError } = await upsertPublicUser({
    id: normalizedAuthUserId,
    email: normalizedEmail,
  });

  if (userError) {
    return { error: userError };
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .update({ user_id: normalizedAuthUserId })
    .eq("email", normalizedEmail)
    .select("id, full_name")
    .maybeSingle();

  if (error) {
    return { error };
  }

  if (!data) {
    return { error: new Error("No member profile found for that email.") };
  }

  return { data, error: null };
}

export async function fetchOwnMemberProfile() {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();

  if (sessionError) {
    return { data: null, error: sessionError };
  }

  if (!userId) {
    return { data: null, error: new Error("You must be signed in to view your profile.") };
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    const isRlsError =
      error.code === "42501" ||
      error.message.toLowerCase().includes("row-level security") ||
      error.message.toLowerCase().includes("permission denied");

    return {
      data: null,
      error: isRlsError
        ? new Error(
            `Unable to load your member profile for auth user ${userId}. Database read permissions may need to be updated.`,
          )
        : error,
    };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: normalizeMemberProfileRecord(data as Record<string, unknown>), error: null };
}

export async function updateOwnMemberProfile(updates: MemberProfileSelfUpdate) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();

  if (sessionError) {
    return { data: null, error: sessionError };
  }

  if (!userId) {
    return { data: null, error: new Error("You must be signed in to update your profile.") };
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return {
      data: null,
      error: new Error("Your member profile could not be updated. It may not be linked to your login yet."),
    };
  }

  return { data: normalizeMemberProfileRecord(data as Record<string, unknown>), error: null };
}

export async function fetchMemberProfiles() {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  // Requires RLS policy "Members can read verified profiles" (see migration 010).
  // Query intentionally returns all verified members — no per-user filter here.
  const { data, error } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("is_verified", true)
    .order("full_name", { ascending: true });

  return { data: (data ?? []).map((row) => normalizeMemberProfileRecord(row as Record<string, unknown>)), error };
}
