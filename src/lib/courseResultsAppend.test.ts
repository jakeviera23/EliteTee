import { describe, expect, it, vi } from "vitest";
import { appendUniqueCourses, restoreScrollAfterPaging } from "./courseResultsAppend";

describe("appendUniqueCourses", () => {
  it("appends new courses while keeping originals stable", () => {
    const current = [
      { id: "1", name: "A", slug: "a" },
      { id: "2", name: "B", slug: "b" },
    ] as any;
    const next = [
      { id: "2", name: "B", slug: "b" },
      { id: "3", name: "C", slug: "c" },
    ] as any;

    expect(appendUniqueCourses(current, next).map((c: any) => c.id)).toEqual(["1", "2", "3"]);
  });
});

describe("restoreScrollAfterPaging", () => {
  it("restores the previous scroll position after paging", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal("window", {
      scrollTo,
    });

    restoreScrollAfterPaging(420);

    expect(scrollTo).toHaveBeenCalledWith({ top: 420, behavior: "auto" });
  });
});

