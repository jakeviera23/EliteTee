export type MemberProfileInsert = {
  full_name: string;
  email: string;
  primary_club: string;
  additional_clubs: string[];
  based_in: string;
  regions: string[];
  industry: string;
  golf_interests: string[];
  business_interests: string[];
  current_request: string;
  traveling_to: string;
  handicap?: string;
  bucket_list_course_ids?: string[];
  club_logo_url?: string | null;
  cover_photo_url?: string | null;
  user_id: string;
  membership_status: string;
  is_verified: boolean;
  founding_member_number?: string | null;
  portal_access_enabled?: boolean;
};

export type MemberProfileRecord = Omit<
  MemberProfileInsert,
  "user_id" | "handicap" | "bucket_list_course_ids"
> & {
  id: string;
  user_id: string | null;
  founding_member_number: string | null;
  portal_access_enabled: boolean;
  created_at: string;
  updated_at: string;
  handicap: string;
  bucket_list_course_ids: string[];
};
