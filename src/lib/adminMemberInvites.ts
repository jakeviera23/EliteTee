import type { MembershipApplicationRecord } from "../types/membershipApplication";
import { getApplicationInviteStatus } from "./adminDashboard";
import { buildInvitationEmailDraft } from "./invitationEmail";
import type { AdminMemberRow } from "./memberProfiles";
import { getApplicationInviteLink } from "./membershipInvites";

export function findApprovedApplicationForMember(
  member: AdminMemberRow,
  applications: MembershipApplicationRecord[],
): MembershipApplicationRecord | null {
  if (member.user_id) return null;

  const memberEmail = member.email.trim().toLowerCase();

  const byProfileId = applications.find(
    (application) =>
      application.status === "approved" &&
      !application.invite_redeemed_at &&
      application.member_profile_id === member.id,
  );
  if (byProfileId) return byProfileId;

  return (
    applications.find(
      (application) =>
        application.status === "approved" &&
        !application.invite_redeemed_at &&
        application.email.trim().toLowerCase() === memberEmail,
    ) ?? null
  );
}

export function memberHasRecoverableInvite(
  member: AdminMemberRow,
  application: MembershipApplicationRecord | null,
): boolean {
  if (!application || member.user_id) return false;
  return getApplicationInviteStatus(application) === "ready";
}

export function getInvitationEmailDraftForApplication(
  application: MembershipApplicationRecord,
): string | null {
  const invitationLink = getApplicationInviteLink(application);
  if (!invitationLink) return null;

  if (application.invitation_email_draft?.trim()) {
    return application.invitation_email_draft.trim();
  }

  return buildInvitationEmailDraft({
    fullName: application.full_name,
    email: application.email,
    foundingMemberNumber: application.founding_member_number ?? "Founding Member",
    invitationLink,
  });
}
