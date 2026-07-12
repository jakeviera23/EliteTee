import { describe, expect, it } from "vitest";
import { FEED_CARD_ICON_CLASSES, FEED_CARD_SCOPE_CLASS } from "./feedCardScope";

describe("feed card scope contract", () => {
  it("exports the shared wrapper class used by Feed and Profile", () => {
    expect(FEED_CARD_SCOPE_CLASS).toBe("et-feed-card-scope");
  });

  it("exports fixed icon class names for regression checks", () => {
    expect(FEED_CARD_ICON_CLASSES.action).toBe("feed-card-action-icon");
    expect(FEED_CARD_ICON_CLASSES.chip).toBe("feed-card-chip-icon");
  });
});
