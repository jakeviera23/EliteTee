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
  club_logo_url: string | null;
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
    founding_member_number: row.founding_member_number
      ? String(row.founding_member_number)
      : null,
    portal_access_enabled: Boolean(row.portal_access_enabled),
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

export type AdminDashboardCounts = {
  profilesCreated: number;
  approvedMembers: number;
};

export type AdminMemberRow = {
  id: string;
  full_name: string;
  email: string;
  primary_club: string;
  based_in: string;
  membership_status: string;
  is_verified: boolean;
  founding_member_number: string | null;
  portal_access_enabled: boolean;
  created_at: string;
  user_id: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

function isMissingTravelingToColumnError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return isMissingColumnError(error) && message.includes("traveling");
}

export function isMissingColumnError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("column") &&
    (message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("unknown column"))
  );
}

export function isRlsError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);
  return (
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("violates row-level security")
  );
}

export function formatAdminError(error: unknown) {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();
  const code = getErrorCode(error);

  if (lower.includes("must be a valid uuid") || (lower.includes("uuid") && lower.includes("valid"))) {
    return "Supabase Auth User UID must be a valid UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).";
  }

  if (lower.includes("duplicate") || lower.includes("unique") || code === "23505") {
    return "A member profile with this email already exists.";
  }

  if (isRlsError(error)) {
    return "Permission denied. Confirm your admin email is listed in Supabase RLS policies for member_profiles and users.";
  }

  if (isMissingColumnError(error)) {
    return "Database schema mismatch: a column may be missing from member_profiles. Check Supabase migrations.";
  }

  if (lower.includes("supabase is not configured")) {
    return "Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
  }

  if (lower.includes("no member profile found for that email")) {
    return "No member profile found for that email. Create a profile first or check the spelling.";
  }

  if (lower.includes("auth user uid is required")) {
    return "Supabase Auth User UID is required before creating a member profile.";
  }

  return message;
}

export async function fetchAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  if (!supabase) {
    return { profilesCreated: 0, approvedMembers: 0 };
  }

  const [totalResult, approvedResult] = await Promise.all([
    supabase.from("member_profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("member_profiles")
      .select("*", { count: "exact", head: true })
      .or(
        "membership_status.ilike.%founding%,membership_status.ilike.%verified%,membership_status.ilike.%approved%,membership_status.ilike.%active%",
      ),
  ]);

  return {
    profilesCreated: totalResult.error ? 0 : totalResult.count ?? 0,
    approvedMembers: approvedResult.error ? 0 : approvedResult.count ?? 0,
  };
}

export async function fetchRecentMemberProfilesForAdmin(limit = 10) {
  if (!supabase) {
    return { data: [] as AdminMemberRow[], error: null };
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .select(
      "id, full_name, email, primary_club, based_in, membership_status, is_verified, founding_member_number, portal_access_enabled, created_at, user_id",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [] as AdminMemberRow[], error };
  }

  return {
    data: (data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      full_name: String(row.full_name ?? ""),
      email: String(row.email ?? ""),
      primary_club: String(row.primary_club ?? ""),
      based_in: String(row.based_in ?? ""),
      membership_status: String(row.membership_status ?? ""),
      is_verified: Boolean(row.is_verified),
      founding_member_number: row.founding_member_number
        ? String(row.founding_member_number)
        : null,
      portal_access_enabled: Boolean(row.portal_access_enabled),
      created_at: String(row.created_at ?? ""),
      user_id: row.user_id ? String(row.user_id) : null,
    })),
    error: null,
  };
}

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

  const insertPayload = {
    ...record,
    email: record.email.trim().toLowerCase(),
    user_id: authUserId,
  };

  let { data, error } = await supabase
    .from("member_profiles")
    .insert(insertPayload)
    .select("id")
    .single();

  let travelingToSkipped = false;

  if (error && isMissingTravelingToColumnError(error)) {
    const { traveling_to: _travelingTo, ...payloadWithoutTravelingTo } = insertPayload;
    const retry = await supabase
      .from("member_profiles")
      .insert(payloadWithoutTravelingTo)
      .select("id")
      .single();

    if (!retry.error) {
      data = retry.data;
      error = null;
      travelingToSkipped = true;
    } else {
      error = retry.error;
    }
  }

  return { data, error, travelingToSkipped };
}

export type ApprovalMemberProfileInsert = Omit<MemberProfileInsert, "user_id"> & {
  user_id?: string | null;
  founding_member_number: string;
  portal_access_enabled: boolean;
};

export async function createMemberProfileFromApproval(record: ApprovalMemberProfileInsert) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const authUserId = record.user_id?.trim() || null;

  if (authUserId) {
    if (!isValidAuthUserId(authUserId)) {
      return { data: null, error: new Error("Supabase Auth User UID must be a valid UUID.") };
    }

    const { error: userError } = await upsertPublicUser({
      id: authUserId,
      email: record.email,
    });

    if (userError) {
      return { data: null, error: userError };
    }
  }

  const insertPayload = {
    ...record,
    email: record.email.trim().toLowerCase(),
    user_id: authUserId,
  };

  let { data, error } = await supabase
    .from("member_profiles")
    .insert(insertPayload)
    .select("id")
    .single();

  let travelingToSkipped = false;

  if (error && isMissingTravelingToColumnError(error)) {
    const { traveling_to: _travelingTo, ...payloadWithoutTravelingTo } = insertPayload;
    const retry = await supabase
      .from("member_profiles")
      .insert(payloadWithoutTravelingTo)
      .select("id")
      .single();

    if (!retry.error) {
      data = retry.data;
      error = null;
      travelingToSkipped = true;
    } else {
      error = retry.error;
    }
  }

  if (error) {
    return { data: null, error };
  }

  return { data, error: null, travelingToSkipped };
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
    return { error: new Error(formatAdminError(error)) };
  }

  if (!data) {
    return { error: new Error("No member profile found for that email.") };
  }

  return { data, error: null };
}

export async function fetchMemberPortalAccess() {
  if (!supabase) {
    return { hasAccess: false, profile: null, error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();

  if (sessionError || !userId) {
    return { hasAccess: false, profile: null, error: sessionError };
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .select("id, portal_access_enabled, membership_status, founding_member_number")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { hasAccess: false, profile: null, error: error ?? null };
  }

  return {
    hasAccess: Boolean(data.portal_access_enabled),
    profile: data,
    error: null,
  };
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

export async function fetchDiscoverablePortalMembers() {
  if (!supabase) {
    return { data: [] as MemberProfileRecord[], error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .select(
      `
      id,
      full_name,
      primary_club,
      additional_clubs,
      based_in,
      regions,
      industry,
      golf_interests,
      business_interests,
      current_request,
      traveling_to,
      club_logo_url,
      membership_status,
      is_verified,
      founding_member_number,
      portal_access_enabled,
      user_id,
      created_at,
      updated_at
    `,
    )
    .eq("portal_access_enabled", true)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[fetchDiscoverablePortalMembers] Supabase error", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { data: [] as MemberProfileRecord[], error };
  }

  return {
    data: (data ?? []).map((row) =>
      normalizeMemberProfileRecord({ ...row, email: "" } as Record<string, unknown>),
    ),
    error: null,
  };
}
