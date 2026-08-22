import { describe, expect, it, vi, afterEach } from "vitest";
import { formatOwnMessageReadReceipt } from "./messageReadReceipt";

afterEach(() => {
  vi.useRealTimers();
});

describe("formatOwnMessageReadReceipt", () => {
  it("returns Sent when read_at is missing", () => {
    expect(formatOwnMessageReadReceipt(null)).toBe("Sent");
    expect(formatOwnMessageReadReceipt(undefined)).toBe("Sent");
    expect(formatOwnMessageReadReceipt("")).toBe("Sent");
  });

  it("returns Read with a short relative time when read_at is present", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T18:00:00.000Z"));

    expect(formatOwnMessageReadReceipt("2026-08-22T17:55:00.000Z")).toBe("Read 5m ago");
    expect(formatOwnMessageReadReceipt("2026-08-22T16:00:00.000Z")).toBe("Read 2h ago");
  });
});
