import { describe, expect, it } from "vitest";
import { buildFeedPostDeepLink, buildFeedPostShareText } from "./feedPostShare";

describe("feed post sharing", () => {
  it("builds an exact bookmarkable post URL", () => {
    expect(buildFeedPostDeepLink("post-123", "https://www.elitetee.club")).toBe(
      "https://www.elitetee.club/member-portal?post=post-123",
    );
  });

  it("provides truthful post text when a deep link is unavailable", () => {
    expect(
      buildFeedPostShareText({ authorName: "Jake", caption: "Looking for a game Saturday." }),
    ).toBe("Looking for a game Saturday.");
  });
});
