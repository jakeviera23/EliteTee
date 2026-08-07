import { describe, expect, it } from "vitest";
import {
  PORTAL_CREATE_ACTIONS,
  getAvailablePortalCreateActions,
  getPortalCreateAction,
} from "./portalCreation";

describe("portal creation actions", () => {
  it("exposes every approved Phase 1 creation entry once", () => {
    expect(PORTAL_CREATE_ACTIONS.map((action) => action.id)).toEqual([
      "post-update", "share-round", "looking-for-game", "golf-travel",
      "recommend-course", "share-photos", "request-introduction", "ask-community",
    ]);
    expect(new Set(PORTAL_CREATE_ACTIONS.map((action) => action.id)).size).toBe(8);
  });

  it("routes reliable existing flows without duplicating them", () => {
    expect(getPortalCreateAction("share-round")?.destination).toEqual({ kind: "round" });
    expect(getPortalCreateAction("share-photos")?.destination).toEqual({
      kind: "photo-composer",
    });
    expect(getPortalCreateAction("looking-for-game")?.destination).toEqual({ kind: "composer", composerPostType: "looking-for-game" });
    expect(getPortalCreateAction("request-introduction")?.destination).toEqual({ kind: "discover-introduction" });
  });

  it("withholds photo sharing until migration 061 is explicitly enabled", () => {
    expect(getAvailablePortalCreateActions().map((action) => action.id)).not.toContain(
      "share-photos",
    );
  });
});
