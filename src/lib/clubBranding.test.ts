import { describe, expect, it } from "vitest";
import {
  canDisplayClubBrandAsset,
  getClubMarkInitials,
  getClubMarkTone,
} from "./clubBranding";

describe("club branding safety", () => {
  it("only displays assets with a verified displayable rights status", () => {
    expect(canDisplayClubBrandAsset("/club-marks/example.svg", "permission_granted")).toBe(true);
    expect(canDisplayClubBrandAsset("/club-marks/example.svg", "first_party")).toBe(true);
    expect(canDisplayClubBrandAsset("/club-marks/example.svg", "public_domain")).toBe(true);
    expect(canDisplayClubBrandAsset("/club-marks/example.svg", "unverified")).toBe(false);
    expect(canDisplayClubBrandAsset("/club-marks/example.svg", "expired")).toBe(false);
    expect(canDisplayClubBrandAsset("", "permission_granted")).toBe(false);
  });

  it("creates neutral initials without copying a crest or wordmark", () => {
    expect(getClubMarkInitials("National Golf Links of America")).toBe("NL");
    expect(getClubMarkInitials("Pinehurst No. 2")).toBe("PN");
    expect(getClubMarkInitials("Golf Club")).toBe("ET");
  });

  it("assigns a stable fallback tone", () => {
    expect(getClubMarkTone("Royal Dornoch")).toBe(getClubMarkTone("Royal Dornoch"));
    expect(getClubMarkTone("Royal Dornoch")).toBeGreaterThanOrEqual(0);
    expect(getClubMarkTone("Royal Dornoch")).toBeLessThan(4);
  });
});
