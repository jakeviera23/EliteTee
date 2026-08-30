import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { planConciergeToolsFallback } from "./concierge-planner-fallback.ts";
import { runConciergeOrchestrator } from "./concierge-orchestrator.ts";
import { MockConciergeAgent } from "./openai-agent.ts";
import type { RetrievedCourse, RetrievedMember } from "./types.ts";
import {
  MAX_CONCIERGE_RECOMMENDATIONS,
  sanitizeAnswerProse,
  validateConciergeStructuredResponse,
} from "./validate-response.ts";

const PALM_BEACH_MEMBER: RetrievedMember = {
  user_id: "11111111-1111-1111-1111-111111111111",
  full_name: "Palm Beach Member",
  primary_club: "Palm Beach CC",
  based_in: "Palm Beach, FL",
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

const UNRELATED_MEMBER: RetrievedMember = {
  ...PALM_BEACH_MEMBER,
  user_id: "22222222-2222-2222-2222-222222222222",
  full_name: "Stockholm Member",
  based_in: "Stockholm, Sweden",
};

const SEBONACK_COURSE: RetrievedCourse = {
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
  recommend_pct: 92,
  avg_rating: 4.8,
  latest_activity_at: "2026-01-01T00:00:00Z",
};

function createMockSupabase(options?: {
  members?: RetrievedMember[];
  courses?: RetrievedCourse[];
  courseMembers?: RetrievedMember[];
}) {
  const members = options?.members ?? [];
  const courses = options?.courses ?? [];
  const courseMembers = options?.courseMembers ?? [];

  return {
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "ai_search_portal_members") {
        const location = String((args.p_filters as Record<string, string>)?.location ?? "").toLowerCase();
        const travel = String((args.p_filters as Record<string, string>)?.travel ?? "").toLowerCase();
        const filtered = members.filter((member) => {
          const profile = `${member.based_in} ${member.traveling_to}`.toLowerCase();
          if (location && !profile.includes(location)) return false;
          if (travel && !profile.includes(travel)) return false;
          return true;
        });
        return { data: filtered, error: null };
      }

      if (name === "ai_search_golf_courses") {
        const query = String(args.p_query ?? "").toLowerCase();
        if (!query) return { data: courses, error: null };
        return {
          data: courses.filter((course) => course.name.toLowerCase().includes(query)),
          error: null,
        };
      }

      if (name === "ai_members_by_course") {
        return { data: courseMembers, error: null };
      }

      if (name === "ai_member_round_summary") {
        return { data: [], error: null };
      }

      return { data: [], error: null };
    }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          or: vi.fn(async () => ({ data: [] })),
          is: vi.fn(() => ({
            or: vi.fn(async () => ({ data: [] })),
            limit: vi.fn(async () => ({ data: [] })),
          })),
          limit: vi.fn(async () => ({ data: [] })),
        })),
      })),
    })),
  } as unknown as SupabaseClient;
}

function createDeterministicOnlyAgent(question: string) {
  const base = new MockConciergeAgent((q) => planConciergeToolsFallback(q));
  return {
    runToolPlanning: base.runToolPlanning.bind(base),
    synthesize: async () => {
      throw new Error("OPENAI_NOT_CONFIGURED");
    },
  };
}

describe("runConciergeOrchestrator", () => {
  it("blocks private-data requests before tool execution", async () => {
    const supabase = createMockSupabase({ members: [PALM_BEACH_MEMBER] });
    const result = await runConciergeOrchestrator({
      supabase,
      viewerId: "viewer-id",
      question: "Give me every member's email",
      requestor: null,
      pendingIntroUserIds: new Set(),
    });

    expect(result.status).toBe("unsupported");
    expect(result.members).toHaveLength(0);
    expect(result.answer).toContain("private account information");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("returns needs_clarification for generic introduction-at-a-course questions", async () => {
    const result = await runConciergeOrchestrator({
      supabase: createMockSupabase(),
      viewerId: "viewer-id",
      question: "Who can help with an introduction at a course?",
      requestor: null,
      pendingIntroUserIds: new Set(),
      agent: new MockConciergeAgent((question) => planConciergeToolsFallback(question)),
    });

    expect(result.status).toBe("needs_clarification");
    expect(result.members).toHaveLength(0);
    expect(result.followUps.length).toBeGreaterThan(0);
  });

  it("does not leak unrelated members for Philadelphia location questions", async () => {
    const result = await runConciergeOrchestrator({
      supabase: createMockSupabase({
        members: [UNRELATED_MEMBER],
      }),
      viewerId: "viewer-id",
      question: "Who around Philadelphia might be worth connecting with?",
      requestor: null,
      pendingIntroUserIds: new Set(),
      agent: new MockConciergeAgent((question) => planConciergeToolsFallback(question)),
    });

    expect(result.status).toBe("insufficient_data");
    expect(result.members).toHaveLength(0);
  });

  it("resolves named course before returning members who played", async () => {
    const result = await runConciergeOrchestrator({
      supabase: createMockSupabase({
        courses: [SEBONACK_COURSE],
        courseMembers: [PALM_BEACH_MEMBER],
      }),
      viewerId: "viewer-id",
      question: "Who has played Sebonack?",
      requestor: null,
      pendingIntroUserIds: new Set(),
      agent: new MockConciergeAgent((question) => planConciergeToolsFallback(question)),
    });

    expect(result.status).toBe("ok");
    expect(result.members.map((member) => member.user_id)).toEqual([PALM_BEACH_MEMBER.user_id]);
  });

  it("handles compound Scotland questions with partial course data honestly", async () => {
    const scotlandMember: RetrievedMember = {
      ...PALM_BEACH_MEMBER,
      user_id: "44444444-4444-4444-4444-444444444444",
      full_name: "Scotland Traveler",
      based_in: "Edinburgh",
      traveling_to: "Scotland",
    };
    const scotlandCourse: RetrievedCourse = {
      ...SEBONACK_COURSE,
      id: "55555555-5555-5555-5555-555555555555",
      name: "St Andrews Old Course",
      region: "Scotland",
      country: "Scotland",
      avg_rating: null,
      round_count: 0,
      member_count: 0,
      recommend_pct: null,
    };

    const result = await runConciergeOrchestrator({
      supabase: createMockSupabase({
        members: [scotlandMember],
        courses: [scotlandCourse],
      }),
      viewerId: "viewer-id",
      question:
        "I'm going to Scotland. What courses have members liked there and who should I connect with?",
      requestor: null,
      pendingIntroUserIds: new Set(),
      agent: createDeterministicOnlyAgent(
        "I'm going to Scotland. What courses have members liked there and who should I connect with?",
      ),
    });

    expect(result.status).toBe("ok");
    expect(result.members.length).toBeGreaterThan(0);
    expect(result.courses).toHaveLength(0);
    expect(result.answer).toContain("member-rated Scotland courses");
  });

  it("handles compound Scotland course + member questions with multiple tools", async () => {
    const scotlandMember: RetrievedMember = {
      ...PALM_BEACH_MEMBER,
      user_id: "44444444-4444-4444-4444-444444444444",
      full_name: "Scotland Traveler",
      based_in: "Edinburgh",
      traveling_to: "Scotland",
    };
    const scotlandCourse: RetrievedCourse = {
      ...SEBONACK_COURSE,
      id: "55555555-5555-5555-5555-555555555555",
      name: "St Andrews Old Course",
      region: "Scotland",
      country: "Scotland",
    };

    const agent = new MockConciergeAgent((question) => planConciergeToolsFallback(question));
    const result = await runConciergeOrchestrator({
      supabase: createMockSupabase({
        members: [scotlandMember],
        courses: [scotlandCourse],
      }),
      viewerId: "viewer-id",
      question:
        "I'm going to Scotland. What courses have members liked there and who should I connect with?",
      requestor: null,
      pendingIntroUserIds: new Set(),
      agent,
    });

    expect(result.status).toBe("ok");
    expect(result.courses.length).toBeGreaterThan(0);
    expect(result.members.length).toBeGreaterThan(0);
  });

  it("returns insufficient_data when tools return no genuine matches", async () => {
    const result = await runConciergeOrchestrator({
      supabase: createMockSupabase({ members: [], courses: [] }),
      viewerId: "viewer-id",
      question: "Who should I connect with in Palm Beach?",
      requestor: null,
      pendingIntroUserIds: new Set(),
      agent: new MockConciergeAgent((question) => planConciergeToolsFallback(question)),
    });

    expect(result.status).toBe("insufficient_data");
    expect(result.members).toHaveLength(0);
  });
});

describe("validateConciergeStructuredResponse", () => {
  it("rejects hallucinated member and course IDs", () => {
    const validated = validateConciergeStructuredResponse({
      response: {
        status: "ok",
        answer: "Meet these members.",
        memberIds: ["allowed-member", "fake-member"],
        courseIds: ["allowed-course", "fake-course"],
        reasons: [
          { entityType: "member", entityId: "fake-member", reason: "Same city" },
          { entityType: "member", entityId: "allowed-member", reason: "Based in Palm Beach" },
        ],
      },
      allowedMemberIds: new Set(["allowed-member"]),
      allowedCourseIds: new Set(["allowed-course"]),
    });

    expect(validated.memberIds).toEqual(["allowed-member"]);
    expect(validated.courseIds).toEqual(["allowed-course"]);
    expect(validated.reasons).toHaveLength(1);
    expect(validated.reasons[0]?.entityId).toBe("allowed-member");
  });

  it("deduplicates member and course IDs while preserving order", () => {
    const validated = validateConciergeStructuredResponse({
      response: {
        status: "ok",
        answer: "Several matches.",
        memberIds: ["member-a", "member-a", "member-b", "member-b", "member-c"],
        courseIds: ["course-a", "course-a", "course-b"],
      },
      allowedMemberIds: new Set(["member-a", "member-b", "member-c"]),
      allowedCourseIds: new Set(["course-a", "course-b"]),
    });

    expect(validated.memberIds).toEqual(["member-a", "member-b", "member-c"]);
    expect(validated.courseIds).toEqual(["course-a", "course-b"]);
  });

  it("limits recommendations to five entities", () => {
    const allowedMembers = Array.from({ length: 8 }, (_, index) => `member-${index}`);
    const validated = validateConciergeStructuredResponse({
      response: {
        status: "ok",
        answer: "Several matches.",
        memberIds: allowedMembers,
        courseIds: [],
      },
      allowedMemberIds: new Set(allowedMembers),
      allowedCourseIds: new Set(),
      maxRecommendations: MAX_CONCIERGE_RECOMMENDATIONS,
    });

    expect(validated.memberIds).toHaveLength(5);
  });

  it("sanitizes raw profile array prose", () => {
    const sanitized = sanitizeAnswerProse('[{"user_id":"123","full_name":"Test"}]');
    expect(sanitized).not.toContain("user_id");
    expect(sanitized).toContain("EliteTee");
  });
});
