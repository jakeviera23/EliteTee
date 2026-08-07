import { describe, expect, it } from "vitest";
import { orderFeedPostMediaDrafts } from "./feedPostMedia";

describe("orderFeedPostMediaDrafts", () => {
  const drafts = [{ id: "first" }, { id: "second" }, { id: "third" }];

  it("places the chosen cover first without dropping media", () => {
    expect(orderFeedPostMediaDrafts(drafts, "third").map((draft) => draft.id)).toEqual([
      "third",
      "first",
      "second",
    ]);
  });

  it("preserves order when the cover is missing", () => {
    expect(orderFeedPostMediaDrafts(drafts, "unknown")).toEqual(drafts);
    expect(orderFeedPostMediaDrafts(drafts, null)).toEqual(drafts);
  });
});
