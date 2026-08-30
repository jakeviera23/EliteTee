import { describe, expect, it } from "vitest";
import { planConciergeToolsFallback } from "./concierge-planner-fallback.ts";

const TEN_EXAMPLE_QUESTIONS = [
  {
    question: "Who should I connect with in Palm Beach?",
    tools: ["search_members"],
    argsCheck: (calls: ReturnType<typeof planConciergeToolsFallback>["toolCalls"]) =>
      calls[0]?.args.location === "Palm Beach",
  },
  {
    question: "Who has played Sebonack?",
    tools: ["get_members_who_played_course"],
    argsCheck: (calls: ReturnType<typeof planConciergeToolsFallback>["toolCalls"]) =>
      calls[0]?.args.course_name === "Sebonack",
  },
  {
    question: "Who in EliteTee is traveling to Scotland?",
    tools: ["get_member_travel_matches"],
    argsCheck: (calls: ReturnType<typeof planConciergeToolsFallback>["toolCalls"]) =>
      calls[0]?.args.destination === "Scotland",
  },
  {
    question: "Who can help with an introduction at a course?",
    tools: [],
    needsClarification: true,
  },
  {
    question: "Which courses have EliteTee members rated highest?",
    tools: ["get_top_rated_courses"],
  },
  {
    question: "Who around Philadelphia might be worth connecting with?",
    tools: ["search_members"],
    argsCheck: (calls: ReturnType<typeof planConciergeToolsFallback>["toolCalls"]) =>
      calls[0]?.args.location === "Philadelphia",
  },
  {
    question: "I'm going to Scotland. What courses have members liked there and who should I connect with?",
    tools: ["get_top_rated_courses", "get_member_travel_matches"],
  },
  {
    question: "What do members think of Sebonack?",
    tools: ["get_course_member_stats"],
    argsCheck: (calls: ReturnType<typeof planConciergeToolsFallback>["toolCalls"]) =>
      calls[0]?.args.course_name === "Sebonack",
  },
  {
    question: "Who should I ask about playing Sebonack?",
    tools: ["get_members_who_played_course"],
    argsCheck: (calls: ReturnType<typeof planConciergeToolsFallback>["toolCalls"]) =>
      calls[0]?.args.course_name === "Sebonack",
  },
  {
    question: "What are the best courses members have reviewed in New York?",
    tools: ["get_top_rated_courses"],
    argsCheck: (calls: ReturnType<typeof planConciergeToolsFallback>["toolCalls"]) =>
      calls[0]?.args.region === "New York",
  },
] as const;

describe("planConciergeToolsFallback", () => {
  it.each(TEN_EXAMPLE_QUESTIONS.map((entry, index) => [index + 1, entry.question, entry] as const))(
    "routes example %i: %s",
    (_index, question, spec) => {
      const plan = planConciergeToolsFallback(question);

      if ("needsClarification" in spec && spec.needsClarification) {
        expect(plan.needsClarification).toBe(true);
        expect(plan.toolCalls).toHaveLength(0);
        return;
      }

      expect(plan.toolCalls.map((call) => call.tool)).toEqual(spec.tools);
      if ("argsCheck" in spec && spec.argsCheck) {
        expect(spec.argsCheck(plan.toolCalls)).toBe(true);
      }
    },
  );

  it("prefers course resolution before members-who-played for named courses", () => {
    const plan = planConciergeToolsFallback("Who has played Sebonack?");
    expect(plan.toolCalls[0]?.tool).toBe("get_members_who_played_course");
    expect(plan.toolCalls).toHaveLength(1);
  });

  it("uses ranking tool instead of literal course search for global ranking", () => {
    const plan = planConciergeToolsFallback("Which courses have EliteTee members rated highest?");
    expect(plan.toolCalls.some((call) => call.tool === "search_courses")).toBe(false);
    expect(plan.toolCalls[0]?.tool).toBe("get_top_rated_courses");
  });
});
