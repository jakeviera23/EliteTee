import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  mapOrchestratorLogStatus,
  runConciergeOrchestrator,
} from "../_shared/ai/concierge-orchestrator.ts";
import {
  buildUnsupportedSafetyResponse,
  classifyConciergeSafetyQuestion,
} from "../_shared/ai/concierge-safety.ts";
import { classifyIntent } from "../_shared/ai/intent.ts";
import type {
  AiIntent,
  AskEliteTeeRequest,
  AskEliteTeeResponse,
  RetrievedMember,
} from "../_shared/ai/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getEnvInt(name: string, fallback: number) {
  const value = Number(Deno.env.get(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isCapabilityEnabled(
  settings: {
    enabled: boolean;
    enable_find_members: boolean;
    enable_find_courses: boolean;
    enable_recommend_introductions: boolean;
  },
  intent: AiIntent,
) {
  if (!settings.enabled) return false;
  if (intent === "find_members") return settings.enable_find_members;
  if (intent === "find_courses") return settings.enable_find_courses;
  if (intent === "recommend_introductions") return settings.enable_recommend_introductions;
  return false;
}

async function getPendingIntroUserIds(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from("introduction_requests")
    .select("sender_id, receiver_id")
    .eq("status", "pending")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  const blocked = new Set<string>();
  for (const row of data ?? []) {
    const other = row.sender_id === userId ? row.receiver_id : row.sender_id;
    if (other) blocked.add(other);
  }
  return blocked;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const started = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { data: portalAccess, error: portalError } = await supabase.rpc("current_user_has_portal_access");
  if (portalError || !portalAccess) {
    return jsonResponse({ error: "Portal access required" }, 403);
  }

  let body: AskEliteTeeRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const question = String(body.question ?? "").trim();
  if (!question || question.length > 500) {
    return jsonResponse({ error: "Question is required and must be under 500 characters." }, 400);
  }

  const safety = classifyConciergeSafetyQuestion(question);
  if (safety.blocked) {
    return jsonResponse(buildUnsupportedSafetyResponse(safety));
  }

  const intent = classifyIntent(question, body.intent);

  const { data: settingsRow, error: settingsError } = await supabase
    .from("ai_settings")
    .select("enabled, enable_find_members, enable_find_courses, enable_recommend_introductions, daily_member_limit")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError || !settingsRow) {
    return jsonResponse({ error: "AI settings unavailable" }, 503);
  }

  if (!isCapabilityEnabled(settingsRow, intent)) {
    const disabledResponse: AskEliteTeeResponse = {
      status: "disabled",
      intent,
      answer: "Ask EliteTee is temporarily unavailable. Please try again later.",
      sources: [],
      members: [],
      courses: [],
      reasons: [],
      followUps: [],
      query_id: null,
    };
    return jsonResponse(disabledResponse, 503);
  }

  const envDailyLimit = getEnvInt("AI_DAILY_MEMBER_LIMIT", settingsRow.daily_member_limit);
  const dailyLimit = Math.min(settingsRow.daily_member_limit, envDailyLimit);
  const { data: usedToday } = await supabase.rpc("ai_member_queries_today_count");
  if ((usedToday ?? 0) >= dailyLimit) {
    const limited: AskEliteTeeResponse = {
      status: "rate_limited",
      intent,
      answer: "Ask EliteTee has reached today's usage limit. Try again later.",
      sources: [],
      members: [],
      courses: [],
      reasons: [],
      followUps: [],
      query_id: null,
    };
    await supabase.from("ai_queries").insert({
      user_id: user.id,
      intent,
      status: "rate_limited",
      latency_ms: Date.now() - started,
      error_code: "RATE_LIMIT",
    });
    return jsonResponse(limited, 429);
  }

  const { data: requestorProfile } = await supabase
    .from("member_profiles")
    .select(
      "user_id, full_name, primary_club, based_in, regions, industry, golf_interests, business_interests, current_request, traveling_to, club_logo_url, cover_photo_url, founding_member_number, is_verified",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const requestor = requestorProfile as RetrievedMember | null;
  const pendingIntroIds = await getPendingIntroUserIds(supabase, user.id);

  const orchestrated = await runConciergeOrchestrator({
    supabase,
    viewerId: user.id,
    question,
    explicitIntent: body.intent,
    requestor,
    pendingIntroUserIds: pendingIntroIds,
  });

  const { data: queryRow } = await supabase
    .from("ai_queries")
    .insert({
      user_id: user.id,
      intent: orchestrated.intent,
      status: mapOrchestratorLogStatus(orchestrated.logStatus),
      latency_ms: Date.now() - started,
      model: orchestrated.model,
      input_tokens: orchestrated.inputTokens,
      output_tokens: orchestrated.outputTokens,
      error_code: orchestrated.errorCode,
    })
    .select("id")
    .single();

  if (queryRow?.id && orchestrated.members.length > 0) {
    const suggestions = orchestrated.members.slice(0, 5).map((member) => ({
      requestor_user_id: user.id,
      suggested_user_id: member.user_id,
      ai_query_id: queryRow.id,
      score: 0,
      signals: orchestrated.reasons.find((reason) => reason.target_id === member.user_id)?.signals ??
        [],
    }));

    if (suggestions.length > 0) {
      await supabase.from("member_match_suggestions").insert(suggestions);
    }
  }

  const response: AskEliteTeeResponse = {
    status: orchestrated.status,
    intent: orchestrated.intent,
    answer: orchestrated.answer,
    sources: orchestrated.sources,
    members: orchestrated.members,
    courses: orchestrated.courses,
    reasons: orchestrated.reasons,
    followUps: orchestrated.followUps,
    query_id: queryRow?.id ?? null,
  };

  return jsonResponse(response);
});
