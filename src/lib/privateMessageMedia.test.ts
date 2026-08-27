import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  formatMessagePreviewBody,
  PRIVATE_MESSAGE_IMAGE_MAX_BYTES,
  PRIVATE_MESSAGE_IMAGE_MAX_COUNT,
  validatePrivateMessageImageFile,
  validatePrivateMessageImageFiles,
} from "./privateMessageMedia";

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../supabase/migrations/065_private_message_attachments.sql",
);

function makeImageFile(name: string, type: string, sizeBytes: number) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("validatePrivateMessageImageFile", () => {
  it("accepts JPEG, PNG, and WebP", () => {
    expect(validatePrivateMessageImageFile(makeImageFile("a.jpg", "image/jpeg", 100))).toBeNull();
    expect(validatePrivateMessageImageFile(makeImageFile("a.png", "image/png", 100))).toBeNull();
    expect(validatePrivateMessageImageFile(makeImageFile("a.webp", "image/webp", 100))).toBeNull();
  });

  it("rejects GIF, video, and PDF", () => {
    expect(validatePrivateMessageImageFile(makeImageFile("a.gif", "image/gif", 100))).toMatch(
      /JPEG, PNG, and WebP/,
    );
    expect(validatePrivateMessageImageFile(makeImageFile("a.mp4", "video/mp4", 100))).toMatch(
      /JPEG, PNG, and WebP/,
    );
    expect(validatePrivateMessageImageFile(makeImageFile("a.pdf", "application/pdf", 100))).toMatch(
      /JPEG, PNG, and WebP/,
    );
  });

  it("rejects files larger than 5 MB", () => {
    const tooLarge = PRIVATE_MESSAGE_IMAGE_MAX_BYTES + 1;
    expect(
      validatePrivateMessageImageFile(makeImageFile("big.jpg", "image/jpeg", tooLarge)),
    ).toMatch(/5 MB/);
  });
});

describe("validatePrivateMessageImageFiles", () => {
  it("allows up to three images", () => {
    const files = Array.from({ length: PRIVATE_MESSAGE_IMAGE_MAX_COUNT }, (_, index) =>
      makeImageFile(`photo-${index}.jpg`, "image/jpeg", 100),
    );
    expect(validatePrivateMessageImageFiles(files)).toBeNull();
  });

  it("rejects a fourth image", () => {
    const files = Array.from({ length: PRIVATE_MESSAGE_IMAGE_MAX_COUNT + 1 }, (_, index) =>
      makeImageFile(`photo-${index}.jpg`, "image/jpeg", 100),
    );
    expect(validatePrivateMessageImageFiles(files)).toMatch(/up to 3 images/);
  });
});

describe("formatMessagePreviewBody", () => {
  it("keeps text-only previews unchanged", () => {
    expect(formatMessagePreviewBody("See you on 7")).toBe("See you on 7");
  });

  it("uses Photo or Photos when body is empty", () => {
    expect(formatMessagePreviewBody("", 1)).toBe("Photo");
    expect(formatMessagePreviewBody("   ", 2)).toBe("Photos");
    expect(formatMessagePreviewBody("", 0)).toBe("");
  });
});

describe("uploadPrivateMessageImages partial failure cleanup", () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "./privateMessageMedia.ts"),
    "utf8",
  );

  it("removes uploaded storage objects and attachment rows on failure", () => {
    expect(source).toContain(".remove(uploadedPaths)");
    expect(source).toContain('.from("private_message_attachments")');
    expect(source).toContain(".delete()");
  });
});

describe("065_private_message_attachments migration security", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("creates participant-scoped attachment SELECT and sender-only delete", () => {
    expect(sql).toContain("Participants can read private message attachments");
    expect(sql).toContain("Senders can insert private message attachments");
    expect(sql).toContain("Senders can delete private message attachments");
    expect(sql).toContain("can_read_private_message");
  });

  it("uses a dedicated private-message-media bucket with participant-scoped storage reads", () => {
    expect(sql).toContain("'private-message-media'");
    expect(sql).toContain("Participants can read private message media");
    expect(sql).toContain("from public.private_message_attachments a");
  });

  it("replaces broad receiver UPDATE with mark-read RPCs", () => {
    expect(sql).toContain('drop policy if exists "Receivers can mark private messages read"');
    expect(sql).toContain("mark_direct_private_messages_read");
    expect(sql).toContain("mark_introduction_private_messages_read");
    expect(sql).not.toMatch(
      /create policy "Receivers can mark private messages read"[\s\S]*for update/,
    );
  });
});
