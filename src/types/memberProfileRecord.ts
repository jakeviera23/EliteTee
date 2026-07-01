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
  membership_status: string;
  is_verified: boolean;
};

export type MemberProfileRecord = MemberProfileInsert & {
  id: string;
  created_at: string;
  updated_at: string;
};
