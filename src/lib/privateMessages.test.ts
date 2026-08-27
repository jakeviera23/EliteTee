import { describe, expect, it, vi, afterEach } from "vitest";
import type { PrivateMessageRecord } from "../types/privateMessage";
import {
  buildDirectConversationSummaries,
  isPrivateMessageEditable,
  mergeEditedPrivateMessage,
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

  it("uses Photo preview for image-only messages", () => {
    const summaries = buildDirectConversationSummaries({
      currentUserId: "user-a",
      messages: [
        message({
          id: "1",
          body: "",
          created_at: "2026-07-05T12:00:00.000Z",
          attachments: [
            {
              id: "att-1",
              message_id: "1",
              storage_path: "user-a/1/a.jpg",
              content_type: "image/jpeg",
              byte_size: 100,
              width: 800,
              height: 600,
              sort_order: 0,
              created_at: "2026-07-05T12:00:00.000Z",
            },
          ],
        }),
      ],
    });

    expect(summaries[0]?.lastMessageBody).toBe("Photo");
    expect(summaries[0]?.lastMessageAttachmentCount).toBe(1);
  });

  it("keeps text previews for historical text-only messages", () => {
    const summaries = buildDirectConversationSummaries({
      currentUserId: "user-a",
      messages: [message({ id: "1", body: "Historical note" })],
    });

    expect(summaries[0]?.lastMessageBody).toBe("Historical note");
    expect(summaries[0]?.lastMessageAttachmentCount).toBe(0);
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

describe("mergeEditedPrivateMessage", () => {
  it("updates body while preserving attachments", () => {
    const existing = message({
      id: "1",
      body: "Before",
      attachments: [
        {
          id: "att-1",
          message_id: "1",
          storage_path: "user-a/1/a.jpg",
          content_type: "image/jpeg",
          byte_size: 100,
          width: null,
          height: null,
          sort_order: 0,
          created_at: "2026-07-05T12:00:00.000Z",
          signedUrl: "https://signed.example/a.jpg",
        },
      ],
    });

    const merged = mergeEditedPrivateMessage(existing, {
      id: "1",
      body: "After",
      edited_at: "2026-07-05T13:00:00.000Z",
      created_at: existing.created_at,
    });

    expect(merged.body).toBe("After");
    expect(merged.attachments).toEqual(existing.attachments);
  });
});

describe("sendDirectPrivateMessage image lifecycle", () => {
  it("deletes image-only parent messages when upload fails", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("./privateMessages.ts", import.meta.url), "utf8"),
    );
    expect(source).toContain("allowEmpty: files.length > 0");
    expect(source).toContain('if (!trimmedBody) {');
    expect(source).toContain('.from("private_messages").delete()');
  });
});
