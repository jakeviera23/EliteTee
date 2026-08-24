import type {
  MembershipApplicationInsert,
  MembershipApplicationRecord,
  MembershipApplicationStatus,
} from "../types/membershipApplication";
import { buildInvitationEmailDraft } from "./invitationEmail";
import { buildInviteLink, generateInviteToken } from "./membershipInvites";
import { readStoredReferralCode, clearStoredReferralCode } from "./memberReferrals";
import { createMemberProfileFromApproval } from "./memberProfiles";
import { supabase } from "./supabase";

function normalizeApplication(row: Record<string, unknown>): MembershipApplicationRecord {
  return {
    id: String(row.id ?? ""),
    full_name: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    location: String(row.location ?? ""),
    home_club: String(row.home_club ?? ""),
    handicap: row.handicap ? String(row.handicap) : undefined,
    instagram: row.instagram ? String(row.instagram) : undefined,
    golf_love: String(row.golf_love ?? ""),
    why_join: String(row.why_join ?? ""),
    status: String(row.status ?? "pending_review") as MembershipApplicationStatus,
    applied_at: String(row.applied_at ?? ""),
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewed_by_email: row.reviewed_by_email ? String(row.reviewed_by_email) : null,
    decline_reason: row.decline_reason ? String(row.decline_reason) : null,
    member_profile_id: row.member_profile_id ? String(row.member_profile_id) : null,
    founding_member_number: row.founding_member_number
      ? String(row.founding_member_number)
      : null,
    invitation_user_id: row.invitation_user_id ? String(row.invitation_user_id) : null,
    invitation_email_draft: row.invitation_email_draft
      ? String(row.invitation_email_draft)
      : null,
    invitation_link: row.invitation_link ? String(row.invitation_link) : null,
    invite_token: row.invite_token ? String(row.invite_token) : null,
    invite_token_created_at: row.invite_token_created_at
      ? String(row.invite_token_created_at)
      : null,
    invite_redeemed_at: row.invite_redeemed_at ? String(row.invite_redeemed_at) : null,
    referrer_member_user_id: row.referrer_member_user_id
      ? String(row.referrer_member_user_id)
      : null,
    referral_code_used: row.referral_code_used ? String(row.referral_code_used) : null,
    referral_captured_at: row.referral_captured_at ? String(row.referral_captured_at) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function submitMembershipApplication(application: MembershipApplicationInsert) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const referralCodeUsed =
    application.referral_code_used?.trim() || readStoredReferralCode() || null;

  const payload = {
    full_name: application.full_name.trim(),
    email: application.email.trim().toLowerCase(),
    location: application.location.trim(),
    home_club: application.home_club.trim(),
    handicap: application.handicap?.trim() || null,
    instagram: application.instagram?.trim() || null,
    golf_love: application.golf_love.trim(),
    why_join: application.why_join.trim(),
    status: "pending_review" as const,
    ...(referralCodeUsed ? { referral_code_used: referralCodeUsed } : {}),
  };

  const { error } = await supabase.from("membership_applications").insert(payload);

  if (error) {
    console.error("[membership_applications] insert failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload,
    });
    return { error };
  }

  clearStoredReferralCode();
  return { error: null };
}

export async function fetchPendingApplications() {
  if (!supabase) {
    return { data: [] as MembershipApplicationRecord[], error: null };
  }

  const { data, error } = await supabase
    .from("membership_applications")
    .select("*")
    .eq("status", "pending_review")
    .order("applied_at", { ascending: true });

  if (error) {
    return { data: [] as MembershipApplicationRecord[], error };
  }

  return {
    data: (data ?? []).map((row) => normalizeApplication(row as Record<string, unknown>)),
    error: null,
  };
}

export async function fetchPendingApplicationCount() {
  if (!supabase) {
    return 0;
  }

  const { count, error } = await supabase
    .from("membership_applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending_review");

  return error ? 0 : count ?? 0;
}

export async function fetchApprovedApplications() {
  if (!supabase) {
    return { data: [] as MembershipApplicationRecord[], error: null };
  }

  const { data, error } = await supabase
    .from("membership_applications")
    .select("*")
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false });

  if (error) {
    return { data: [] as MembershipApplicationRecord[], error };
  }

  return {
    data: (data ?? []).map((row) => normalizeApplication(row as Record<string, unknown>)),
    error: null,
  };
}

export async function regenerateApplicationInviteToken(applicationId: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data: applicationRow, error: fetchError } = await supabase
    .from("membership_applications")
    .select("*")
    .eq("id", applicationId)
    .eq("status", "approved")
    .maybeSingle();

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  if (!applicationRow) {
    return { data: null, error: new Error("Approved application not found.") };
  }

  const application = normalizeApplication(applicationRow as Record<string, unknown>);

  if (application.invite_token) {
    return {
      data: null,
      error: new Error("Invite token already exists. Use Copy Invite Link instead."),
    };
  }

  if (application.invite_redeemed_at) {
    return { data: null, error: new Error("This invitation has already been redeemed.") };
  }

  const inviteToken = generateInviteToken();
  const inviteTokenCreatedAt = new Date().toISOString();
  const invitationLink = buildInviteLink(inviteToken);

  const invitationEmailDraft = application.invitation_email_draft
    ? application.invitation_email_draft.replace(
        /https?:\/\/[^\s]+\/invite\/[a-f0-9]+/i,
        invitationLink,
      )
    : buildInvitationEmailDraft({
        fullName: application.full_name,
        email: application.email,
        foundingMemberNumber: application.founding_member_number ?? "Founding Member",
        invitationLink,
      });

  const { data: updatedRow, error: updateError } = await supabase
    .from("membership_applications")
    .update({
      invite_token: inviteToken,
      invite_token_created_at: inviteTokenCreatedAt,
      invitation_link: invitationLink,
      invitation_email_draft: invitationEmailDraft,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("*")
    .single();

  if (updateError) {
    return { data: null, error: updateError };
  }

  return {
    data: {
      application: normalizeApplication(updatedRow as Record<string, unknown>),
      invitationLink,
      inviteToken,
    },
    error: null,
  };
}

async function fetchNextFoundingMemberNumber() {
  if (!supabase) {
    return "FM-001";
  }

  const { data, error } = await supabase.rpc("next_founding_member_number");

  if (!error && data) {
    return String(data);
  }

  const { data: rows } = await supabase
    .from("member_profiles")
    .select("founding_member_number")
    .not("founding_member_number", "is", null)
    .order("founding_member_number", { ascending: false })
    .limit(1);

  const last = rows?.[0]?.founding_member_number as string | undefined;
  const match = last?.match(/FM-(\d+)/i);
  const next = match ? Number.parseInt(match[1], 10) + 1 : 1;
  return `FM-${String(next).padStart(3, "0")}`;
}

async function getReviewerEmail() {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() ?? null;
}

export type ApproveApplicationResult = {
  application: MembershipApplicationRecord | null;
  invitationEmailDraft: string;
  foundingMemberNumber: string;
  memberProfileId: string | null;
  invitationLink: string;
  inviteToken: string;
};

export async function approveMembershipApplication(applicationId: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data: applicationRow, error: fetchError } = await supabase
    .from("membership_applications")
    .select("*")
    .eq("id", applicationId)
    .eq("status", "pending_review")
    .maybeSingle();

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  if (!applicationRow) {
    return { data: null, error: new Error("Application not found or already reviewed.") };
  }

  const application = normalizeApplication(applicationRow as Record<string, unknown>);
  const foundingMemberNumber = await fetchNextFoundingMemberNumber();
  const reviewerEmail = await getReviewerEmail();
  const inviteToken = generateInviteToken();
  const inviteTokenCreatedAt = new Date().toISOString();
  const invitationLink = buildInviteLink(inviteToken);

  const { data: profile, error: profileError } = await createMemberProfileFromApproval({
    full_name: application.full_name,
    email: application.email,
    primary_club: application.home_club,
    additional_clubs: [],
    based_in: application.location,
    regions: application.location ? [application.location] : [],
    industry: "Not specified",
    golf_interests: application.golf_love ? [application.golf_love] : [],
    business_interests: [],
    current_request: application.why_join,
    traveling_to: "",
    membership_status: "Founding Member",
    is_verified: true,
    founding_member_number: foundingMemberNumber,
    portal_access_enabled: false,
    user_id: null,
  });

  if (profileError) {
    return { data: null, error: profileError };
  }

  const invitationEmailDraft = buildInvitationEmailDraft({
    fullName: application.full_name,
    email: application.email,
    foundingMemberNumber,
    invitationLink,
  });

  const { data: updatedRow, error: updateError } = await supabase
    .from("membership_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by_email: reviewerEmail,
      member_profile_id: profile?.id ?? null,
      founding_member_number: foundingMemberNumber,
      invitation_user_id: null,
      invitation_email_draft: invitationEmailDraft,
      invitation_link: invitationLink,
      invite_token: inviteToken,
      invite_token_created_at: inviteTokenCreatedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("*")
    .single();

  if (updateError) {
    return { data: null, error: updateError };
  }

  return {
    data: {
      application: normalizeApplication(updatedRow as Record<string, unknown>),
      invitationEmailDraft,
      foundingMemberNumber,
      memberProfileId: profile?.id ?? null,
      invitationLink,
      inviteToken,
    } satisfies ApproveApplicationResult,
    error: null,
  };
}

export async function declineMembershipApplication(
  applicationId: string,
  declineReason?: string,
) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const reviewerEmail = await getReviewerEmail();

  const { data, error } = await supabase
    .from("membership_applications")
    .update({
      status: "declined",
      reviewed_at: new Date().toISOString(),
      reviewed_by_email: reviewerEmail,
      decline_reason: declineReason?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("status", "pending_review")
    .select("*")
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: new Error("Application not found or already reviewed.") };
  }

  return {
    data: normalizeApplication(data as Record<string, unknown>),
    error: null,
  };
}
