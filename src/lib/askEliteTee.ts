import type {
  AskEliteTeeRequest,
  AskEliteTeeResponse,
  AiAdminDashboard,
  AiSettingsUpdate,
} from "../types/askEliteTee";
import { getCurrentAuthUserId } from "./authUserLinking";
import { supabase } from "./supabase";

function normalizeAskResponse(data: unknown): AskEliteTeeResponse {
  const row = (data ?? {}) as Partial<AskEliteTeeResponse>;
  return {
    status: row.status ?? "error",
    intent: row.intent ?? "unsupported",
    answer: String(row.answer ?? "Ask EliteTee could not complete this request."),
    sources: Array.isArray(row.sources) ? row.sources : [],
    members: Array.isArray(row.members) ? row.members : [],
    courses: Array.isArray(row.courses) ? row.courses : [],
    reasons: Array.isArray(row.reasons) ? row.reasons : [],
    followUps: Array.isArray(row.followUps) ? row.followUps : [],
    query_id: row.query_id ? String(row.query_id) : null,
  };
}

export async function askEliteTee(request: AskEliteTeeRequest) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Supabase is not configured."),
    };
  }

  const { data, error } = await supabase.functions.invoke("ask-elitetee", {
    body: request,
  });

  if (error) {
    return { data: null, error };
  }

  if (data && typeof data === "object" && "error" in data) {
    return {
      data: null,
      error: new Error(String((data as { error: unknown }).error)),
    };
  }

  return {
    data: normalizeAskResponse(data),
    error: null,
  };
}

export async function submitAskEliteTeeFeedback({
  queryId,
  rating,
  comment = "",
}: {
  queryId: string;
  rating: number;
  comment?: string;
}) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { userId, error: sessionError } = await getCurrentAuthUserId();
  if (sessionError || !userId) {
    return { error: sessionError ?? new Error("You must be signed in to submit feedback.") };
  }

  const { error } = await supabase.from("ai_feedback").insert({
    query_id: queryId,
    user_id: userId,
    rating,
    comment: comment.trim(),
  });

  return { error };
}

export async function fetchAiAdminDashboard() {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("ai_admin_get_ops_dashboard");
  if (error) {
    return { data: null, error };
  }

  return { data: data as AiAdminDashboard, error: null };
}

export async function updateAiSettings(update: AiSettingsUpdate) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { error } = await supabase
    .from("ai_settings")
    .update({
      ...update,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return { error };
}

export const ASK_ELITETEE_EXAMPLE_PROMPTS = [
  "Who should I meet in Florida?",
  "Which members have played National Golf Links?",
  "Find golfers interested in architecture.",
  "Show me the highest-rated courses members have reviewed.",
  "Who shares my travel interests?",
] as const;
