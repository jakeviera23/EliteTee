import { describe, expect, it } from "vitest";
import { formatMobileMessagePreviewBody } from "./messagePreview";
import {
  MARK_DIRECT_MESSAGES_READ_RPC,
  MARK_INTRODUCTION_MESSAGES_READ_RPC,
} from "./messagesMarkRead";

describe("formatMobileMessagePreviewBody", () => {
  it("keeps text-only previews unchanged", () => {
    expect(formatMobileMessagePreviewBody("On the range at 4")).toBe("On the range at 4");
  });

  it("shows Photo or Photos for image-only messages", () => {
    expect(formatMobileMessagePreviewBody("", 1)).toBe("Photo");
    expect(formatMobileMessagePreviewBody("   ", 3)).toBe("Photos");
    expect(formatMobileMessagePreviewBody("", 0)).toBe("");
  });

  it("prefers body text when both text and attachments exist", () => {
    expect(formatMobileMessagePreviewBody("Course looks great", 2)).toBe("Course looks great");
  });
});

describe("migration 065 mark-read RPC names", () => {
  it("targets the production SECURITY DEFINER mark-read functions", () => {
    expect(MARK_DIRECT_MESSAGES_READ_RPC).toBe("mark_direct_private_messages_read");
    expect(MARK_INTRODUCTION_MESSAGES_READ_RPC).toBe("mark_introduction_private_messages_read");
  });
});
