import { describe, expect, it } from "vitest";
import profilePageSource from "../components/member-portal/GolferProfilePage.tsx?raw";
import {
  isProfileIdentityOutsideCover,
  PROFILE_HERO_CLASS,
} from "./profileHeroStructure";

describe("profile hero structure contract", () => {
  it("keeps identity outside the cover container in GolferProfilePage markup", () => {
    expect(isProfileIdentityOutsideCover(profilePageSource)).toBe(true);
    expect(profilePageSource).toContain(`className="${PROFILE_HERO_CLASS.avatar}"`);
    expect(profilePageSource).toContain(`className="${PROFILE_HERO_CLASS.identity}"`);
    expect(profilePageSource).not.toContain("et-profile-hero-body");
  });

  it("uses separate avatar and identity blocks so only the avatar can overlap the cover", () => {
    const heroBlock =
      profilePageSource.match(/<header className="et-profile-hero">[\s\S]*?<\/header>/)?.[0] ?? "";

    expect(heroBlock.indexOf(PROFILE_HERO_CLASS.cover)).toBeLessThan(
      heroBlock.indexOf(PROFILE_HERO_CLASS.avatar),
    );
    expect(heroBlock.indexOf(PROFILE_HERO_CLASS.avatar)).toBeLessThan(
      heroBlock.indexOf(PROFILE_HERO_CLASS.identity),
    );
  });
});
