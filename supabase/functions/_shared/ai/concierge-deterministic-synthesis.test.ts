import { describe, expect, it } from "vitest";
import { buildDeterministicConciergeResponse } from "./concierge-deterministic-synthesis.ts";
import type { ConciergeToolTraceEntry } from "./openai-agent.ts";
import type { CourseMemberStats } from "./concierge-tools.ts";
import type { RetrievedCourse, RetrievedMember } from "./types.ts";

const MEMBER: RetrievedMember = {
  user_id: "11111111-1111-1111-1111-111111111111",
  full_name: "Jake QA",
  primary_club: "Sebonack Member Club",
  based_in: "Southampton, NY",
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
};

const RATED_COURSE: RetrievedCourse = {
  id: "33333333-3333-3333-3333-333333333333",
  name: "Sebonack Golf Club",
  slug: "sebonack-golf-club",
  city: "Southampton",
  region: "New York",
  country: "USA",
  course_type: "links",
  access_type: "private",
  description: null,
  round_count: 12,
  member_count: 4,
  recommend_pct: 100,
  avg_rating: 9.4,
  latest_activity_at: "2026-01-01T00:00:00Z",
};

const DIRECTORY_COURSE: RetrievedCourse = {
  ...RATED_COURSE,
  id: "55555555-5555-5555-5555-555555555555",
  name: "St Andrews Old Course",
  region: "Scotland",
  country: "Scotland",
  round_count: 0,
  member_count: 0,
  recommend_pct: null,
  avg_rating: null,
};

function trace(...entries: ConciergeToolTraceEntry[]): ConciergeToolTraceEntry[] {
  return entries;
}

describe("buildDeterministicConciergeResponse", () => {
  it("writes concise member location copy", () => {
    const response = buildDeterministicConciergeResponse({
      question: "Who should I connect with in Palm Beach?",
      toolTrace: trace({
        tool: "search_members",
        args: { location: "Palm Beach", limit: 8 },
        result: { ok: true, tool: "search_members", summary: "2 members" },
      }),
      members: [MEMBER, { ...MEMBER, user_id: "22222222-2222-2222-2222-222222222222", full_name: "Pat QA" }],
      courses: [],
      courseStats: [],
    });

    expect(response.answer).toContain("2 EliteTee members");
    expect(response.answer).toContain("Palm Beach");
    expect(response.memberIds).toHaveLength(2);
  });

  it("writes played-course copy for a single member", () => {
    const response = buildDeterministicConciergeResponse({
      question: "Who has played Sebonack?",
      toolTrace: trace({
        tool: "get_members_who_played_course",
        args: { course_name: "Sebonack", limit: 8 },
        result: { ok: true, tool: "get_members_who_played_course", summary: "1 member" },
      }),
      members: [MEMBER],
      courses: [RATED_COURSE],
      courseStats: [],
    });

    expect(response.answer).toContain("Jake QA");
    expect(response.answer).toContain("played Sebonack");
  });

  it("writes course opinion copy from stats", () => {
    const stats: CourseMemberStats = {
      course_id: RATED_COURSE.id,
      course_name: RATED_COURSE.name,
      avg_rating: 9.4,
      recommend_pct: 100,
      round_count: 1,
      member_count: 1,
      latest_activity_at: "2026-01-01T00:00:00Z",
    };

    const response = buildDeterministicConciergeResponse({
      question: "What do members think of Sebonack?",
      toolTrace: trace({
        tool: "get_course_member_stats",
        args: { course_name: "Sebonack" },
        result: { ok: true, tool: "get_course_member_stats", summary: "stats" },
      }),
      members: [],
      courses: [RATED_COURSE],
      courseStats: [stats],
    });

    expect(response.answer).toContain("9.4 average");
    expect(response.answer).toContain("100%");
  });

  it("writes top-rated course copy", () => {
    const response = buildDeterministicConciergeResponse({
      question: "Which courses have EliteTee members rated highest?",
      toolTrace: trace({
        tool: "get_top_rated_courses",
        args: { limit: 8 },
        result: { ok: true, tool: "get_top_rated_courses", summary: "3 courses" },
      }),
      members: [],
      courses: [RATED_COURSE],
      courseStats: [],
    });

    expect(response.answer).toContain("highest-rated courses");
    expect(response.courseIds).toEqual([RATED_COURSE.id]);
  });

  it("handles compound questions when both halves have data", () => {
    const scotlandMember = {
      ...MEMBER,
      user_id: "44444444-4444-4444-4444-444444444444",
      full_name: "Scotland Traveler",
      traveling_to: "Scotland",
    };
    const scotlandRated = {
      ...RATED_COURSE,
      id: "66666666-6666-6666-6666-666666666666",
      name: "Carnoustie Golf Links",
      region: "Scotland",
      country: "Scotland",
    };

    const response = buildDeterministicConciergeResponse({
      question:
        "I'm going to Scotland. What courses have members liked there and who should I connect with?",
      toolTrace: trace(
        {
          tool: "get_top_rated_courses",
          args: { region: "Scotland", limit: 5 },
          result: { ok: true, tool: "get_top_rated_courses", summary: "1 course" },
        },
        {
          tool: "get_member_travel_matches",
          args: { destination: "Scotland", limit: 5 },
          result: { ok: true, tool: "get_member_travel_matches", summary: "1 member" },
        },
      ),
      members: [scotlandMember],
      courses: [scotlandRated],
      courseStats: [],
    });

    expect(response.answer).toContain("Scotland");
    expect(response.memberIds).toHaveLength(1);
    expect(response.courseIds).toHaveLength(1);
  });

  it("handles compound questions when only the member half has data", () => {
    const scotlandMember = {
      ...MEMBER,
      user_id: "44444444-4444-4444-4444-444444444444",
      full_name: "Scotland Traveler",
      traveling_to: "Scotland",
    };

    const response = buildDeterministicConciergeResponse({
      question:
        "I'm going to Scotland. What courses have members liked there and who should I connect with?",
      toolTrace: trace(
        {
          tool: "get_top_rated_courses",
          args: { region: "Scotland", limit: 5 },
          result: {
            ok: true,
            tool: "get_top_rated_courses",
            summary: "No rated courses matched the requested region yet.",
          },
        },
        {
          tool: "get_member_travel_matches",
          args: { destination: "Scotland", limit: 5 },
          result: { ok: true, tool: "get_member_travel_matches", summary: "1 member" },
        },
      ),
      members: [scotlandMember],
      courses: [],
      courseStats: [],
    });

    expect(response.answer).toContain("member-rated Scotland courses");
    expect(response.memberIds).toHaveLength(1);
    expect(response.courseIds).toHaveLength(0);
  });

  it("handles compound questions when only the course half has data", () => {
    const response = buildDeterministicConciergeResponse({
      question:
        "I'm going to Scotland. What courses have members liked there and who should I connect with?",
      toolTrace: trace(
        {
          tool: "get_top_rated_courses",
          args: { region: "Scotland", limit: 5 },
          result: { ok: true, tool: "get_top_rated_courses", summary: "1 course" },
        },
        {
          tool: "get_member_travel_matches",
          args: { destination: "Scotland", limit: 5 },
          result: { ok: true, tool: "get_member_travel_matches", summary: "0 members" },
        },
      ),
      members: [],
      courses: [{ ...RATED_COURSE, region: "Scotland", country: "Scotland" }],
      courseStats: [],
    });

    expect(response.answer).toContain("highest-rated");
    expect(response.memberIds).toHaveLength(0);
    expect(response.courseIds).toHaveLength(1);
  });

  it("returns insufficient_data when neither compound half has data", () => {
    const response = buildDeterministicConciergeResponse({
      question:
        "I'm going to Scotland. What courses have members liked there and who should I connect with?",
      toolTrace: trace(
        {
          tool: "get_top_rated_courses",
          args: { region: "Scotland", limit: 5 },
          result: { ok: true, tool: "get_top_rated_courses", summary: "0 courses" },
        },
        {
          tool: "get_member_travel_matches",
          args: { destination: "Scotland", limit: 5 },
          result: { ok: true, tool: "get_member_travel_matches", summary: "0 members" },
        },
      ),
      members: [],
      courses: [],
      courseStats: [],
    });

    expect(response.status).toBe("insufficient_data");
    expect(response.memberIds).toHaveLength(0);
    expect(response.courseIds).toHaveLength(0);
  });

  it("labels directory-only courses separately when included", () => {
    const response = buildDeterministicConciergeResponse({
      question:
        "I'm going to Scotland. What courses have members liked there and who should I connect with?",
      toolTrace: trace(
        {
          tool: "get_top_rated_courses",
          args: { region: "Scotland", limit: 5 },
          result: { ok: true, tool: "get_top_rated_courses", summary: "0 courses" },
        },
        {
          tool: "get_member_travel_matches",
          args: { destination: "Scotland", limit: 5 },
          result: { ok: true, tool: "get_member_travel_matches", summary: "1 member" },
        },
        {
          tool: "search_courses",
          args: { region: "Scotland", limit: 5 },
          result: { ok: true, tool: "search_courses", summary: "1 directory course" },
        },
      ),
      members: [MEMBER],
      courses: [DIRECTORY_COURSE],
      courseStats: [],
    });

    expect(response.answer).toContain("not member favorites");
    expect(response.courseIds).toEqual([DIRECTORY_COURSE.id]);
  });
});
