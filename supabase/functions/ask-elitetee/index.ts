import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { classifyIntent, buildRetrievalFilters, extractCourseNameFromQuestion, isSelfIdentityQuestion } from "../_shared/ai/intent.ts";
import {
  buildCourseDirectoryAnswer,
  buildNoCourseDirectoryResultsAnswer,
  filterCoursesByDirectoryFilters,
} from "../_shared/ai/course-directory-answer.ts";
import { buildCoursePlayEvidenceByMember } from "../_shared/ai/course-play-evidence.ts";
import {
  buildIntroductionMembersAnswer,
  isGenericInsufficientDataAnswer,
} from "../_shared/ai/introduction-answer.ts";
import { buildMemberDestinationSearchPlans } from "../_shared/ai/member-location.ts";
import { resolvePlayedCourseAnswerPath } from "../_shared/ai/played-course-answer-path.ts";
import { getProviderForTask } from "../_shared/ai/provider-registry.ts";
import { rankMembers, sanitizeUntrustedText } from "../_shared/ai/scoring.ts";
import {
  buildInsufficientDataResponse,
  containsPromptInjectionAttempt,
  mapCoursesById,
  mapMembersById,
  validateModelResponseIds,
} from "../_shared/ai/validate-response.ts";
import type {
  AiIntent,
  AiQueryStatus,
  AskEliteTeeRequest,
  AskEliteTeeResponse,
  RetrievedCourse,
  RetrievedMember,
  RoundSummary,
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

  if (containsPromptInjectionAttempt(question)) {
    return jsonResponse({
      status: "unsupported",
      intent: "unsupported",
      answer: "I can only help with EliteTee member and course discovery using approved directory data.",
      sources: [],
      members: [],
      courses: [],
      reasons: [],
      query_id: null,
    } satisfies AskEliteTeeResponse);
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
      answer: "Ask EliteTee is temporarily unavailable for this type of request.",
      sources: [],
      members: [],
      courses: [],
      reasons: [],
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
      answer: "You have reached today's Ask EliteTee limit. Please try again tomorrow.",
      sources: [],
      members: [],
      courses: [],
      reasons: [],
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

  const filters = buildRetrievalFilters(question, intent);
  let members: RetrievedMember[] = [];
  let courses: RetrievedCourse[] = [];
  let rounds: RoundSummary[] = [];
  let coursePlayEvidence: ReturnType<typeof buildCoursePlayEvidenceByMember> = {};
  const sources: AskEliteTeeResponse["sources"] = [];

  const { data: requestorProfile } = await supabase
    .from("member_profiles")
    .select(
      "user_id, full_name, primary_club, based_in, regions, industry, golf_interests, business_interests, current_request, traveling_to, club_logo_url, cover_photo_url, founding_member_number, is_verified",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const requestor = requestorProfile as RetrievedMember | null;
  const pendingIntroIds = await getPendingIntroUserIds(supabase, user.id);

  if (isSelfIdentityQuestion(question)) {
    if (!requestor) {
      const insufficient = buildInsufficientDataResponse("find_members");
      await supabase.from("ai_queries").insert({
        user_id: user.id,
        intent: "find_members",
        status: "insufficient_data",
        latency_ms: Date.now() - started,
        error_code: "NO_REQUESTOR_PROFILE",
      });
      return jsonResponse(insufficient);
    }

    const selfAnswer = [
      `You are ${requestor.full_name || "an EliteTee member"}.`,
      requestor.primary_club ? `Primary club: ${requestor.primary_club}.` : "",
      requestor.based_in ? `Based in: ${requestor.based_in}.` : "",
      requestor.traveling_to ? `Traveling to: ${requestor.traveling_to}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const selfResponse: AskEliteTeeResponse = {
      status: "ok",
      intent: "find_members",
      answer: selfAnswer,
      sources: ["Member profiles"],
      members: [],
      courses: [],
      reasons: [],
      query_id: null,
    };

    const { data: queryRow } = await supabase
      .from("ai_queries")
      .insert({
        user_id: user.id,
        intent: "find_members",
        status: "ok",
        latency_ms: Date.now() - started,
        model: "deterministic",
      })
      .select("id")
      .maybeSingle();

    selfResponse.query_id = queryRow?.id ? String(queryRow.id) : null;
    return jsonResponse(selfResponse);
  }

  if (intent === "find_courses") {
    const { data: courseRows, error: courseError } = await supabase.rpc("ai_search_golf_courses", {
      p_query: filters.courseQuery,
      p_limit: 12,
    });
    if (courseError) {
      console.error("ai_search_golf_courses failed:", courseError.message);
    }
    const retrieved = (courseRows ?? []) as RetrievedCourse[];
    courses = filterCoursesByDirectoryFilters(retrieved, filters.courseDirectoryFilters);
    if (filters.courseDirectoryFilters.rankByReviews) {
      courses = courses
        .filter((course) => (course.round_count ?? 0) > 0 || (course.avg_rating ?? 0) > 0)
        .sort(
          (left, right) =>
            (right.avg_rating ?? 0) - (left.avg_rating ?? 0) ||
            (right.round_count ?? 0) - (left.round_count ?? 0),
        );
    }
    sources.push("Course directory");
    if (courses.some((course) => (course.avg_rating ?? 0) > 0 || (course.round_count ?? 0) > 0)) {
      sources.push("Member reviews");
    }

    if (courses.length === 0) {
      const noResultsAnswer = filters.courseDirectoryFilters.rankByReviews
        ? "EliteTee does not yet have enough member review ratings to rank courses."
        : buildNoCourseDirectoryResultsAnswer(filters.courseDirectoryFilters.locationQuery);
      const noResultsResponse: AskEliteTeeResponse = {
        status: "ok",
        intent: "find_courses",
        answer: noResultsAnswer,
        sources: ["Course directory"],
        members: [],
        courses: [],
        reasons: [],
        query_id: null,
      };

      const { data: queryRow } = await supabase
        .from("ai_queries")
        .insert({
          user_id: user.id,
          intent: "find_courses",
          status: "ok",
          latency_ms: Date.now() - started,
          model: "deterministic",
          error_code: retrieved.length > 0 ? "FILTERED_NO_MATCHES" : "NO_DIRECTORY_MATCHES",
        })
        .select("id")
        .maybeSingle();

      noResultsResponse.query_id = queryRow?.id ? String(queryRow.id) : null;
      return jsonResponse(noResultsResponse);
    }

    const directoryAnswer = buildCourseDirectoryAnswer(courses, filters.courseDirectoryFilters);
    const directoryResponse: AskEliteTeeResponse = {
      status: "ok",
      intent: "find_courses",
      answer: directoryAnswer,
      sources: [...new Set(sources)],
      members: [],
      courses: courses.slice(0, 8),
      reasons: [],
      query_id: null,
    };

    const { data: directoryQueryRow } = await supabase
      .from("ai_queries")
      .insert({
        user_id: user.id,
        intent: "find_courses",
        status: "ok",
        latency_ms: Date.now() - started,
        model: "deterministic",
      })
      .select("id")
      .maybeSingle();

    directoryResponse.query_id = directoryQueryRow?.id ? String(directoryQueryRow.id) : null;
    return jsonResponse(directoryResponse);
  } else {
    type CourseMemberRpcRow = RetrievedMember & {
      round_count?: number | null;
      avg_course_rating?: number | null;
    };

    let focusCourse: RetrievedCourse | null = null;
    let focusCourseMembers: CourseMemberRpcRow[] = [];

    // OR-style destination plans: never AND location+travel for the same place.
    const limitedPlans = buildMemberDestinationSearchPlans({
      location: String(filters.memberFilters.location ?? ""),
      travel: String(filters.memberFilters.travel ?? ""),
      maxPlans: 4,
    });
    const mergedMembers = new Map<string, RetrievedMember>();

    for (const plan of limitedPlans) {
      const { data: memberRows, error: memberError } = await supabase.rpc("ai_search_portal_members", {
        p_filters: {
          ...filters.memberFilters,
          location: plan.location,
          travel: plan.travel,
        },
        p_limit: 30,
      });
      if (memberError) {
        console.error("ai_search_portal_members failed:", memberError.message, {
          ...filters.memberFilters,
          location: plan.location,
          travel: plan.travel,
        });
        continue;
      }
      for (const member of (memberRows ?? []) as RetrievedMember[]) {
        if (pendingIntroIds.has(member.user_id)) continue;
        if (!mergedMembers.has(member.user_id)) {
          mergedMembers.set(member.user_id, member);
        }
      }
    }

    members = [...mergedMembers.values()];
    sources.push("Member profiles");

    const courseName = extractCourseNameFromQuestion(question);
    if (courseName) {
      const { data: courseMatches } = await supabase.rpc("ai_search_golf_courses", {
        p_query: courseName,
        p_limit: 5,
      });
      const matches = (courseMatches ?? []) as RetrievedCourse[];
      const queryLower = courseName.toLowerCase();
      const matchedCourse =
        matches.find((course) => course.name?.toLowerCase() === queryLower) ??
        matches.find((course) => course.name?.toLowerCase().startsWith(queryLower)) ??
        matches.find((course) => course.name?.toLowerCase().includes(queryLower)) ??
        null;

      if (matchedCourse?.id) {
        focusCourse = matchedCourse;
        const { data: courseMembers } = await supabase.rpc("ai_members_by_course", {
          p_course_id: matchedCourse.id,
        });
        focusCourseMembers = (courseMembers ?? []) as CourseMemberRpcRow[];
      }

      const playedRows = focusCourseMembers.filter((member) => !pendingIntroIds.has(member.user_id));
      const playedPath = resolvePlayedCourseAnswerPath({
        extractedCourseName: courseName,
        matchedCourse: focusCourse
          ? { id: focusCourse.id, name: focusCourse.name, slug: focusCourse.slug }
          : null,
        playRows: playedRows,
      });

      // Specific-course played-by questions never fall through to generic member ranking.
      if (playedPath.kind === "deterministic") {
        sources.push("Member profiles", "Member reviews");
        const playedResponse: AskEliteTeeResponse = {
          status: "ok",
          intent,
          answer: playedPath.answer,
          sources: [...new Set(sources)],
          members: playedPath.playRows.slice(0, 8) as RetrievedMember[],
          courses: focusCourse ? [focusCourse] : [],
          reasons: playedPath.playRows.slice(0, 8).map((member) => ({
            target_id: member.user_id,
            target_type: "member" as const,
            signals: [`Recorded rounds at ${playedPath.courseName}`],
          })),
          query_id: null,
        };

        const { data: playedQueryRow } = await supabase
          .from("ai_queries")
          .insert({
            user_id: user.id,
            intent,
            status: "ok",
            latency_ms: Date.now() - started,
            model: "deterministic",
          })
          .select("id")
          .maybeSingle();

        playedResponse.query_id = playedQueryRow?.id ? String(playedQueryRow.id) : null;
        return jsonResponse(playedResponse);
      }

      if (playedPath.kind === "insufficient") {
        const insufficient = buildInsufficientDataResponse(intent);
        await supabase.from("ai_queries").insert({
          user_id: user.id,
          intent,
          status: "insufficient_data",
          latency_ms: Date.now() - started,
          error_code: "NO_PLAY_ROWS",
        });
        return jsonResponse(insufficient);
      }
    }

    const memberIds = members.map((member) => member.user_id);
    if (memberIds.length > 0) {
      const { data: roundRows } = await supabase.rpc("ai_member_round_summary", {
        p_user_ids: memberIds,
      });
      rounds = (roundRows ?? []) as RoundSummary[];
      if (rounds.length > 0) sources.push("Member reviews");
    }

    // Attach structured course-play evidence for any later LLM fallback bundle.
    coursePlayEvidence = buildCoursePlayEvidenceByMember({
      rounds,
      focusCourseName: focusCourse?.name ?? null,
      focusCourseSlug: focusCourse?.slug ?? null,
      focusCourseMembers,
    });

    if (intent === "recommend_introductions" && requestor) {
      members = rankMembers(requestor, members, rounds, 8).map((entry) => entry.member);
    }
  }

  if (members.length === 0 && courses.length === 0) {
    const insufficient = buildInsufficientDataResponse(intent);
    await supabase.from("ai_queries").insert({
      user_id: user.id,
      intent,
      status: "insufficient_data",
      latency_ms: Date.now() - started,
      error_code: "NO_DATA",
    });
    return jsonResponse(insufficient);
  }

  const scored = intent !== "find_courses" && requestor
    ? rankMembers(requestor, members, rounds, 8)
    : members.map((member) => ({ member, score: 0, signals: [] as string[] }));

  // Deterministic introductions: never let LLM collapse retrieved candidates to insufficient-data.
  if (intent === "recommend_introductions" && scored.length > 0) {
    const destination = String(filters.memberFilters.location ?? filters.memberFilters.travel ?? "");
    const introAnswer = buildIntroductionMembersAnswer({
      destination,
      scored,
    });
    if (introAnswer) {
      const introMembers = scored.map((entry) => entry.member);
      const introResponse: AskEliteTeeResponse = {
        status: "ok",
        intent,
        answer: introAnswer,
        sources: [...new Set(sources.length > 0 ? sources : ["Member profiles"])],
        members: introMembers.slice(0, 8),
        courses: [],
        reasons: scored.slice(0, 8).map((entry) => ({
          target_id: entry.member.user_id,
          target_type: "member" as const,
          signals: entry.signals,
        })),
        query_id: null,
      };

      const { data: introQueryRow } = await supabase
        .from("ai_queries")
        .insert({
          user_id: user.id,
          intent,
          status: "ok",
          latency_ms: Date.now() - started,
          model: "deterministic",
        })
        .select("id")
        .maybeSingle();

      introResponse.query_id = introQueryRow?.id ? String(introQueryRow.id) : null;
      return jsonResponse(introResponse);
    }
  }

  const sanitizedBundle = {
    intent,
    question: sanitizeUntrustedText(question, 500),
    requestor: requestor
      ? {
          user_id: requestor.user_id,
          full_name: sanitizeUntrustedText(requestor.full_name, 80),
          based_in: sanitizeUntrustedText(requestor.based_in, 80),
          traveling_to: sanitizeUntrustedText(requestor.traveling_to, 120),
          golf_interests: sanitizeUntrustedText(requestor.golf_interests, 160),
        }
      : null,
    members: scored.map(({ member, score, signals }) => ({
      user_id: member.user_id,
      full_name: sanitizeUntrustedText(member.full_name, 80),
      primary_club: sanitizeUntrustedText(member.primary_club, 80),
      based_in: sanitizeUntrustedText(member.based_in, 80),
      traveling_to: sanitizeUntrustedText(member.traveling_to, 120),
      golf_interests: sanitizeUntrustedText(member.golf_interests, 160),
      current_request: sanitizeUntrustedText(member.current_request, 160),
      score,
      signals,
      // Structured play evidence only — never free-text round notes.
      course_play: (coursePlayEvidence[member.user_id] ?? []).map((entry) => ({
        course_name: sanitizeUntrustedText(entry.course_name, 120),
        course_slug: entry.course_slug,
        round_count: entry.round_count,
        avg_rating: entry.avg_rating,
      })),
    })),
    courses: courses.slice(0, 8).map((course) => ({
      id: course.id,
      name: sanitizeUntrustedText(course.name, 120),
      slug: course.slug,
      city: course.city,
      region: course.region,
      country: course.country,
      avg_rating: course.avg_rating,
      recommend_pct: course.recommend_pct,
      round_count: course.round_count,
    })),
  };

  let status: AiQueryStatus = "ok";
  let answer = "Here are the closest matches from EliteTee directory data.";
  let model = "deterministic";
  let inputTokens = 0;
  let outputTokens = 0;
  let selectedMemberIds = scored.slice(0, 6).map((entry) => entry.member.user_id);
  let selectedCourseIds = courses.slice(0, 6).map((course) => course.id);
  let errorCode: string | null = null;

  try {
    const provider = getProviderForTask("concierge");
    const completion = await provider.complete({
      task: "concierge",
      system: [
        "You are Ask EliteTee, a private member concierge.",
        "Use ONLY the JSON retrieval bundle provided.",
        "Never invent members, courses, ratings, or facts.",
        "Never mention email, private messages, invite tokens, or admin data.",
        "When members include course_play evidence, cite those courses, round counts, and ratings only.",
        "If members have course_play for a queried course, name those members — do not claim insufficient data.",
        "Return JSON with keys: answer (string), member_user_ids (string[]), course_ids (string[]).",
        "Choose IDs only from the provided members/courses arrays.",
        "If data is thin and no course_play evidence is present, say you do not have enough EliteTee data yet.",
      ].join(" "),
      userPayload: sanitizedBundle,
      maxOutputTokens: getEnvInt("AI_MAX_OUTPUT_TOKENS", 700),
      timeoutMs: getEnvInt("AI_REQUEST_TIMEOUT_MS", 15000),
    });

    model = completion.model;
    inputTokens = completion.inputTokens;
    outputTokens = completion.outputTokens;

    const validated = validateModelResponseIds({
      response: completion.output as {
        answer?: string;
        member_user_ids?: string[];
        course_ids?: string[];
      },
      allowedMemberIds: new Set(members.map((member) => member.user_id)),
      allowedCourseIds: new Set(courses.map((course) => course.id)),
    });

    if (validated.answer) answer = validated.answer;
    if (validated.memberIds.length > 0) selectedMemberIds = validated.memberIds;
    if (validated.courseIds.length > 0) selectedCourseIds = validated.courseIds;

    // Safety net: never keep generic insufficient-data text when retrieval produced members.
    if (
      scored.length > 0 &&
      isGenericInsufficientDataAnswer(answer)
    ) {
      if (intent === "recommend_introductions") {
        const destination = String(filters.memberFilters.location ?? filters.memberFilters.travel ?? "");
        const fallback = buildIntroductionMembersAnswer({ destination, scored });
        if (fallback) {
          answer = fallback;
          selectedMemberIds = scored.slice(0, 6).map((entry) => entry.member.user_id);
          model = "deterministic";
        }
      } else {
        answer = "Here are the closest matches from EliteTee directory data.";
        selectedMemberIds = scored.slice(0, 6).map((entry) => entry.member.user_id);
      }
    }
  } catch (error) {
    errorCode = error instanceof Error ? error.message.slice(0, 120) : "AI_PROVIDER_ERROR";
    if (errorCode.includes("OPENAI_NOT_CONFIGURED")) {
      status = "error";
      answer = "Ask EliteTee is not fully configured yet. Showing directory matches only.";
    }
  }

  const responseMembers = mapMembersById(members, selectedMemberIds);
  const responseCourses = mapCoursesById(courses, selectedCourseIds);
  const reasons = scored
    .filter((entry) => selectedMemberIds.includes(entry.member.user_id))
    .map((entry) => ({
      target_id: entry.member.user_id,
      target_type: "member" as const,
      signals: entry.signals,
    }));

  const { data: queryRow } = await supabase
    .from("ai_queries")
    .insert({
      user_id: user.id,
      intent,
      status,
      latency_ms: Date.now() - started,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      error_code: errorCode,
    })
    .select("id")
    .single();

  if (queryRow?.id && intent !== "find_courses") {
    const suggestions = scored
      .filter((entry) => selectedMemberIds.includes(entry.member.user_id))
      .slice(0, 8)
      .map((entry) => ({
        requestor_user_id: user.id,
        suggested_user_id: entry.member.user_id,
        ai_query_id: queryRow.id,
        score: entry.score,
        signals: entry.signals,
      }));

    if (suggestions.length > 0) {
      await supabase.from("member_match_suggestions").insert(suggestions);
    }
  }

  const response: AskEliteTeeResponse = {
    status,
    intent,
    answer,
    sources: [...new Set(sources)],
    members: responseMembers,
    courses: responseCourses,
    reasons,
    query_id: queryRow?.id ?? null,
  };

  return jsonResponse(response);
});
