export type MembershipApplicationStatus = "pending_review" | "approved" | "declined";

export type MembershipApplicationInsert = {
  full_name: string;
  email: string;
  location: string;
  home_club: string;
  handicap?: string;
  instagram?: string;
  golf_love: string;
  why_join: string;
};

export type MembershipApplicationRecord = MembershipApplicationInsert & {
  id: string;
  status: MembershipApplicationStatus;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
  decline_reason: string | null;
  member_profile_id: string | null;
  founding_member_number: string | null;
  invitation_user_id: string | null;
  invitation_email_draft: string | null;
  invitation_link: string | null;
  invite_token: string | null;
  invite_token_created_at: string | null;
  invite_redeemed_at: string | null;
  created_at: string;
  updated_at: string;
};
