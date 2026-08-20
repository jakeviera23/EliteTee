import { requireSupabase } from "../supabase";
import { coerceProfileStringList, extractRpcProfileRow } from "../memberProfileParse";
import { resolveMemberMediaUrlMap } from "./memberProfileMedia";
import type { MobileMemberProfile, MobileMemberProfileUpdate, PortalAccessState } from "@/types/member";

function asStringArray(value: unknown): string[] {
  return coerceProfileStringList(value);
}

export function normalizeMemberProfile(row: Record<string, unknown>): MobileMemberProfile {
  return {
    id: String(row.id ?? ""),
    user_id: row.user_id ? String(row.user_id) : null,
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
    handicap: String(row.handicap ?? ""),
    bucket_list_course_ids: asStringArray(row.bucket_list_course_ids),
    club_logo_url: row.club_logo_url ? String(row.club_logo_url) : null,
    cover_photo_url: row.cover_photo_url ? String(row.cover_photo_url) : null,
    membership_status: String(row.membership_status ?? ""),
    is_verified: Boolean(row.is_verified),
    founding_member_number: row.founding_member_number
      ? String(row.founding_member_number)
      : null,
    portal_access_enabled: Boolean(row.portal_access_enabled),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function getCurrentUserId() {
  if (cachedCurrentUserId !== undefined) {
    return { userId: cachedCurrentUserId, error: null };
  }

  const client = requireSupabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    return { userId: null, error };
  }

  cachedCurrentUserId = user?.id ?? null;
  return { userId: cachedCurrentUserId, error: null };
}

let cachedCurrentUserId: string | null | undefined;

export function clearCurrentUserIdCache() {
  cachedCurrentUserId = undefined;
}

export async function fetchPortalAccess(): Promise<{
  data: PortalAccessState | null;
  error: Error | null;
}> {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in.") };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("member_profiles")
    .select("portal_access_enabled, membership_status, founding_member_number")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      data: { hasAccess: false, membershipStatus: null, foundingMemberNumber: null },
      error: error ?? null,
    };
  }

  return {
    data: {
      hasAccess: Boolean(data.portal_access_enabled),
      membershipStatus: data.membership_status ? String(data.membership_status) : null,
      foundingMemberNumber: data.founding_member_number
        ? String(data.founding_member_number)
        : null,
    },
    error: null,
  };
}

export async function fetchOwnProfile(): Promise<{
  data: MobileMemberProfile | null;
  error: Error | null;
}> {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in.") };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("member_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: normalizeMemberProfile(data as Record<string, unknown>), error: null };
}

export async function updateOwnProfile(updates: MobileMemberProfileUpdate) {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in.") };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("member_profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error ?? new Error("Profile could not be updated.") };
  }

  return { data: normalizeMemberProfile(data as Record<string, unknown>), error: null };
}

const DISCOVER_SELECT =
  "id, user_id, full_name, primary_club, additional_clubs, based_in, industry, golf_interests, business_interests, current_request, traveling_to, club_logo_url, founding_member_number, is_verified, portal_access_enabled, membership_status, created_at, updated_at";

export async function fetchDiscoverableMembers(): Promise<{
  data: MobileMemberProfile[];
  error: Error | null;
}> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("member_profiles")
    .select(DISCOVER_SELECT)
    .eq("portal_access_enabled", true)
    .order("full_name", { ascending: true });

  if (error) {
    return { data: [], error };
  }

  const members = (data ?? []).map((row) =>
    normalizeMemberProfile({ ...(row as Record<string, unknown>), email: "" }),
  );

  const avatarPaths = members.map((member) => member.club_logo_url);
  const resolvedAvatars = await resolveMemberMediaUrlMap(avatarPaths);

  return {
    data: members.map((member) => {
      const stored = member.club_logo_url?.trim() ?? "";
      if (!stored) return member;
      const resolved = resolvedAvatars.get(stored);
      return resolved ? { ...member, club_logo_url: resolved } : member;
    }),
    error: null,
  };
}

const PORTAL_MEMBER_SELECT =
  "id, user_id, full_name, primary_club, additional_clubs, based_in, regions, industry, golf_interests, business_interests, current_request, traveling_to, club_logo_url, cover_photo_url, membership_status, is_verified, founding_member_number, portal_access_enabled, created_at, updated_at";

export async function fetchMemberByUserId(userId: string) {
  const client = requireSupabase();
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return { data: null, error: new Error("Member profile is unavailable.") };
  }

  const { data, error } = await client.rpc("get_portal_member_profile", {
    p_user_id: normalizedUserId,
  });

  if (!error) {
    const row = extractRpcProfileRow(data);
    if (row) {
      return {
        data: normalizeMemberProfile({ ...row, email: "" }),
        error: null,
      };
    }
  }

  const { data: tableRow, error: tableError } = await client
    .from("member_profiles")
    .select(PORTAL_MEMBER_SELECT)
    .eq("user_id", normalizedUserId)
    .eq("portal_access_enabled", true)
    .maybeSingle();

  if (tableError) {
    return { data: null, error: tableError };
  }

  if (!tableRow) {
    return { data: null, error: error ?? null };
  }

  return {
    data: normalizeMemberProfile({ ...(tableRow as Record<string, unknown>), email: "" }),
    error: null,
  };
}
