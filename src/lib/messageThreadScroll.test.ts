import { describe, expect, it } from "vitest";
import {
  MESSAGE_THREAD_NEAR_BOTTOM_PX,
  isMessageThreadNearBottom,
  scrollMessageThreadToBottom,
} from "./messageThreadScroll";

describe("isMessageThreadNearBottom", () => {
  it("uses the paid-launch ~100px threshold by default", () => {
    expect(MESSAGE_THREAD_NEAR_BOTTOM_PX).toBe(100);
  });

  it("returns true when within the threshold of the bottom", () => {
    expect(
      isMessageThreadNearBottom({
        scrollHeight: 1000,
        scrollTop: 850,
        clientHeight: 100,
      }),
    ).toBe(true);
  });

  it("returns false when reading older messages farther up", () => {
    expect(
      isMessageThreadNearBottom({
        scrollHeight: 1000,
        scrollTop: 200,
        clientHeight: 100,
      }),
    ).toBe(false);
  });
});

describe("scrollMessageThreadToBottom", () => {
  it("sets scrollTop to scrollHeight on the thread container", () => {
    const el = { scrollTop: 0, scrollHeight: 2400 } as HTMLElement;
    scrollMessageThreadToBottom(el);
    expect(el.scrollTop).toBe(2400);
  });
});
