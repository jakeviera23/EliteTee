import { describe, expect, it } from "vitest";
import { groupNetworkContributionResponses, isUnseenNetworkActivity } from "./networkActivity";

describe("network activity seen state", () => {
  it("treats valid newer events as unseen", () => {
    expect(
      isUnseenNetworkActivity(
        "2026-08-06T15:00:00.000Z",
        "2026-08-06T14:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("does not count older or invalid events", () => {
    expect(
      isUnseenNetworkActivity(
        "2026-08-06T13:00:00.000Z",
        "2026-08-06T14:00:00.000Z",
      ),
    ).toBe(false);
    expect(isUnseenNetworkActivity("invalid", null)).toBe(false);
  });
});

describe("groupNetworkContributionResponses", () => {
  it("groups repeated activity from one member on one contribution", () => {
    const groups = groupNetworkContributionResponses(
      [
        { id: "one", post_id: "post-a", user_id: "member-a" },
        { id: "two", post_id: "post-a", user_id: "member-a" },
        { id: "three", post_id: "post-a", user_id: "member-b" },
        { id: "mention", post_id: "post-a", user_id: "member-a" },
      ],
      new Set(["mention"]),
      new Set(["post-a"]),
    );

    expect(groups.map((group) => [group.kind, group.rows.length])).toEqual([
      ["comment", 2],
      ["comment", 1],
      ["mention", 1],
    ]);
  });
});
