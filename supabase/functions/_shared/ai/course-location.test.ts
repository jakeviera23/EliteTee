import { describe, expect, it } from "vitest";
import {
  expandCourseLocationSearchTerms,
  isCourseVisibleInDirectory,
  normalizeCourseLocationQuery,
} from "./course-location.ts";

describe("normalizeCourseLocationQuery", () => {
  it("maps NY and New York to the same canonical label", () => {
    expect(normalizeCourseLocationQuery("NY")).toBe("New York");
    expect(normalizeCourseLocationQuery("new york")).toBe("New York");
  });

  it("maps NJ and New Jersey to the same canonical label", () => {
    expect(normalizeCourseLocationQuery("NJ")).toBe("New Jersey");
    expect(normalizeCourseLocationQuery("new jersey")).toBe("New Jersey");
  });
});

describe("expandCourseLocationSearchTerms", () => {
  it("expands NY to include new york", () => {
    expect(expandCourseLocationSearchTerms("NY")).toEqual(
      expect.arrayContaining(["ny", "new york"]),
    );
  });
});

describe("isCourseVisibleInDirectory", () => {
  it("allows published and curated courses", () => {
    expect(isCourseVisibleInDirectory({ lifecycle_status: "published", source_name: "provider" })).toBe(
      true,
    );
    expect(
      isCourseVisibleInDirectory({ lifecycle_status: "draft", source_name: "elitetee_curated" }),
    ).toBe(true);
  });

  it("hides unrelated draft provider imports and pending member submissions", () => {
    expect(isCourseVisibleInDirectory({ lifecycle_status: "draft", source_name: "provider" })).toBe(
      false,
    );
    expect(
      isCourseVisibleInDirectory({
        lifecycle_status: "pending_review",
        source_name: "member_submitted",
      }),
    ).toBe(false);
  });
});
