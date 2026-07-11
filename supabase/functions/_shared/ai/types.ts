export type AiIntent = "find_members" | "find_courses" | "recommend_introductions" | "unsupported";

export type AiQueryStatus =
  | "ok"
  | "insufficient_data"
  | "unsupported"
  | "rate_limited"
  | "disabled"
  | "error";

export type AiSourceLabel = "Member profiles" | "Course directory" | "Member reviews";

export type RetrievedMember = {
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

export type RetrievedCourse = {
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

export type RoundSummary = {
  user_id: string;
  golf_course_id: string | null;
  course_name: string;
  course_slug: string | null;
  location: string;
  played_on: string;
  course_rating: number;
  would_play_again: boolean;
};

export type ScoredMember = {
  member: RetrievedMember;
  score: number;
  signals: string[];
};

export type AskEliteTeeRequest = {
  question: string;
  intent?: AiIntent;
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
  members: RetrievedMember[];
  courses: RetrievedCourse[];
  reasons: AskEliteTeeReason[];
  query_id: string | null;
};

export type AiProviderId = "openai" | "llama";

export type AiTask = "classification" | "concierge" | "summarization" | "moderation";

export type AiCompletionResult = {
  output: Record<string, unknown>;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

export interface AiProvider {
  id: AiProviderId;
  complete(input: {
    task: AiTask;
    system: string;
    userPayload: unknown;
    maxOutputTokens: number;
    timeoutMs: number;
  }): Promise<AiCompletionResult>;
}

export const FORBIDDEN_RESPONSE_KEYS = [
  "email",
  "invite",
  "application",
  "private_message",
  "password",
  "token",
] as const;
