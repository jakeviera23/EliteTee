import { describe, expect, it } from "vitest";
import type { IntroductionRequestRecord } from "../types/introductionRequest";
import type { DirectConversationSummary } from "../types/privateMessage";
import {
  PORTAL_NOTIFICATIONS_EMPTY_MESSAGE,
  buildPortalNotifications,
  computePortalNotificationBadgeCount,
  computePortalNotificationBadgeCountFromSources,
  groupPortalNotifications,
} from "./portalNotificationCenter";
import { getNotificationBadgeDisplay, PORTAL_NOTIFICATION_PANEL_WIDTH } from "./portalNotifications";

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
      introductionRequests: [],
      conversations: [
        conversation({
          otherUserId: "member-2",
          otherUserName: "Alex Kim",
          unreadCount: 2,
        }),
      ],
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.messageTarget).toEqual({
      otherUserId: "member-2",
      otherUserName: "Alex Kim",
    });
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
  it("groups messages and pending requests into the priority section", () => {
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
    });

    const sections = groupPortalNotifications(notifications);

    expect(sections).toHaveLength(1);
    expect(sections[0]?.id).toBe("priority");
    expect(sections[0]?.items.map((item) => item.kind)).toEqual([
      "unread_message",
      "introduction_pending",
    ]);
    expect(sections[0]?.showHeader).toBe(true);
  });

  it("places replies and requests ahead of passive appreciation", () => {
    const sections = groupPortalNotifications([
      {
        id: "like-1",
        kind: "like",
        typeLabel: "Appreciation",
        memberName: "Alex Kim",
        description: "Alex appreciated your post.",
        timestampLabel: "1m ago",
        sortTimestamp: 3,
        countsTowardBadge: true,
      },
      {
        id: "reply-1",
        kind: "reply",
        typeLabel: "Reply",
        memberName: "Jordan Lee",
        description: "Jordan replied to your comment.",
        timestampLabel: "2m ago",
        sortTimestamp: 2,
        countsTowardBadge: true,
      },
    ]);

    expect(sections.map((section) => section.id)).toEqual(["priority", "network"]);
    expect(sections[0]?.items[0]?.kind).toBe("reply");
    expect(sections[1]?.items[0]?.kind).toBe("like");
  });
});

describe("PORTAL_NOTIFICATION_PANEL_WIDTH", () => {
  it("uses viewport width so the dropdown does not collapse to the bell anchor", () => {
    expect(PORTAL_NOTIFICATION_PANEL_WIDTH).toContain("100vw");
    expect(PORTAL_NOTIFICATION_PANEL_WIDTH).not.toMatch(/calc\(100%\s*-/);
  });
});
