import type { AiAdminDashboard } from "../types/askEliteTee";
import type { MembershipApplicationRecord } from "../types/membershipApplication";
import type { AdminMemberRow } from "./memberProfiles";
import { supabase } from "./supabase";

export type InviteMetrics = {
  awaitingRedemption: number;
  redeemed: number;
  missingLink: number;
};

export type AdminOverviewMetrics = {
  pendingApplications: number;
  approvedMembers: number;
  profilesCreated: number;
  portalActiveMembers: number | null;
  invitesAwaiting: number;
  invitesRedeemed: number;
  needsAttention: number;
  askQueriesToday: number | null;
  askQueries7d: number | null;
  aiFailures7d: number | null;
};

export type MemberOperationalState = "active" | "awaiting_login" | "portal_disabled" | "unverified";

export type InviteStatus = "ready" | "redeemed" | "missing";

export function getApplicationInviteStatus(
  application: MembershipApplicationRecord,
): InviteStatus {
  if (application.invite_redeemed_at) return "redeemed";
  if (application.invite_token || application.invitation_link) return "ready";
  return "missing";
}

export function computeInviteMetrics(
  applications: MembershipApplicationRecord[],
): InviteMetrics {
  let awaitingRedemption = 0;
  let redeemed = 0;
  let missingLink = 0;

  for (const application of applications) {
    if (application.status !== "approved") continue;

    if (application.invite_redeemed_at) {
      redeemed += 1;
      continue;
    }

    if (application.invite_token || application.invitation_link) {
      awaitingRedemption += 1;
      continue;
    }

    missingLink += 1;
  }

  return { awaitingRedemption, redeemed, missingLink };
}

export function buildOverviewMetrics({
  pendingApplications,
  approvedMembers,
  profilesCreated,
  portalActiveMembers,
  inviteMetrics,
  needsAttention,
  aiDashboard,
}: {
  pendingApplications: number;
  approvedMembers: number;
  profilesCreated: number;
  portalActiveMembers: number | null;
  inviteMetrics: InviteMetrics;
  needsAttention: number;
  aiDashboard: AiAdminDashboard | null;
}): AdminOverviewMetrics {
  return {
    pendingApplications,
    approvedMembers,
    profilesCreated,
    portalActiveMembers,
    invitesAwaiting: inviteMetrics.awaitingRedemption,
    invitesRedeemed: inviteMetrics.redeemed,
    needsAttention,
    askQueriesToday: aiDashboard?.queries_today ?? null,
    askQueries7d: aiDashboard?.queries_7d ?? null,
    aiFailures7d: aiDashboard?.failures_7d ?? null,
  };
}

export function describeMemberOperationalState(member: AdminMemberRow): {
  state: MemberOperationalState;
  label: string;
} {
  if (!member.is_verified) {
    return { state: "unverified", label: "Not verified" };
  }

  if (!member.user_id) {
    return { state: "awaiting_login", label: "Awaiting account activation" };
  }

  if (!member.portal_access_enabled) {
    return { state: "portal_disabled", label: "Portal not enabled" };
  }

  return { state: "active", label: "Active in portal" };
}

export function filterAdminMembers(
  members: AdminMemberRow[],
  {
    search,
    filter,
  }: {
    search: string;
    filter: "all" | "portal" | "awaiting" | "unverified";
  },
): AdminMemberRow[] {
  const normalizedSearch = search.trim().toLowerCase();

  return members.filter((member) => {
    const operational = describeMemberOperationalState(member);

    if (filter === "portal" && operational.state !== "active") return false;
    if (filter === "awaiting" && operational.state !== "awaiting_login") return false;
    if (filter === "unverified" && operational.state !== "unverified") return false;

    if (!normalizedSearch) return true;

    const haystack = [
      member.full_name,
      member.email,
      member.primary_club,
      member.based_in,
      member.membership_status,
      member.founding_member_number ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

export function truncateAdminText(value: string, maxLength = 140) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

/** Dev-only structured logging for admin Supabase failures. */
export function logAdminQueryError(context: string, error: unknown) {
  if (!error || typeof error !== "object") {
    console.error(`[Admin] ${context}`, error);
    return;
  }

  const row = error as { message?: string; code?: string; details?: string; hint?: string };
  console.error(`[Admin] ${context}`, {
    message: row.message ?? String(error),
    code: row.code ?? null,
    details: row.details ?? null,
    hint: row.hint ?? null,
  });
}

export async function fetchPortalActiveMemberCount(): Promise<number | null> {
  if (!supabase) return null;

  const { count, error } = await supabase
    .from("member_profiles")
    .select("*", { count: "exact", head: true })
    .eq("portal_access_enabled", true);

  if (error) {
    console.error("[adminDashboard] portal active count failed", error);
    return null;
  }

  return count ?? 0;
}

export async function fetchMemberProfilesForAdmin(options: { search?: string; limit?: number } = {}) {
  if (!supabase) {
    return { data: [] as AdminMemberRow[], error: null };
  }

  const limit = options.limit ?? 50;
  let query = supabase
    .from("member_profiles")
    .select(
      "id, full_name, email, primary_club, based_in, membership_status, is_verified, founding_member_number, portal_access_enabled, created_at, user_id",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const search = options.search?.trim();
  if (search) {
    const escaped = search.replace(/[%_]/g, "");
    query = query.or(
      `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,primary_club.ilike.%${escaped}%,based_in.ilike.%${escaped}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    logAdminQueryError("fetchMemberProfilesForAdmin", error);
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

export async function fetchMemberProfilesForOnboarding(
  profileIds: string[],
  emails: string[],
) {
  if (!supabase) {
    return { data: [] as AdminMemberRow[], error: null };
  }

  const normalizedIds = [...new Set(profileIds.map((id) => id.trim()).filter(Boolean))];
  const normalizedEmails = [
    ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];

  if (normalizedIds.length === 0 && normalizedEmails.length === 0) {
    return { data: [] as AdminMemberRow[], error: null };
  }

  const select =
    "id, full_name, email, primary_club, based_in, membership_status, is_verified, founding_member_number, portal_access_enabled, created_at, user_id";

  const rows = new Map<string, AdminMemberRow>();

  function addRows(data: Record<string, unknown>[] | null) {
    for (const row of data ?? []) {
      const mapped: AdminMemberRow = {
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
      };
      rows.set(mapped.id, mapped);
    }
  }

  if (normalizedIds.length > 0) {
    const { data, error } = await supabase
      .from("member_profiles")
      .select(select)
      .in("id", normalizedIds);
    if (error) {
      logAdminQueryError("fetchMemberProfilesForOnboarding.byId", error);
      return { data: [] as AdminMemberRow[], error };
    }
    addRows(data);
  }

  if (normalizedEmails.length > 0) {
    const { data, error } = await supabase
      .from("member_profiles")
      .select(select)
      .in("email", normalizedEmails);
    if (error) {
      logAdminQueryError("fetchMemberProfilesForOnboarding.byEmail", error);
      return { data: [] as AdminMemberRow[], error };
    }
    addRows(data);
  }

  return { data: [...rows.values()], error: null };
}
