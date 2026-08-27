import { afterEach, describe, expect, it, vi } from "vitest";
import type { IntroductionRequestRecord } from "../types/introductionRequest";
import type { DirectConversationSummary } from "../types/privateMessage";
import {
  PORTAL_NOTIFICATIONS_EMPTY_MESSAGE,
  acknowledgePortalNotificationPanel,
  buildFeedLikeNotifications,
  buildPortalNotifications,
  clearPortalNotificationBadgeFlags,
  computePortalNotificationBadgeCount,
  computePortalNotificationBadgeCountFromSources,
  countUnseenMessageNotifications,
  excludeSelfFeedLikes,
  groupPortalNotifications,
  resolvePortalNotificationDestination,
} from "./portalNotificationCenter";
import {
  buildFeedLikeSeenKey,
  buildMessageNotificationSeenKey,
  getNotificationBadgeDisplay,
  getSeenFeedLikeKeys,
  getSeenMessageNotificationKeys,
  markFeedLikesSeen,
  PORTAL_NOTIFICATION_PANEL_WIDTH,
} from "./portalNotifications";

function introductionRequest(
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

function conversation(
  overrides: Partial<DirectConversationSummary> & Pick<DirectConversationSummary, "otherUserId">,
): DirectConversationSummary {
  return {
    otherUserId: overrides.otherUserId,
    otherUserName: overrides.otherUserName ?? "Jordan Lee",
    lastMessageBody: overrides.lastMessageBody ?? "Hello there",
    lastMessageAt: overrides.lastMessageAt ?? "2026-07-02T12:00:00.000Z",
    unreadCount: overrides.unreadCount ?? 1,
    lastMessageWasEdited: overrides.lastMessageWasEdited ?? false,
    otherUserPrimaryClub: overrides.otherUserPrimaryClub,
    otherUserBasedIn: overrides.otherUserBasedIn,
  };
}

describe("buildPortalNotifications", () => {
  it("returns an empty list for the caught-up state", () => {
    const notifications = buildPortalNotifications({
      conversations: [],
      introductionRequests: [],
      currentUserId: "member-1",
      seenIntroductionRequestIds: new Set(),
    });

    expect(notifications).toEqual([]);
    expect(PORTAL_NOTIFICATIONS_EMPTY_MESSAGE).toBe("You're all caught up.");
  });

  it("routes message notifications to the correct conversation target", () => {
    const notifications = buildPortalNotifications({
      currentUserId: "member-1",
      seenIntroductionRequestIds: new Set(),
      seenMessageNotificationKeys: new Set(),
      introductionRequests: [],
      conversations: [
        conversation({
          otherUserId: "member-2",
          otherUserName: "Alex Kim",
          unreadCount: 2,
          lastMessageAt: "2026-07-02T12:00:00.000Z",
        }),
      ],
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.messageTarget).toEqual({
      otherUserId: "member-2",
      otherUserName: "Alex Kim",
    });
    expect(notifications[0]?.acknowledgeMessageNotificationKey).toBe(
      buildMessageNotificationSeenKey("member-2", "2026-07-02T12:00:00.000Z"),
    );
    expect(notifications[0]?.introductionTarget).toBeUndefined();
  });

  it("routes introduction notifications to the correct tab", () => {
    const notifications = buildPortalNotifications({
      currentUserId: "member-1",
      seenIntroductionRequestIds: new Set(),
      conversations: [],
      introductionRequests: [
        introductionRequest({
          id: "intro-pending",
          sender_id: "member-2",
          sender_name: "Alex Kim",
          receiver_id: "member-1",
          status: "pending",
        }),
        introductionRequest({
          id: "intro-accepted",
          sender_id: "member-1",
          receiver_id: "member-3",
          receiver_name: "Jordan Lee",
          status: "accepted",
          accepted_at: "2026-07-03T12:00:00.000Z",
        }),
        introductionRequest({
          id: "intro-declined",
          sender_id: "member-1",
          receiver_id: "member-4",
          receiver_name: "Taylor Reed",
          status: "declined",
        }),
      ],
    });

    const targets = Object.fromEntries(
      notifications.map((item) => [item.introductionTarget?.requestId, item.introductionTarget]),
    );

    expect(targets["intro-pending"]).toEqual({ tab: "incoming", requestId: "intro-pending" });
    expect(targets["intro-accepted"]).toEqual({ tab: "accepted", requestId: "intro-accepted" });
    expect(targets["intro-declined"]).toEqual({ tab: "declined", requestId: "intro-declined" });
  });
});

const POST_ID = "11111111-1111-4111-8111-111111111111";

describe("buildFeedLikeNotifications", () => {
  it("creates a like notification for another member", () => {
    const notifications = buildFeedLikeNotifications({
      likes: [
        {
          post_id: POST_ID,
          user_id: "member-2",
          created_at: "2026-07-04T12:00:00.000Z",
        },
      ],
      likerProfilesByUserId: {
        "member-2": { full_name: "Alex Kim" },
      },
      seenFeedLikeKeys: new Set(),
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      kind: "feed_like",
      memberName: "Alex Kim",
      description: "Alex Kim liked your post.",
      countsTowardBadge: true,
      feedTarget: { postId: POST_ID },
      acknowledgeFeedLikeKey: buildFeedLikeSeenKey(POST_ID, "member-2"),
    });
  });

  it("drops notifications when the like row is no longer present", () => {
    const notifications = buildFeedLikeNotifications({
      likes: [],
      likerProfilesByUserId: {},
      seenFeedLikeKeys: new Set(),
    });

    expect(notifications).toEqual([]);
  });

  it("suppresses the badge after the like has been acknowledged", () => {
    const seenKey = buildFeedLikeSeenKey(POST_ID, "member-2");
    const notifications = buildFeedLikeNotifications({
      likes: [
        {
          post_id: POST_ID,
          user_id: "member-2",
          created_at: "2026-07-04T12:00:00.000Z",
        },
      ],
      likerProfilesByUserId: {
        "member-2": { full_name: "Alex Kim" },
      },
      seenFeedLikeKeys: new Set([seenKey]),
    });

    expect(notifications[0]?.countsTowardBadge).toBe(false);
    expect(
      computePortalNotificationBadgeCountFromSources({
        unreadMessageCount: 0,
        currentUserId: "member-1",
        seenIntroductionRequestIds: new Set(),
        introductionRequests: [],
        feedLikes: [
          {
            post_id: POST_ID,
            user_id: "member-2",
            created_at: "2026-07-04T12:00:00.000Z",
          },
        ],
        seenFeedLikeKeys: new Set([seenKey]),
      }),
    ).toBe(0);
  });
});

describe("excludeSelfFeedLikes", () => {
  it("excludes self-likes from notification rows", () => {
    const likes = excludeSelfFeedLikes(
      [
        {
          post_id: POST_ID,
          user_id: "member-1",
          created_at: "2026-07-04T12:00:00.000Z",
        },
        {
          post_id: POST_ID,
          user_id: "member-2",
          created_at: "2026-07-04T12:01:00.000Z",
        },
      ],
      "member-1",
    );

    expect(likes).toEqual([
      {
        post_id: POST_ID,
        user_id: "member-2",
        created_at: "2026-07-04T12:01:00.000Z",
      },
    ]);
  });
});

describe("resolvePortalNotificationDestination", () => {
  it("routes like notifications to the feed post target", () => {
    const notification = buildFeedLikeNotifications({
      likes: [
        {
          post_id: POST_ID,
          user_id: "member-2",
          created_at: "2026-07-04T12:00:00.000Z",
        },
      ],
      likerProfilesByUserId: {
        "member-2": { full_name: "Alex Kim" },
      },
      seenFeedLikeKeys: new Set(),
    })[0];

    expect(resolvePortalNotificationDestination(notification!)).toEqual({
      view: "feed",
      postId: POST_ID,
    });
  });
});

describe("feed like seen keys", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("persists acknowledged like keys in localStorage", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    });

    const seenKey = buildFeedLikeSeenKey(POST_ID, "member-2");
    markFeedLikesSeen("member-1", [seenKey]);

    expect(getSeenFeedLikeKeys("member-1").has(seenKey)).toBe(true);
  });
});

describe("acknowledgePortalNotificationPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("marks all visible notification types as seen for badge purposes", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    });

    const notifications = buildPortalNotifications({
      currentUserId: "member-1",
      seenIntroductionRequestIds: new Set(),
      seenFeedLikeKeys: new Set(),
      seenMessageNotificationKeys: new Set(),
      conversations: [
        conversation({
          otherUserId: "member-2",
          unreadCount: 1,
          lastMessageAt: "2026-07-02T12:00:00.000Z",
        }),
      ],
      introductionRequests: [
        introductionRequest({
          id: "intro-pending",
          sender_id: "member-3",
          receiver_id: "member-1",
          status: "pending",
        }),
      ],
      feedLikes: [
        {
          post_id: POST_ID,
          user_id: "member-4",
          created_at: "2026-07-04T12:00:00.000Z",
        },
      ],
      likerProfilesByUserId: {
        "member-4": { full_name: "Taylor Reed" },
      },
    });

    const seenState = acknowledgePortalNotificationPanel("member-1", notifications);

    expect(seenState.seenIntroductionRequestIds.has("intro-pending")).toBe(true);
    expect(
      seenState.seenFeedLikeKeys.has(buildFeedLikeSeenKey(POST_ID, "member-4")),
    ).toBe(true);
    expect(
      seenState.seenMessageNotificationKeys.has(
        buildMessageNotificationSeenKey("member-2", "2026-07-02T12:00:00.000Z"),
      ),
    ).toBe(true);

    expect(
      computePortalNotificationBadgeCountFromSources({
        unreadMessageCount: 1,
        currentUserId: "member-1",
        seenIntroductionRequestIds: seenState.seenIntroductionRequestIds,
        seenFeedLikeKeys: seenState.seenFeedLikeKeys,
        seenMessageNotificationKeys: seenState.seenMessageNotificationKeys,
        introductionRequests: [
          introductionRequest({
            id: "intro-pending",
            sender_id: "member-3",
            receiver_id: "member-1",
            status: "pending",
          }),
        ],
        conversations: [
          conversation({
            otherUserId: "member-2",
            unreadCount: 1,
            lastMessageAt: "2026-07-02T12:00:00.000Z",
          }),
        ],
        feedLikes: [
          {
            post_id: POST_ID,
            user_id: "member-4",
            created_at: "2026-07-04T12:00:00.000Z",
          },
        ],
      }),
    ).toBe(0);
  });

  it("keeps notification items visible while clearing badge flags", () => {
    const notifications = buildPortalNotifications({
      currentUserId: "member-1",
      seenIntroductionRequestIds: new Set(),
      seenMessageNotificationKeys: new Set(),
      conversations: [
        conversation({
          otherUserId: "member-2",
          unreadCount: 1,
          lastMessageAt: "2026-07-02T12:00:00.000Z",
        }),
      ],
      introductionRequests: [],
    });

    const cleared = clearPortalNotificationBadgeFlags(notifications);

    expect(cleared).toHaveLength(1);
    expect(cleared[0]?.countsTowardBadge).toBe(false);
    expect(cleared[0]?.messageTarget).toEqual(notifications[0]?.messageTarget);
  });
});

describe("countUnseenMessageNotifications", () => {
  it("shows a badge again when a newer unread message arrives", () => {
    const seenKey = buildMessageNotificationSeenKey("member-2", "2026-07-02T12:00:00.000Z");
    const seenKeys = new Set([seenKey]);

    expect(
      countUnseenMessageNotifications({
        conversations: [
          conversation({
            otherUserId: "member-2",
            unreadCount: 1,
            lastMessageAt: "2026-07-02T12:00:00.000Z",
          }),
        ],
        seenMessageNotificationKeys: seenKeys,
      }),
    ).toBe(0);

    expect(
      countUnseenMessageNotifications({
        conversations: [
          conversation({
            otherUserId: "member-2",
            unreadCount: 1,
            lastMessageAt: "2026-07-03T12:00:00.000Z",
          }),
        ],
        seenMessageNotificationKeys: seenKeys,
      }),
    ).toBe(1);
  });
});

describe("computePortalNotificationBadgeCount", () => {
  it("combines unread messages with actionable introduction items", () => {
    const notifications = buildPortalNotifications({
      currentUserId: "member-1",
      seenIntroductionRequestIds: new Set(["intro-accepted"]),
      conversations: [
        conversation({ otherUserId: "member-2", unreadCount: 3 }),
        conversation({ otherUserId: "member-3", unreadCount: 1 }),
      ],
      introductionRequests: [
        introductionRequest({
          id: "intro-pending",
          sender_id: "member-4",
          receiver_id: "member-1",
          status: "pending",
        }),
        introductionRequest({
          id: "intro-accepted",
          sender_id: "member-1",
          receiver_id: "member-5",
          status: "accepted",
        }),
        introductionRequest({
          id: "intro-declined",
          sender_id: "member-1",
          receiver_id: "member-6",
          status: "declined",
        }),
      ],
    });

    expect(computePortalNotificationBadgeCount(notifications)).toBe(6);
  });

  it("derives the same combined count from lightweight sources", () => {
    const count = computePortalNotificationBadgeCountFromSources({
      unreadMessageCount: 4,
      currentUserId: "member-1",
      seenIntroductionRequestIds: new Set(["intro-accepted"]),
      introductionRequests: [
        introductionRequest({
          id: "intro-pending",
          sender_id: "member-2",
          receiver_id: "member-1",
          status: "pending",
        }),
        introductionRequest({
          id: "intro-accepted",
          sender_id: "member-1",
          receiver_id: "member-3",
          status: "accepted",
        }),
        introductionRequest({
          id: "intro-declined",
          sender_id: "member-1",
          receiver_id: "member-4",
          status: "declined",
        }),
      ],
    });

    expect(count).toBe(6);
  });
});

describe("getNotificationBadgeDisplay", () => {
  it("shows no badge, dot, or count based on notification total", () => {
    expect(getNotificationBadgeDisplay(0)).toBe("none");
    expect(getNotificationBadgeDisplay(1)).toBe("dot");
    expect(getNotificationBadgeDisplay(2)).toBe("count");
    expect(getNotificationBadgeDisplay(9)).toBe("count");
  });
});

describe("groupPortalNotifications", () => {
  it("groups mixed notifications into sections when both types exist", () => {
    const notifications = buildPortalNotifications({
      currentUserId: "member-1",
      seenIntroductionRequestIds: new Set(),
      conversations: [
        conversation({ otherUserId: "member-2", unreadCount: 1 }),
      ],
      introductionRequests: [
        introductionRequest({
          id: "intro-pending",
          sender_id: "member-3",
          receiver_id: "member-1",
          status: "pending",
        }),
      ],
      feedLikes: [
        {
          post_id: POST_ID,
          user_id: "member-4",
          created_at: "2026-07-04T12:00:00.000Z",
        },
      ],
      likerProfilesByUserId: {
        "member-4": { full_name: "Taylor Reed" },
      },
    });

    const sections = groupPortalNotifications(notifications);

    expect(sections).toHaveLength(3);
    expect(sections.map((section) => section.id)).toEqual(["messages", "feed", "introductions"]);
    expect(sections.every((section) => section.showHeader)).toBe(true);
  });
});

describe("PORTAL_NOTIFICATION_PANEL_WIDTH", () => {
  it("uses viewport width so the dropdown does not collapse to the bell anchor", () => {
    expect(PORTAL_NOTIFICATION_PANEL_WIDTH).toContain("100vw");
    expect(PORTAL_NOTIFICATION_PANEL_WIDTH).not.toMatch(/calc\(100%\s*-/);
  });
});
