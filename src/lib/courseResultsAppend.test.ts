import { describe, expect, it } from "vitest";
import { appendUniqueCourses } from "./courseResultsAppend";

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

