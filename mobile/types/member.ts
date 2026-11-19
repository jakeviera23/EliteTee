export type MobileMemberProfile = {
  id: string;
  user_id: string | null;
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
  handicap: string;
  bucket_list_course_ids: string[];
  club_logo_url: string | null;
  cover_photo_url: string | null;
  membership_status: string;
  is_verified: boolean;
  founding_member_number: string | null;
  portal_access_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type MobileMemberProfileUpdate = {
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
  handicap: string;
  bucket_list_course_ids: string[];
  club_logo_url: string | null;
  cover_photo_url: string | null;
};

export type PortalAccessState = {
  hasAccess: boolean;
  membershipStatus: string | null;
  foundingMemberNumber: string | null;
  /**
   * True when portal access was read successfully from the API.
   * False means verification failed — do not treat as “no access.”
   */
  verified: boolean;
};
