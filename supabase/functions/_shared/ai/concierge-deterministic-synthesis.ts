import type { ConciergeToolTraceEntry } from "./openai-agent.ts";
import type { ConciergeStructuredModelResponse } from "./openai-agent.ts";
import type { CourseMemberStats } from "./concierge-tools.ts";
import type { RetrievedCourse, RetrievedMember } from "./types.ts";

const MEMBER_TOOLS = new Set([
  "search_members",
  "get_member_travel_matches",
  "get_members_who_played_course",
]);

const RATED_COURSE_TOOLS = new Set([
  "get_top_rated_courses",
  "get_course_member_stats",
]);

const DIRECTORY_COURSE_TOOLS = new Set(["search_courses"]);

export type DeterministicSynthesisInput = {
  question: string;
  toolTrace: ConciergeToolTraceEntry[];
  members: RetrievedMember[];
  courses: RetrievedCourse[];
  courseStats: CourseMemberStats[];
  needsClarification?: boolean;
  clarificationPrompt?: string;
};

function isRatedCourse(course: RetrievedCourse): boolean {
  return (course.avg_rating ?? 0) > 0 || (course.round_count ?? 0) > 0;
}

function partitionCourses(courses: RetrievedCourse[]) {
  const rated: RetrievedCourse[] = [];
  const directoryOnly: RetrievedCourse[] = [];
  for (const course of courses) {
    if (isRatedCourse(course)) rated.push(course);
    else directoryOnly.push(course);
  }
  return { rated, directoryOnly };
}

function memberToolsCalled(toolTrace: ConciergeToolTraceEntry[]): boolean {
  return toolTrace.some((entry) => MEMBER_TOOLS.has(entry.tool));
}

function ratedCourseToolsCalled(toolTrace: ConciergeToolTraceEntry[]): boolean {
  return toolTrace.some((entry) => RATED_COURSE_TOOLS.has(entry.tool));
}

function directoryCourseToolsCalled(toolTrace: ConciergeToolTraceEntry[]): boolean {
  return toolTrace.some((entry) => DIRECTORY_COURSE_TOOLS.has(entry.tool));
}

function extractRegionLabel(toolTrace: ConciergeToolTraceEntry[]): string {
  for (const entry of toolTrace) {
    const region = String(entry.args.region ?? "").trim();
    if (region) return region;
    const country = String(entry.args.country ?? "").trim();
    if (country) return country;
    const destination = String(entry.args.destination ?? "").trim();
    if (destination) return destination;
    const location = String(entry.args.location ?? "").trim();
    if (location) return location;
  }
  return "that area";
}

function extractCourseName(toolTrace: ConciergeToolTraceEntry[], courses: RetrievedCourse[]): string {
  for (const entry of toolTrace) {
    const courseName = String(entry.args.course_name ?? "").trim();
    if (courseName) return courseName;
  }
  return courses[0]?.name ?? "that course";
}

function formatMemberCount(count: number): string {
  return count === 1 ? "1 EliteTee member" : `${count} EliteTee members`;
}

function buildMemberLocationAnswer(members: RetrievedMember[], regionLabel: string): string {
  const countLabel = formatMemberCount(members.length);
  return `I found ${countLabel} with ${regionLabel} relevance. Their profiles show local or travel ties to the area.`;
}

function buildPlayedCourseAnswer(members: RetrievedMember[], courseName: string): string {
  if (members.length === 1) {
    const name = members[0]?.full_name || "An EliteTee member";
    return `${name} is the EliteTee member currently logged as having played ${courseName}.`;
  }
  return `${formatMemberCount(members.length)} are currently logged as having played ${courseName}.`;
}

function buildCourseOpinionAnswer(stats: CourseMemberStats): string {
  const rating = stats.avg_rating != null ? stats.avg_rating.toFixed(1) : "n/a";
  const reviewLabel = stats.round_count === 1 ? "1 member review" : `${stats.round_count} member reviews`;
  const recommend = stats.recommend_pct != null
    ? `, with ${Math.round(stats.recommend_pct)}% saying they would play it again`
    : "";
  return `${stats.course_name} has a ${rating} average from ${reviewLabel}${recommend}.`;
}

function buildTopRatedAnswer(regionLabel: string | null): string {
  if (regionLabel) {
    return `These are the highest-rated courses in ${regionLabel} from EliteTee's current member data.`;
  }
  return "These are the highest-rated courses in EliteTee's current member data.";
}

function buildCompoundPartialAnswer(regionLabel: string, hasDirectoryCourses: boolean): string {
  const base =
    `EliteTee has members with ${regionLabel} travel relevance, but there aren't enough member-rated ${regionLabel} courses yet to rank confidently.`;
  if (hasDirectoryCourses) {
    return `${base} These directory listings are not member favorites yet.`;
  }
  return base;
}

function buildCompoundBothAnswer(regionLabel: string): string {
  return `Here are EliteTee members and member-rated courses with ${regionLabel} relevance.`;
}

function buildDirectoryOnlyAnswer(regionLabel: string): string {
  return `These courses appear in EliteTee's directory for ${regionLabel}, but they don't have member ratings yet.`;
}

export function buildDeterministicConciergeResponse(
  input: DeterministicSynthesisInput,
): ConciergeStructuredModelResponse {
  if (input.needsClarification) {
    const prompt = input.clarificationPrompt ?? "Which course are you asking about?";
    return {
      status: "needs_clarification",
      answer: prompt.startsWith("I can help") ? prompt : `I can help with that — ${prompt.charAt(0).toLowerCase()}${prompt.slice(1)}`,
      memberIds: [],
      courseIds: [],
      reasons: [],
      followUps: [],
    };
  }

  const { rated, directoryOnly } = partitionCourses(input.courses);
  const memberRequested = memberToolsCalled(input.toolTrace);
  const courseRequested = ratedCourseToolsCalled(input.toolTrace) || directoryCourseToolsCalled(input.toolTrace);
  const regionLabel = extractRegionLabel(input.toolTrace);
  const isCompound = memberRequested && courseRequested;

  if (input.members.length === 0 && rated.length === 0 && input.courseStats.length === 0 && directoryOnly.length === 0) {
    return {
      status: "insufficient_data",
      answer: "I don't have enough EliteTee data yet to answer that confidently.",
      memberIds: [],
      courseIds: [],
      reasons: [],
      followUps: [],
    };
  }

  if (isCompound) {
    const memberIds = input.members.slice(0, 5).map((member) => member.user_id);

    if (input.members.length > 0 && rated.length === 0) {
      const includeDirectory = directoryOnly.length > 0 && directoryCourseToolsCalled(input.toolTrace);
      return {
        status: "ok",
        answer: buildCompoundPartialAnswer(regionLabel, includeDirectory),
        memberIds,
        courseIds: includeDirectory ? directoryOnly.slice(0, 5).map((course) => course.id) : [],
        reasons: [],
        followUps: [],
      };
    }

    if (input.members.length === 0 && rated.length > 0) {
      return {
        status: "ok",
        answer: buildTopRatedAnswer(regionLabel),
        memberIds: [],
        courseIds: rated.slice(0, 5).map((course) => course.id),
        reasons: [],
        followUps: [],
      };
    }

    if (input.members.length > 0 && rated.length > 0) {
      return {
        status: "ok",
        answer: buildCompoundBothAnswer(regionLabel),
        memberIds,
        courseIds: rated.slice(0, 5).map((course) => course.id),
        reasons: [],
        followUps: [],
      };
    }

    if (directoryOnly.length > 0) {
      return {
        status: "ok",
        answer: buildDirectoryOnlyAnswer(regionLabel),
        memberIds: [],
        courseIds: directoryOnly.slice(0, 5).map((course) => course.id),
        reasons: [],
        followUps: [],
      };
    }
  }

  if (input.courseStats.length > 0 && input.members.length === 0) {
    const stats = input.courseStats[0];
    return {
      status: "ok",
      answer: stats ? buildCourseOpinionAnswer(stats) : "Here is the available course review data.",
      memberIds: [],
      courseIds: input.courses.slice(0, 5).map((course) => course.id),
      reasons: [],
      followUps: [],
    };
  }

  const playedCourseCall = input.toolTrace.find((entry) => entry.tool === "get_members_who_played_course");
  if (playedCourseCall && input.members.length > 0) {
    const courseName = extractCourseName(input.toolTrace, input.courses);
    return {
      status: "ok",
      answer: buildPlayedCourseAnswer(input.members, courseName),
      memberIds: input.members.slice(0, 5).map((member) => member.user_id),
      courseIds: [],
      reasons: [],
      followUps: [],
    };
  }

  if (rated.length > 0 && input.members.length === 0) {
    const topRatedCall = input.toolTrace.find((entry) => entry.tool === "get_top_rated_courses");
    const region = topRatedCall
      ? String(topRatedCall.args.region ?? topRatedCall.args.country ?? "").trim() || null
      : null;
    return {
      status: "ok",
      answer: buildTopRatedAnswer(region),
      memberIds: [],
      courseIds: rated.slice(0, 5).map((course) => course.id),
      reasons: [],
      followUps: [],
    };
  }

  if (input.members.length > 0) {
    return {
      status: "ok",
      answer: buildMemberLocationAnswer(input.members, regionLabel),
      memberIds: input.members.slice(0, 5).map((member) => member.user_id),
      courseIds: [],
      reasons: [],
      followUps: [],
    };
  }

  return {
    status: "insufficient_data",
    answer: "I don't have enough EliteTee data yet to answer that confidently.",
    memberIds: [],
    courseIds: [],
    reasons: [],
    followUps: [],
  };
}
