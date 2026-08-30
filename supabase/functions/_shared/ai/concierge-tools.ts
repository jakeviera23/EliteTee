import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  filterCoursesByDirectoryFilters,
  type CourseDirectoryFilters,
} from "./course-directory-answer.ts";
import {
  extractCourseNameFromQuestion,
  isGenericIntroductionPlaceholderQuestion,
  isGlobalCourseRankingQuestion,
} from "./intent.ts";
import {
  filterMembersByRetrievalCriteria,
  planMemberRetrieval,
} from "./member-retrieval.ts";
import type { ConciergeToolName } from "./concierge-tool-definitions.ts";
import type {
  AiSourceLabel,
  RetrievedCourse,
  RetrievedMember,
  RoundSummary,
} from "./types.ts";

export type ConciergeRelationshipState =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected"
  | "grandfather_thread_messageable";

export type CourseMemberStats = {
  course_id: string;
  course_name: string;
  avg_rating: number | null;
  recommend_pct: number | null;
  round_count: number;
  member_count: number;
  latest_activity_at: string | null;
};

export type ConciergeToolStore = {
  members: Map<string, RetrievedMember>;
  courses: Map<string, RetrievedCourse>;
  rounds: RoundSummary[];
  courseStats: Map<string, CourseMemberStats>;
  relationshipStates: Map<string, ConciergeRelationshipState>;
  sources: Set<AiSourceLabel>;
};

export type ConciergeToolDeps = {
  supabase: SupabaseClient;
  viewerId: string;
  pendingIntroUserIds: Set<string>;
  question: string;
};

export type ConciergeToolResult = {
  ok: boolean;
  tool: ConciergeToolName;
  summary: string;
  error?: string;
  blocked?: boolean;
  needsClarification?: boolean;
  clarificationPrompt?: string;
};

const DEFAULT_MEMBER_LIMIT = 12;
const MAX_MEMBER_LIMIT = 12;
const DEFAULT_COURSE_LIMIT = 8;
const MAX_COURSE_LIMIT = 12;

export function createConciergeToolStore(): ConciergeToolStore {
  return {
    members: new Map(),
    courses: new Map(),
    rounds: [],
    courseStats: new Map(),
    relationshipStates: new Map(),
    sources: new Set(),
  };
}

function clampLimit(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

function emptyMember(overrides: Partial<RetrievedMember> & Pick<RetrievedMember, "user_id">): RetrievedMember {
  return {
    full_name: "",
    primary_club: "",
    based_in: "",
    regions: "",
    industry: "",
    golf_interests: "",
    business_interests: "",
    current_request: "",
    traveling_to: "",
    club_logo_url: null,
    cover_photo_url: null,
    founding_member_number: null,
    is_verified: false,
    ...overrides,
  };
}

function mapCourseMemberRow(row: Record<string, unknown>): RetrievedMember {
  return emptyMember({
    user_id: String(row.user_id),
    full_name: String(row.full_name ?? ""),
    primary_club: String(row.primary_club ?? ""),
    based_in: String(row.based_in ?? ""),
    golf_interests: String(row.golf_interests ?? ""),
    traveling_to: String(row.traveling_to ?? ""),
  });
}

function addMembers(store: ConciergeToolStore, members: RetrievedMember[]) {
  for (const member of members) {
    if (!member.user_id) continue;
    store.members.set(member.user_id, member);
  }
}

function addCourses(store: ConciergeToolStore, courses: RetrievedCourse[]) {
  for (const course of courses) {
    store.courses.set(course.id, course);
  }
}

function courseLocationText(course: RetrievedCourse): string {
  return `${course.city ?? ""} ${course.region ?? ""} ${course.country ?? ""}`.toLowerCase();
}

function courseMatchesRegion(course: RetrievedCourse, region: string): boolean {
  const token = region.trim().toLowerCase();
  if (!token) return true;
  return courseLocationText(course).includes(token);
}

async function resolveCourse(
  deps: ConciergeToolDeps,
  input: { course_name?: string; course_id?: string },
): Promise<RetrievedCourse | null> {
  const courseId = String(input.course_id ?? "").trim();
  if (courseId) {
    const { data } = await deps.supabase.rpc("ai_search_golf_courses", {
      p_query: "",
      p_limit: 50,
    });
    const match = ((data ?? []) as RetrievedCourse[]).find((course) => course.id === courseId);
    if (match) return match;
  }

  const courseName = String(input.course_name ?? "").trim() || extractCourseNameFromQuestion(deps.question) || "";
  if (!courseName) return null;

  const { data: courseRows, error } = await deps.supabase.rpc("ai_search_golf_courses", {
    p_query: courseName,
    p_limit: 3,
  });
  if (error) {
    console.error("resolveCourse ai_search_golf_courses failed:", error.message);
    return null;
  }

  const courses = (courseRows ?? []) as RetrievedCourse[];
  const exact = courses.find((course) => course.name.toLowerCase() === courseName.toLowerCase());
  return exact ?? courses[0] ?? null;
}

function memberFiltersAreSpecific(args: Record<string, unknown>): boolean {
  const fields = [
    "location",
    "home_club",
    "interests",
    "travel_destination",
    "connection_interest",
    "semantic_query",
  ];
  return fields.some((field) => String(args[field] ?? "").trim().length >= 2);
}

async function searchMembersTool(
  deps: ConciergeToolDeps,
  store: ConciergeToolStore,
  args: Record<string, unknown>,
): Promise<ConciergeToolResult> {
  if (isGenericIntroductionPlaceholderQuestion(deps.question)) {
    return {
      ok: false,
      tool: "search_members",
      summary: "Question is too vague for member search.",
      blocked: true,
      needsClarification: true,
      clarificationPrompt: "Which course or destination do you have in mind?",
    };
  }

  if (!memberFiltersAreSpecific(args)) {
    const plan = planMemberRetrieval(deps.question, "recommend_introductions");
    if (plan.rejectReason === "need_more_detail") {
      return {
        ok: false,
        tool: "search_members",
        summary: "Member search requires a specific location, club, interest, or destination.",
        blocked: true,
        needsClarification: true,
        clarificationPrompt: "Which city, region, destination, course, or club should I focus on?",
      };
    }
  }

  const filters = {
    query: String(args.semantic_query ?? "").trim().slice(0, 80),
    location: String(args.location ?? "").trim(),
    interest: String(args.interests ?? args.connection_interest ?? "").trim().slice(0, 80),
    travel: String(args.travel_destination ?? "").trim(),
    home_club: String(args.home_club ?? "").trim(),
  };

  const limit = clampLimit(args.limit, DEFAULT_MEMBER_LIMIT, MAX_MEMBER_LIMIT);
  const { data, error } = await deps.supabase.rpc("ai_search_portal_members", {
    p_filters: filters,
    p_limit: limit,
  });

  if (error) {
    return {
      ok: false,
      tool: "search_members",
      summary: "Member search failed.",
      error: error.message,
    };
  }

  let members = ((data ?? []) as RetrievedMember[]).filter(
    (member) => !deps.pendingIntroUserIds.has(member.user_id),
  );

  const plan = planMemberRetrieval(deps.question, "recommend_introductions");
  members = filterMembersByRetrievalCriteria(members, plan);

  addMembers(store, members);
  store.sources.add("Member profiles");

  return {
    ok: true,
    tool: "search_members",
    summary: members.length > 0
      ? `Found ${members.length} matching member${members.length === 1 ? "" : "s"}.`
      : "No members matched the requested filters.",
  };
}

async function searchCoursesTool(
  deps: ConciergeToolDeps,
  store: ConciergeToolStore,
  args: Record<string, unknown>,
): Promise<ConciergeToolResult> {
  const queryParts = [
    String(args.name ?? "").trim(),
    String(args.city ?? "").trim(),
    String(args.region ?? "").trim(),
    String(args.country ?? "").trim(),
  ].filter(Boolean);

  const query = queryParts.join(" ").trim();
  const limit = clampLimit(args.limit, DEFAULT_COURSE_LIMIT, MAX_COURSE_LIMIT);

  const { data, error } = await deps.supabase.rpc("ai_search_golf_courses", {
    p_query: query,
    p_limit: limit,
  });

  if (error) {
    return {
      ok: false,
      tool: "search_courses",
      summary: "Course search failed.",
      error: error.message,
    };
  }

  const directoryFilters: CourseDirectoryFilters = {
    locationQuery: String(args.region ?? args.city ?? "").trim(),
    accessType: String(args.access ?? "").trim() || null,
    courseType: String(args.course_type ?? "").trim() || null,
  };

  let courses = filterCoursesByDirectoryFilters((data ?? []) as RetrievedCourse[], directoryFilters);
  if (args.country) {
    const country = String(args.country).trim().toLowerCase();
    courses = courses.filter((course) => (course.country ?? "").toLowerCase().includes(country));
  }

  addCourses(store, courses);
  store.sources.add("Course directory");

  return {
    ok: true,
    tool: "search_courses",
    summary: courses.length > 0
      ? `Found ${courses.length} course${courses.length === 1 ? "" : "s"}.`
      : "No courses matched the requested filters.",
  };
}

async function membersWhoPlayedCourseTool(
  deps: ConciergeToolDeps,
  store: ConciergeToolStore,
  args: Record<string, unknown>,
): Promise<ConciergeToolResult> {
  const course = await resolveCourse(deps, {
    course_name: String(args.course_name ?? ""),
    course_id: String(args.course_id ?? ""),
  });

  if (!course) {
    return {
      ok: false,
      tool: "get_members_who_played_course",
      summary: "Could not resolve the requested course in EliteTee directory data.",
    };
  }

  addCourses(store, [course]);

  const { data, error } = await deps.supabase.rpc("ai_members_by_course", {
    p_course_id: course.id,
  });

  if (error) {
    return {
      ok: false,
      tool: "get_members_who_played_course",
      summary: "Course member lookup failed.",
      error: error.message,
    };
  }

  let members = ((data ?? []) as Record<string, unknown>[]).map(mapCourseMemberRow).filter(
    (member) => !deps.pendingIntroUserIds.has(member.user_id),
  );

  const limit = clampLimit(args.limit, DEFAULT_MEMBER_LIMIT, MAX_MEMBER_LIMIT);
  members = members.slice(0, limit);

  addMembers(store, members);
  store.sources.add("Member profiles");
  store.sources.add("Member reviews");

  return {
    ok: true,
    tool: "get_members_who_played_course",
    summary: members.length > 0
      ? `Found ${members.length} member${members.length === 1 ? "" : "s"} who played ${course.name}.`
      : `No logged member rounds found for ${course.name} yet.`,
  };
}

async function courseMemberStatsTool(
  deps: ConciergeToolDeps,
  store: ConciergeToolStore,
  args: Record<string, unknown>,
): Promise<ConciergeToolResult> {
  const course = await resolveCourse(deps, {
    course_name: String(args.course_name ?? ""),
    course_id: String(args.course_id ?? ""),
  });

  if (!course) {
    return {
      ok: false,
      tool: "get_course_member_stats",
      summary: "Could not resolve the requested course.",
    };
  }

  addCourses(store, [course]);
  store.sources.add("Course directory");
  if ((course.round_count ?? 0) > 0 || (course.avg_rating ?? 0) > 0) {
    store.sources.add("Member reviews");
  }

  const stats: CourseMemberStats = {
    course_id: course.id,
    course_name: course.name,
    avg_rating: course.avg_rating,
    recommend_pct: course.recommend_pct,
    round_count: Number(course.round_count ?? 0),
    member_count: Number(course.member_count ?? 0),
    latest_activity_at: course.latest_activity_at,
  };

  store.courseStats.set(course.id, stats);

  return {
    ok: true,
    tool: "get_course_member_stats",
    summary: `${course.name}: avg rating ${course.avg_rating ?? "n/a"}, ${course.round_count ?? 0} logged rounds, ${course.member_count ?? 0} members, recommend ${course.recommend_pct ?? "n/a"}%.`,
  };
}

async function topRatedCoursesTool(
  deps: ConciergeToolDeps,
  store: ConciergeToolStore,
  args: Record<string, unknown>,
): Promise<ConciergeToolResult> {
  const region = String(args.region ?? "").trim();
  const country = String(args.country ?? "").trim();
  const limit = clampLimit(args.limit, DEFAULT_COURSE_LIMIT, MAX_COURSE_LIMIT);

  const { data, error } = await deps.supabase.rpc("ai_search_golf_courses", {
    p_query: "",
    p_limit: Math.max(limit, 20),
  });

  if (error) {
    return {
      ok: false,
      tool: "get_top_rated_courses",
      summary: "Top-rated course lookup failed.",
      error: error.message,
    };
  }

  let courses = (data ?? []) as RetrievedCourse[];

  if (region) {
    courses = courses.filter((course) => courseMatchesRegion(course, region));
  }
  if (country) {
    const token = country.toLowerCase();
    courses = courses.filter((course) => (course.country ?? "").toLowerCase().includes(token));
  }

  courses = courses
    .filter((course) => (course.avg_rating ?? 0) > 0 || (course.round_count ?? 0) > 0)
    .sort((left, right) => {
      const ratingDiff = (right.avg_rating ?? 0) - (left.avg_rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (right.round_count ?? 0) - (left.round_count ?? 0);
    })
    .slice(0, limit);

  addCourses(store, courses);
  store.sources.add("Course directory");
  store.sources.add("Member reviews");

  return {
    ok: true,
    tool: "get_top_rated_courses",
    summary: courses.length > 0
      ? `Returning ${courses.length} top-rated course${courses.length === 1 ? "" : "s"}${region ? ` in ${region}` : ""}.`
      : "No rated courses matched the requested region yet.",
  };
}

async function travelMatchesTool(
  deps: ConciergeToolDeps,
  store: ConciergeToolStore,
  args: Record<string, unknown>,
): Promise<ConciergeToolResult> {
  const destination = String(args.destination ?? "").trim();
  if (destination.length < 2) {
    return {
      ok: false,
      tool: "get_member_travel_matches",
      summary: "Travel destination is required.",
      blocked: true,
      needsClarification: true,
      clarificationPrompt: "Which destination should I look for in member travel plans?",
    };
  }

  const limit = clampLimit(args.limit, DEFAULT_MEMBER_LIMIT, MAX_MEMBER_LIMIT);
  const { data, error } = await deps.supabase.rpc("ai_search_portal_members", {
    p_filters: { travel: destination },
    p_limit: limit,
  });

  if (error) {
    return {
      ok: false,
      tool: "get_member_travel_matches",
      summary: "Travel match lookup failed.",
      error: error.message,
    };
  }

  const plan = planMemberRetrieval(deps.question, "find_members");
  let members = ((data ?? []) as RetrievedMember[]).filter(
    (member) => !deps.pendingIntroUserIds.has(member.user_id),
  );
  members = filterMembersByRetrievalCriteria(members, {
    ...plan,
    memberFilters: { ...plan.memberFilters, travel: destination },
  });

  addMembers(store, members);
  store.sources.add("Member profiles");

  return {
    ok: true,
    tool: "get_member_travel_matches",
    summary: members.length > 0
      ? `Found ${members.length} member${members.length === 1 ? "" : "s"} traveling to ${destination}.`
      : `No members currently list travel plans to ${destination}.`,
  };
}

async function relationshipStateTool(
  deps: ConciergeToolDeps,
  store: ConciergeToolStore,
  args: Record<string, unknown>,
): Promise<ConciergeToolResult> {
  const memberId = String(args.member_id ?? "").trim();
  if (!memberId) {
    return {
      ok: false,
      tool: "get_relationship_state",
      summary: "member_id is required.",
    };
  }

  const { data: introRows } = await deps.supabase
    .from("introduction_requests")
    .select("sender_id, receiver_id, status")
    .or(`sender_id.eq.${deps.viewerId},receiver_id.eq.${deps.viewerId}`)
    .or(`sender_id.eq.${memberId},receiver_id.eq.${memberId}`);

  let state: ConciergeRelationshipState = "none";

  for (const row of introRows ?? []) {
    const involvesPair =
      (row.sender_id === deps.viewerId && row.receiver_id === memberId) ||
      (row.sender_id === memberId && row.receiver_id === deps.viewerId);
    if (!involvesPair) continue;

    const status = String(row.status ?? "").toLowerCase();
    if (status === "accepted") {
      state = "connected";
      break;
    }
    if (status === "pending") {
      state = row.sender_id === deps.viewerId ? "pending_sent" : "pending_received";
    }
  }

  if (state === "none") {
    const { data: messageRows } = await deps.supabase
      .from("private_messages")
      .select("sender_id, receiver_id, introduction_request_id")
      .is("introduction_request_id", null)
      .or(
        `and(sender_id.eq.${deps.viewerId},receiver_id.eq.${memberId}),and(sender_id.eq.${memberId},receiver_id.eq.${deps.viewerId})`,
      )
      .limit(1);

    if ((messageRows ?? []).length > 0) {
      state = "grandfather_thread_messageable";
    }
  }

  store.relationshipStates.set(memberId, state);

  return {
    ok: true,
    tool: "get_relationship_state",
    summary: `Relationship with ${memberId}: ${state}.`,
  };
}

async function memberRoundSummaryTool(
  deps: ConciergeToolDeps,
  store: ConciergeToolStore,
  args: Record<string, unknown>,
): Promise<ConciergeToolResult> {
  const memberIds = Array.isArray(args.member_ids)
    ? args.member_ids.map((id) => String(id)).filter(Boolean)
    : [];
  const allowedIds = memberIds.filter((id) => store.members.has(id));

  if (allowedIds.length === 0) {
    return {
      ok: false,
      tool: "get_member_round_summary",
      summary: "No allowed member IDs were provided from prior tool results.",
    };
  }

  const { data, error } = await deps.supabase.rpc("ai_member_round_summary", {
    p_user_ids: allowedIds,
  });

  if (error) {
    return {
      ok: false,
      tool: "get_member_round_summary",
      summary: "Round summary lookup failed.",
      error: error.message,
    };
  }

  let rounds = (data ?? []) as RoundSummary[];
  const courseName = String(args.course_name ?? "").trim().toLowerCase();
  if (courseName) {
    rounds = rounds.filter((round) => round.course_name.toLowerCase().includes(courseName));
  }

  const limit = clampLimit(args.limit, 20, 40);
  rounds = rounds.slice(0, limit);
  store.rounds.push(...rounds);
  store.sources.add("Member reviews");

  return {
    ok: true,
    tool: "get_member_round_summary",
    summary: rounds.length > 0
      ? `Returned ${rounds.length} logged round${rounds.length === 1 ? "" : "s"}.`
      : "No logged rounds matched the requested members or course.",
  };
}

export async function executeConciergeTool(
  tool: ConciergeToolName,
  args: Record<string, unknown>,
  deps: ConciergeToolDeps,
  store: ConciergeToolStore,
): Promise<ConciergeToolResult> {
  switch (tool) {
    case "search_members":
      return searchMembersTool(deps, store, args);
    case "search_courses":
      return searchCoursesTool(deps, store, args);
    case "get_members_who_played_course":
      return membersWhoPlayedCourseTool(deps, store, args);
    case "get_course_member_stats":
      return courseMemberStatsTool(deps, store, args);
    case "get_top_rated_courses":
      return topRatedCoursesTool(deps, store, args);
    case "get_member_travel_matches":
      return travelMatchesTool(deps, store, args);
    case "get_relationship_state":
      return relationshipStateTool(deps, store, args);
    case "get_member_round_summary":
      return memberRoundSummaryTool(deps, store, args);
    default:
      return {
        ok: false,
        tool,
        summary: "Unknown tool.",
      };
  }
}

export function isRankingQuestion(question: string): boolean {
  return isGlobalCourseRankingQuestion(question);
}
