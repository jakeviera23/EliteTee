import type { ComposerPostType, PostType } from "../data/portalSocial";

export type MemberFeedPostRecord = {
  id: string;
  user_id: string;
  member_profile_id: string | null;
  member_course_round_id?: string | null;
  content: string;
  post_type: string;
  created_at: string;
  updated_at: string;
};

export type MemberFeedPostAuthorProfile = {
  full_name: string;
  primary_club: string;
  based_in: string;
  club_logo_url: string | null;
  is_verified: boolean;
  user_id: string | null;
  founding_member_number: string | null;
  industry: string;
};

export type MemberFeedPostWithProfile = MemberFeedPostRecord & {
  member_profiles: MemberFeedPostAuthorProfile | MemberFeedPostAuthorProfile[] | null;
};

export type MemberFeedPostPayload = {
  composerPostType: ComposerPostType;
  message: string;
  headline?: string;
  badge?: string;
  details?: { label: string; value: string }[];
  internalPostType: PostType;
  rating?: number;
  playedWith?: string;
};
