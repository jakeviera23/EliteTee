import { describe, expect, it } from "vitest";
import {
  buildCourseDetailFacts,
  formatArchitectYearLine,
  formatCourseYardage,
} from "./courseDetailFacts";

describe("formatCourseYardage", () => {
  it("formats yardage with grouping", () => {
    expect(formatCourseYardage(6828)).toBe("6,828 yards");
  });

  it("returns null for missing yardage", () => {
    expect(formatCourseYardage(null)).toBeNull();
  });
});

describe("formatArchitectYearLine", () => {
  it("joins architect and year", () => {
    expect(formatArchitectYearLine("Donald Ross", 1907)).toBe("Donald Ross • 1907");
  });
});

describe("buildCourseDetailFacts", () => {
  it("builds ordered course facts", () => {
    expect(
      buildCourseDetailFacts({
        architect: "Jack Neville; Douglas Grant",
        year_opened: 1919,
        holes: 18,
        par: 72,
        yardage: 6828,
        website_url: "https://www.pebblebeach.com",
      }),
    ).toEqual([
      { label: "Architect", value: "Jack Neville; Douglas Grant • 1919" },
      { label: "Holes", value: "18" },
      { label: "Par", value: "72" },
      { label: "Yardage", value: "6,828 yards" },
      { label: "Website", value: "https://www.pebblebeach.com" },
    ]);
  });
});
