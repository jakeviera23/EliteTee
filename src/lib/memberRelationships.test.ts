import { describe, expect, it } from "vitest";
import type { IntroductionRequestRecord } from "../types/introductionRequest";
import {
  INTRODUCTION_MESSAGE_MIN_LENGTH,
  canDirectMessageMember,
  countMemberConnections,
  resolveMemberIntroductionCta,
  resolveMemberIntroductionCtaForPair,
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

describe("resolveMemberIntroductionCta", () => {
  it("maps relationship states to optional introduction actions", () => {
    expect(resolveMemberIntroductionCta("none")).toEqual({
      action: "request_introduction",
      label: "Request Introduction",
    });
    expect(resolveMemberIntroductionCta("pending_sent")).toEqual({
      action: "pending_sent",
      label: "Introduction Requested",
      disabled: true,
    });
    expect(resolveMemberIntroductionCta("pending_received")).toEqual({
      action: "respond_to_request",
      label: "Respond to Introduction",
    });
    expect(resolveMemberIntroductionCta("connected")).toEqual({
      action: "introduced",
      label: "Introduced",
      disabled: true,
    });
  });

  it("uses compact labels for tight layouts", () => {
    expect(resolveMemberIntroductionCta("none", { compact: true }).label).toBe("Introduce");
    expect(resolveMemberIntroductionCta("pending_sent", { compact: true }).label).toBe("Requested");
    expect(resolveMemberIntroductionCta("pending_received", { compact: true }).label).toBe(
      "Respond",
    );
  });
});

describe("resolveMemberIntroductionCtaForPair", () => {
  function context(
    introductionRequests: IntroductionRequestRecord[] = [],
  ): Pick<MemberRelationshipContext, "introductionRequests"> {
    return { introductionRequests };
  }

  it("offers Request Introduction when the pair has no history", () => {
    expect(
      resolveMemberIntroductionCtaForPair(CURRENT_USER_ID, OTHER_USER_ID, context()).action,
    ).toBe("request_introduction");
  });

  it("shows the outgoing pending state", () => {
    expect(
      resolveMemberIntroductionCtaForPair(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        context([
          request({ status: "pending", sender_id: CURRENT_USER_ID, receiver_id: OTHER_USER_ID }),
        ]),
      ).action,
    ).toBe("pending_sent");
  });

  it("asks the receiver to respond to an incoming request", () => {
    expect(
      resolveMemberIntroductionCtaForPair(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        context([
          request({ status: "pending", sender_id: OTHER_USER_ID, receiver_id: CURRENT_USER_ID }),
        ]),
      ).action,
    ).toBe("respond_to_request");
  });

  it("shows Introduced after acceptance in either direction", () => {
    expect(
      resolveMemberIntroductionCtaForPair(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        context([
          request({ status: "accepted", sender_id: OTHER_USER_ID, receiver_id: CURRENT_USER_ID }),
        ]),
      ).action,
    ).toBe("introduced");
  });

  it("ignores introductions between other members", () => {
    expect(
      resolveMemberIntroductionCtaForPair(
        CURRENT_USER_ID,
        OTHER_USER_ID,
        context([request({ status: "accepted", sender_id: "x", receiver_id: "y" })]),
      ).action,
    ).toBe("request_introduction");
  });
});

describe("canDirectMessageMember", () => {
  it("allows first-contact messaging between members without an introduction", () => {
    expect(canDirectMessageMember(CURRENT_USER_ID, OTHER_USER_ID)).toBe(true);
  });

  it("never offers messaging yourself or an unlinked member", () => {
    expect(canDirectMessageMember(CURRENT_USER_ID, CURRENT_USER_ID)).toBe(false);
    expect(canDirectMessageMember(CURRENT_USER_ID, "")).toBe(false);
    expect(canDirectMessageMember("", OTHER_USER_ID)).toBe(false);
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
