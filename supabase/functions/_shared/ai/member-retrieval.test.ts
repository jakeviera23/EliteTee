import { describe, expect, it } from "vitest";
import type { RetrievedMember } from "./types.ts";
import {
  evaluateMemberRetrievalGate,
  filterMembersByRetrievalCriteria,
  shouldReturnInsufficientAfterMemberRetrieval,
} from "./member-retrieval.ts";
import { buildRetrievalFilters, classifyIntent } from "./intent.ts";

function sampleMember(overrides: Partial<RetrievedMember> & Pick<RetrievedMember, "user_id">): RetrievedMember {
  return {
    full_name: "Sample Member",
    primary_club: "Sample Club",
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

describe("manual QA orchestration", () => {
  it("1. Palm Beach uses location-specific retrieval and rejects unrelated post-filter results", () => {
    const question = "Who should I connect with in Palm Beach?";
    const intent = classifyIntent(question);
    const gate = evaluateMemberRetrievalGate(question, intent);

    expect(intent).toBe("recommend_introductions");
    expect(gate.action).toBe("retrieve");
    if (gate.action !== "retrieve") return;

    expect(gate.plan.memberFilters.location).toBe("Palm Beach");
    expect(gate.plan.skipBroadMemberRpc).toBe(false);

    const unrelated = filterMembersByRetrievalCriteria(
      [sampleMember({ user_id: "1", based_in: "Stockholm, Sweden" })],
      gate.plan,
    );
    expect(unrelated).toHaveLength(0);
    expect(shouldReturnInsufficientAfterMemberRetrieval(question, gate.plan, unrelated)).toBe("no_data");
  });

  it("2. Sebonack uses course-only retrieval without broad member RPC", () => {
    const question = "Who has played Sebonack?";
    const intent = classifyIntent(question);
    const gate = evaluateMemberRetrievalGate(question, intent);

    expect(intent).toBe("find_members");
    expect(gate.action).toBe("retrieve");
    if (gate.action !== "retrieve") return;

    expect(gate.plan.courseName).toBe("Sebonack");
    expect(gate.plan.skipBroadMemberRpc).toBe(true);
  });

  it("3. Scotland travel ignores EliteTee and keeps travel-specific post filtering", () => {
    const question = "Who in EliteTee is traveling to Scotland?";
    const intent = classifyIntent(question);
    const gate = evaluateMemberRetrievalGate(question, intent);

    expect(gate.action).toBe("retrieve");
    if (gate.action !== "retrieve") return;

    expect(gate.plan.memberFilters.location).toBe("");
    expect(gate.plan.memberFilters.travel).toBe("Scotland");

    const unrelated = filterMembersByRetrievalCriteria(
      [sampleMember({ user_id: "1", based_in: "Utah, USA", traveling_to: "Park City" })],
      gate.plan,
    );
    expect(unrelated).toHaveLength(0);
  });

  it("4. generic introduction at a course is blocked before retrieval", () => {
    const question = "Who can help with an introduction at a course?";
    const intent = classifyIntent(question);
    const gate = evaluateMemberRetrievalGate(question, intent);

    expect(intent).toBe("recommend_introductions");
    expect(gate.action).toBe("reject");
    if (gate.action === "reject") {
      expect(gate.reason).toBe("need_more_detail");
    }
  });

  it("5. highest-rated courses use unfiltered course ranking", () => {
    const question = "Which courses have EliteTee members rated highest?";
    const intent = classifyIntent(question);
    const filters = buildRetrievalFilters(question, intent);

    expect(intent).toBe("find_courses");
    expect(filters.courseQuery).toBe("");
    expect(filters.courseDirectoryFilters.locationQuery).toBe("");
  });

  it("6. Philadelphia uses location-specific retrieval and rejects unrelated post-filter results", () => {
    const question = "Who around Philadelphia might be worth connecting with?";
    const intent = classifyIntent(question);
    const gate = evaluateMemberRetrievalGate(question, intent);

    expect(intent).toBe("recommend_introductions");
    expect(gate.action).toBe("retrieve");
    if (gate.action !== "retrieve") return;

    expect(gate.plan.memberFilters.location).toBe("Philadelphia");
    expect(gate.plan.skipBroadMemberRpc).toBe(false);

    const unrelated = filterMembersByRetrievalCriteria(
      [
        sampleMember({ user_id: "1", based_in: "St Andrews, Scotland" }),
        sampleMember({ user_id: "2", based_in: "Northern Ireland" }),
      ],
      gate.plan,
    );
    expect(unrelated).toHaveLength(0);
    expect(shouldReturnInsufficientAfterMemberRetrieval(question, gate.plan, unrelated)).toBe("no_data");
  });

  it("named-course introduction uses course bridge without broad member RPC", () => {
    const question = "Who can help with an introduction at Sebonack?";
    const gate = evaluateMemberRetrievalGate(question, "recommend_introductions");

    expect(gate.action).toBe("retrieve");
    if (gate.action !== "retrieve") return;

    expect(gate.plan.courseName).toBe("Sebonack");
    expect(gate.plan.skipBroadMemberRpc).toBe(true);
  });

  it("course bridge post-filter keeps only course members when broad RPC results were merged", () => {
    const question = "Who has played Sebonack?";
    const gate = evaluateMemberRetrievalGate(question, "find_members");
    if (gate.action !== "retrieve") return;

    const courseMemberIds = new Set(["course-member"]);
    const filtered = filterMembersByRetrievalCriteria(
      [
        sampleMember({ user_id: "broad-1", based_in: "Utah, USA" }),
        sampleMember({ user_id: "course-member", based_in: "Southampton, NY" }),
      ],
      gate.plan,
      courseMemberIds,
    );

    expect(filtered.map((member) => member.user_id)).toEqual(["course-member"]);
  });
});
