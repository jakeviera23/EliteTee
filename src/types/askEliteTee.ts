export type AiIntent = "find_members" | "find_courses" | "recommend_introductions" | "unsupported";

export type AiQueryStatus =
  | "ok"
  | "insufficient_data"
  | "unsupported"
  | "rate_limited"
  | "disabled"
  | "error";

export type AiSourceLabel = "Member profiles" | "Course directory" | "Member reviews";

export type AskEliteTeeMemberResult = {
  user_id: string;
  full_name: string;
  primary_club: string;
  based_in: string;
  regions: string;
  industry: string;
  golf_interests: string;
  business_interests: string;
  current_request: string;
  traveling_to: string;
  club_logo_url: string | null;
  cover_photo_url: string | null;
  founding_member_number: string | null;
  is_verified: boolean;
};

export type AskEliteTeeCourseResult = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  region: string | null;
  country: string | null;
  course_type: string | null;
  access_type: string | null;
  description: string | null;
  round_count: number;
  member_count: number;
  recommend_pct: number | null;
  avg_rating: number | null;
  latest_activity_at: string | null;
};

export type AskEliteTeeReason = {
  target_id: string;
  target_type: "member" | "course";
  signals: string[];
};

export type AskEliteTeeResponse = {
  status: AiQueryStatus;
  intent: AiIntent;
  answer: string;
  sources: AiSourceLabel[];
  members: AskEliteTeeMemberResult[];
  courses: AskEliteTeeCourseResult[];
  reasons: AskEliteTeeReason[];
  query_id: string | null;
};

export type AskEliteTeeRequest = {
  question: string;
  intent?: Exclude<AiIntent, "unsupported">;
};

export type AiAdminDashboard = {
  settings: {
    enabled: boolean;
    enable_find_members: boolean;
    enable_find_courses: boolean;
    enable_recommend_introductions: boolean;
    daily_member_limit: number;
    updated_at: string;
  };
  queries_today: number;
  queries_7d: number;
  failures_7d: number;
  intent_breakdown_7d: Record<string, number>;
  token_usage_7d: {
    input_tokens: number;
    output_tokens: number;
  };
  recent_error_codes: Array<{ error_code: string; created_at: string }>;
  feedback_average_7d: number | null;
  feedback_count_7d: number;
};

export type AiSettingsUpdate = {
  enabled?: boolean;
  enable_find_members?: boolean;
  enable_find_courses?: boolean;
  enable_recommend_introductions?: boolean;
  daily_member_limit?: number;
};
