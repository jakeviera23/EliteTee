import type { MembershipApplicationRecord } from "../types/membershipApplication";
import { supabase } from "./supabase";

export type ApplicationReferrerDisplay = {
  full_name: string;
  founding_member_number: string | null;
};

export type MembershipApplicationWithReferrer = MembershipApplicationRecord & {
  referrer_display: ApplicationReferrerDisplay | null;
};

function normalizeReferrerDisplay(row: Record<string, unknown>): ApplicationReferrerDisplay {
  return {
    full_name: String(row.full_name ?? "").trim() || "Member",
    founding_member_number: row.founding_member_number
      ? String(row.founding_member_number)
      : null,
  };
}

export async function fetchApplicationReferrerDisplays(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (!supabase || uniqueIds.length === 0) {
    return new Map<string, ApplicationReferrerDisplay>();
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .select("user_id, full_name, founding_member_number")
    .in("user_id", uniqueIds);

  if (error) {
    console.error("[admin] failed to load referral referrer profiles", error);
    return new Map<string, ApplicationReferrerDisplay>();
  }

  const map = new Map<string, ApplicationReferrerDisplay>();
  for (const row of data ?? []) {
    const userId = String((row as Record<string, unknown>).user_id ?? "").trim();
    if (!userId) continue;
    map.set(userId, normalizeReferrerDisplay(row as Record<string, unknown>));
  }

  return map;
}

export async function enrichApplicationsWithReferrers<T extends MembershipApplicationRecord>(
  applications: T[],
): Promise<MembershipApplicationWithReferrer[]> {
  const referrerIds = applications
    .map((application) => application.referrer_member_user_id)
    .filter((id): id is string => Boolean(id?.trim()));

  const referrers = await fetchApplicationReferrerDisplays(referrerIds);

  return applications.map((application) => ({
    ...application,
    referrer_display: application.referrer_member_user_id
      ? referrers.get(application.referrer_member_user_id) ?? {
          full_name: "Member",
          founding_member_number: null,
        }
      : null,
  }));
}

export function formatApplicationReferrerLine(
  referrer: ApplicationReferrerDisplay | null | undefined,
): string | null {
  if (!referrer) return null;

  const fmSuffix = referrer.founding_member_number
    ? ` (${referrer.founding_member_number})`
    : "";

  return `${referrer.full_name}${fmSuffix}`;
}
