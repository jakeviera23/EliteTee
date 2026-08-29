import { describe, expect, it } from "vitest";
import type { IntroductionRequestRecord } from "../types/introductionRequest";
import {
  INTRODUCTION_MESSAGE_MIN_LENGTH,
  canDirectMessageMember,
  countMemberConnections,
  resolveMemberRelationshipCta,
  resolveMemberRelationshipCtaForPair,
  resolveMemberRelationshipState,
  validateIntroductionRequestMessage,
  type MemberRelationshipContext,
} from "./memberRelationships";

const CURRENT_USER_ID = "user-a";
const OTHER_USER_ID = "user-b";

function request(
  overrides: Partial<IntroductionRequestRecord> & Pick<IntroductionRequestRecord, "status">,
): IntroductionRequestRecord {
  return {
    id: overrides.id ?? "req-1",
    sender_id: overrides.sender_id ?? CURRENT_USER_ID,
    receiver_id: overrides.receiver_id ?? OTHER_USER_ID,
    status: overrides.status,
    request_type: "General Introduction",
    message: "Would love to connect about golf in the Hamptons.",
    created_at: overrides.created_at ?? "2026-06-01T00:00:00.000Z",
    accepted_at: overrides.accepted_at ?? null,
    response_message: overrides.response_message ?? null,
    sender_name: overrides.sender_name,
    receiver_name: overrides.receiver_name,
  };
}

describe("resolveMemberRelationshipState", () => {
  it("returns none when there is no relationship history", () => {
    expect(resolveMemberRelationshipState(CURRENT_USER_ID, OTHER_USER_ID, [])).toBe("none");
  });

  it("returns pending_sent for outgoing pending requests", () => {
    expect(
      resolveMemberRelationshipState(CURRENT_USER_ID, OTHER_USER_ID, [
        request({ status: "pending", sender_id: CURRENT_USER_ID, receiver_id: OTHER_USER_ID }),
      ]),
    ).toBe("pending_sent");
  });

  it("returns pending_received for incoming pending requests", () => {
    expect(
      resolveMemberRelationshipState(CURRENT_USER_ID, OTHER_USER_ID, [
        request({ status: "pending", sender_id: OTHER_USER_ID, receiver_id: CURRENT_USER_ID }),
      ]),
    ).toBe("pending_received");
  });

  it("returns connected when an accepted introduction exists", () => {
    expect(
      resolveMemberRelationshipState(CURRENT_USER_ID, OTHER_USER_ID, [
        request({ status: "accepted" }),
      ]),
    ).toBe("connected");
  });

  it("returns none after a declined request so a future request is allowed", () => {
    expect(
      resolveMemberRelationshipState(CURRENT_USER_ID, OTHER_USER_ID, [
        request({ status: "declined" }),
      ]),
    ).toBe("none");
  });
});

describe("resolveMemberRelationshipCta", () => {
  it("maps relationship states to the expected CTA labels", () => {
    expect(resolveMemberRelationshipCta("none")).toEqual({
      action: "request_introduction",
      label: "Request Introduction",
      primary: true,
    });
    expect(resolveMemberRelationshipCta("pending_sent")).toMatchObject({
      action: "pending_sent",
      label: "Request Pending",
      disabled: true,
    });
    expect(resolveMemberRelationshipCta("pending_received")).toEqual({
      action: "respond_to_request",
      label: "Respond to Request",
      primary: true,
    });
    expect(resolveMemberRelationshipCta("connected")).toEqual({
      action: "message",
      label: "Message",
      primary: true,
    });
  });

  it("maps compact pending_received labels to Respond", () => {
    expect(resolveMemberRelationshipCta("pending_received", { compact: true }).label).toBe(
      "Respond",
    );
  });
});

describe("resolveMemberRelationshipCtaForPair", () => {
  function context(
    overrides: Partial<MemberRelationshipContext> = {},
  ): Pick<MemberRelationshipContext, "introductionRequests" | "directThreadUserIds"> {
    return {
      introductionRequests: overrides.introductionRequests ?? [],
      directThreadUserIds: overrides.directThreadUserIds ?? new Set(),
    };
  }

  it("shows Request Introduction when there is no intro and no direct thread", () => {
    expect(
      resolveMemberRelationshipCtaForPair(CURRENT_USER_ID, OTHER_USER_ID, context()),
    ).toEqual({
      action: "request_introduction",
      label: "Request Introduction",
      primary: true,
    });
  });

  it("shows Message when a grandfathered direct thread exists without an accepted intro", () => {
    expect(
      resolveMemberRelationshipCtaForPair(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        context({ directThreadUserIds: new Set([OTHER_USER_ID]) }),
      ),
    ).toEqual({
      action: "message",
      label: "Message",
      primary: true,
    });
  });

  it("shows Message when members are connected via an accepted introduction", () => {
    expect(
      resolveMemberRelationshipCtaForPair(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        context({
          introductionRequests: [request({ status: "accepted" })],
        }),
      ),
    ).toEqual({
      action: "message",
      label: "Message",
      primary: true,
    });
  });

  it("shows Request Pending for an outgoing pending request without a direct thread", () => {
    expect(
      resolveMemberRelationshipCtaForPair(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        context({
          introductionRequests: [
            request({ status: "pending", sender_id: CURRENT_USER_ID, receiver_id: OTHER_USER_ID }),
          ],
        }),
      ),
    ).toMatchObject({
      action: "pending_sent",
      label: "Request Pending",
      disabled: true,
    });
  });

  it("shows Respond to Request for an incoming pending request without a direct thread", () => {
    expect(
      resolveMemberRelationshipCtaForPair(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        context({
          introductionRequests: [
            request({ status: "pending", sender_id: OTHER_USER_ID, receiver_id: CURRENT_USER_ID }),
          ],
        }),
      ),
    ).toEqual({
      action: "respond_to_request",
      label: "Respond to Request",
      primary: true,
    });
  });

  it("prefers Message over pending states when a grandfathered direct thread exists", () => {
    expect(
      resolveMemberRelationshipCtaForPair(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        context({
          introductionRequests: [
            request({ status: "pending", sender_id: CURRENT_USER_ID, receiver_id: OTHER_USER_ID }),
          ],
          directThreadUserIds: new Set([OTHER_USER_ID]),
        }),
      ),
    ).toEqual({
      action: "message",
      label: "Message",
      primary: true,
    });
  });
});

describe("canDirectMessageMember", () => {
  it("allows messaging when members are connected", () => {
    expect(
      canDirectMessageMember(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        [request({ status: "accepted" })],
        new Set(),
      ),
    ).toBe(true);
  });

  it("allows messaging when a pre-existing direct thread exists", () => {
    expect(canDirectMessageMember(CURRENT_USER_ID, OTHER_USER_ID, [], new Set([OTHER_USER_ID]))).toBe(
      true,
    );
  });

  it("blocks first-contact messaging when there is no connection or existing thread", () => {
    expect(canDirectMessageMember(CURRENT_USER_ID, OTHER_USER_ID, [], new Set())).toBe(false);
    expect(
      canDirectMessageMember(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        [request({ status: "pending" })],
        new Set(),
      ),
    ).toBe(false);
  });
});

describe("countMemberConnections", () => {
  it("counts unique accepted introductions for the member", () => {
    expect(
      countMemberConnections(CURRENT_USER_ID, [
        request({ id: "1", status: "accepted", receiver_id: "member-2" }),
        request({
          id: "2",
          status: "accepted",
          sender_id: "member-3",
          receiver_id: CURRENT_USER_ID,
        }),
        request({ id: "3", status: "pending", receiver_id: "member-4" }),
      ]),
    ).toBe(2);
  });
});

describe("validateIntroductionRequestMessage", () => {
  it("requires a meaningful introduction message", () => {
    expect(validateIntroductionRequestMessage("")).toMatch(/share a short note/i);
    expect(validateIntroductionRequestMessage("Too short")).toMatch(
      String(INTRODUCTION_MESSAGE_MIN_LENGTH),
    );
    expect(
      validateIntroductionRequestMessage(
        "I would love to connect about a round at Shinnecock this summer.",
      ),
    ).toBeNull();
  });
});
