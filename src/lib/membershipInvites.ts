import { supabase } from "./supabase";

export type MembershipInvitePreview = {
  full_name: string;
  email: string;
  founding_member_number: string | null;
  member_profile_id: string | null;
  status: string;
};

const INVITE_TOKEN_BYTES = 32;

export function generateInviteToken(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(INVITE_TOKEN_BYTES);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

export function buildInviteLink(token: string): string {
  const configuredBase = (import.meta.env.VITE_SITE_URL ?? "").trim().replace(/\/$/, "");
  const base = configuredBase || "https://www.elitetee.club";

  return `${base}/invite/${token}`;
}

function normalizeInvitePreview(value: unknown): MembershipInvitePreview | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const email = String(row.email ?? "").trim().toLowerCase();
  const fullName = String(row.full_name ?? "").trim();

  if (!email || !fullName) return null;

  return {
    full_name: fullName,
    email,
    founding_member_number: row.founding_member_number
      ? String(row.founding_member_number)
      : null,
    member_profile_id: row.member_profile_id ? String(row.member_profile_id) : null,
    status: String(row.status ?? ""),
  };
}

export async function fetchMembershipInviteByToken(token: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("get_membership_invite_by_token", {
    p_token: token.trim(),
  });

  if (error) {
    return { data: null, error };
  }

  const preview = normalizeInvitePreview(data);
  if (!preview) {
    return { data: null, error: null };
  }

  return { data: preview, error: null };
}

export async function completeMembershipInvite(token: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("complete_membership_invite", {
    p_token: token.trim(),
  });

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}
