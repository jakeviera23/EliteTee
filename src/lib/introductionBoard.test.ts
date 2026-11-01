import { describe, expect, it } from "vitest";
import type { IntroductionRequestRecord } from "../types/introductionRequest";
import {
  buildIntroductionTimeline,
  categorizeIntroductionRequests,
  countIntroductionTabs,
  filterOwnIntroductionRequests,
  getIntroductionCounterpart,
  isIntroductionParticipant,
  pickDefaultIntroductionTab,
  resolveDirectMessageTarget,
} from "./introductionBoard";

function request(
  overrides: Partial<IntroductionRequestRecord> & Pick<IntroductionRequestRecord, "id">,
): IntroductionRequestRecord {
  return {
    sender_id: "sender-1",
    receiver_id: "receiver-1",
    status: "pending",
    request_type: "General Introduction",
    message: "Would love to connect.",
    created_at: "2026-07-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("categorizeIntroductionRequests", () => {
  it("splits pending requests into incoming and sent without duplicates", () => {
    const categorized = categorizeIntroductionRequests(
      [
        request({ id: "1", sender_id: "other", receiver_id: "me" }),
        request({ id: "2", sender_id: "me", receiver_id: "other" }),
        request({ id: "3", status: "accepted", sender_id: "me", receiver_id: "other" }),
        request({ id: "4", status: "declined", sender_id: "other", receiver_id: "me" }),
      ],
      "me",
    );

    expect(categorized.incoming.map((item) => item.id)).toEqual(["1"]);
    expect(categorized.sent.map((item) => item.id)).toEqual(["2"]);
    expect(categorized.accepted.map((item) => item.id)).toEqual(["3"]);
    expect(categorized.declined.map((item) => item.id)).toEqual(["4"]);

    const allIds = [
      ...categorized.incoming,
      ...categorized.sent,
      ...categorized.accepted,
      ...categorized.declined,
    ].map((item) => item.id);

    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("never shows introductions between other members", () => {
    const categorized = categorizeIntroductionRequests(
      [
        request({ id: "1", status: "accepted", sender_id: "a", receiver_id: "b" }),
        request({ id: "2", status: "declined", sender_id: "b", receiver_id: "c" }),
        request({ id: "3", status: "pending", sender_id: "c", receiver_id: "a" }),
      ],
      "me",
    );

    expect(countIntroductionTabs(categorized)).toEqual({
      incoming: 0,
      sent: 0,
      accepted: 0,
      declined: 0,
    });
  });
});

describe("filterOwnIntroductionRequests", () => {
  it("keeps only requests the member sent or received", () => {
    const rows = [
      request({ id: "1", sender_id: "me", receiver_id: "x" }),
      request({ id: "2", sender_id: "x", receiver_id: "me" }),
      request({ id: "3", sender_id: "x", receiver_id: "y" }),
    ];

    expect(filterOwnIntroductionRequests(rows, "me").map((row) => row.id)).toEqual(["1", "2"]);
    expect(filterOwnIntroductionRequests(rows, null)).toEqual([]);
    expect(isIntroductionParticipant(rows[2], "me")).toBe(false);
  });
});

describe("resolveDirectMessageTarget", () => {
  it("routes accepted introductions to the other participant for direct messages", () => {
    const target = resolveDirectMessageTarget(
      request({
        id: "1",
        status: "accepted",
        sender_id: "me",
        receiver_id: "member-2",
        receiver_name: "Jordan Lee",
      }),
      "me",
    );

    expect(target).toEqual({ userId: "member-2", memberName: "Jordan Lee" });
  });

  it("identifies incoming counterpart as the sender", () => {
    const counterpart = getIntroductionCounterpart(
      request({ id: "1", sender_id: "member-3", sender_name: "Alex Kim", receiver_id: "me" }),
      "me",
    );

    expect(counterpart).toMatchObject({
      userId: "member-3",
      name: "Alex Kim",
      isIncoming: true,
    });
  });
});

describe("pickDefaultIntroductionTab", () => {
  it("prefers incoming pending requests", () => {
    const categorized = categorizeIntroductionRequests(
      [request({ id: "1", sender_id: "a", receiver_id: "me" })],
      "me",
    );

    expect(pickDefaultIntroductionTab(categorized)).toBe("incoming");
    expect(countIntroductionTabs(categorized).incoming).toBe(1);
  });
});

describe("buildIntroductionTimeline", () => {
  it("marks accepted requests as introduced", () => {
    expect(buildIntroductionTimeline(request({ id: "1", status: "accepted" }))).toEqual([
      "Requested",
      "Accepted",
      "Introduced",
    ]);
  });
});
