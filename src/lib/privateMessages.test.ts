import { describe, expect, it, vi, afterEach } from "vitest";
import type { PrivateMessageRecord } from "../types/privateMessage";
import {
  buildDirectConversationSummaries,
  isPrivateMessageEditable,
  PRIVATE_MESSAGE_EDIT_WINDOW_MS,
} from "./privateMessages";

function message(
  overrides: Partial<PrivateMessageRecord> & Pick<PrivateMessageRecord, "id">,
): PrivateMessageRecord {
  return {
    introduction_request_id: null,
    sender_id: "user-a",
    receiver_id: "user-b",
    body: "Hello",
    created_at: "2026-07-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("buildDirectConversationSummaries", () => {
  it("aggregates unread counts and latest preview per participant", () => {
    const summaries = buildDirectConversationSummaries({
      currentUserId: "user-a",
      messages: [
        message({ id: "1", body: "First", created_at: "2026-07-01T12:00:00.000Z" }),
        message({
          id: "2",
          sender_id: "user-b",
          receiver_id: "user-a",
          body: "Reply",
          created_at: "2026-07-02T12:00:00.000Z",
          read_at: null,
        }),
        message({
          id: "3",
          sender_id: "user-b",
          receiver_id: "user-a",
          body: "Another",
          created_at: "2026-07-03T12:00:00.000Z",
          read_at: null,
        }),
      ],
      memberIdentitiesByUserId: {
        "user-b": {
          full_name: "Jordan Lee",
          club_logo_url: null,
          founding_member_number: "FM-12",
          primary_club: "National Golf Links",
          based_in: "Southampton, NY",
        },
      },
    });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      otherUserId: "user-b",
      otherUserName: "Jordan Lee",
      lastMessageBody: "Another",
      unreadCount: 2,
      otherUserPrimaryClub: "National Golf Links",
      otherUserBasedIn: "Southampton, NY",
    });
  });

  it("marks latest preview as edited when the last message was edited", () => {
    const summaries = buildDirectConversationSummaries({
      currentUserId: "user-a",
      messages: [
        message({
          id: "1",
          body: "Updated note",
          edited_at: "2026-07-04T12:00:00.000Z",
          created_at: "2026-07-04T12:00:00.000Z",
        }),
      ],
    });

    expect(summaries[0]?.lastMessageWasEdited).toBe(true);
  });
});

describe("isPrivateMessageEditable", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows edits within the 24-hour window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T12:00:00.000Z"));

    expect(
      isPrivateMessageEditable({
        created_at: new Date(Date.now() - PRIVATE_MESSAGE_EDIT_WINDOW_MS + 1000).toISOString(),
      }),
    ).toBe(true);
  });

  it("blocks edits after the 24-hour window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-02T12:00:00.000Z"));

    expect(
      isPrivateMessageEditable({
        created_at: new Date(Date.now() - PRIVATE_MESSAGE_EDIT_WINDOW_MS - 1000).toISOString(),
      }),
    ).toBe(false);
  });
});
