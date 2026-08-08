import { describe, expect, it, vi, beforeEach } from "vitest";
import type { FeedPost } from "../data/portalSocial";
import { publishRoundReview } from "./publishRoundReview";

const submitMemberCourseRound = vi.fn();
const uploadCourseRoundPhotos = vi.fn();
const setRoundCoverPhoto = vi.fn();
const fetchPhotosForRoundIds = vi.fn();
const createCourseRoundFeedPost = vi.fn();
const fetchMemberFeedPostForRound = vi.fn();

vi.mock("./memberCourseRounds", () => ({
  submitMemberCourseRound: (...args: unknown[]) => submitMemberCourseRound(...args),
}));

vi.mock("./memberCourseRoundPhotos", () => ({
  uploadCourseRoundPhotos: (...args: unknown[]) => uploadCourseRoundPhotos(...args),
  setRoundCoverPhoto: (...args: unknown[]) => setRoundCoverPhoto(...args),
  fetchPhotosForRoundIds: (...args: unknown[]) => fetchPhotosForRoundIds(...args),
}));

vi.mock("./memberFeedPosts", () => ({
  createCourseRoundFeedPost: (...args: unknown[]) => createCourseRoundFeedPost(...args),
  fetchMemberFeedPostForRound: (...args: unknown[]) => fetchMemberFeedPostForRound(...args),
}));

const baseInput = {
  courseName: "Pine Valley",
  message: "A memorable round with perfect conditions today.",
  courseRating: 9.5,
  photoDrafts: [],
  coverDraftId: null,
};

describe("publishRoundReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitMemberCourseRound.mockResolvedValue({ data: { id: "round-1" }, error: null });
    fetchPhotosForRoundIds.mockResolvedValue({ data: [], error: null });
    fetchMemberFeedPostForRound.mockResolvedValue({ data: null, error: null });
    createCourseRoundFeedPost.mockResolvedValue({
      data: { id: "post-1" } as FeedPost,
      error: null,
    });
    uploadCourseRoundPhotos.mockResolvedValue({
      data: { uploaded: [{ id: "photo-1", sort_order: 0 }], failed: [] },
      error: null,
    });
    setRoundCoverPhoto.mockResolvedValue({ error: null });
  });

  it("creates a round and feed post when no photos are attached", async () => {
    const result = await publishRoundReview(baseInput);

    expect(result.ok).toBe(true);
    expect(submitMemberCourseRound).toHaveBeenCalledOnce();
    expect(uploadCourseRoundPhotos).not.toHaveBeenCalled();
    expect(createCourseRoundFeedPost).toHaveBeenCalledOnce();
  });

  it("does not publish successfully when photo upload fails", async () => {
    uploadCourseRoundPhotos.mockResolvedValue({
      data: { uploaded: [], failed: [{ fileName: "a.jpg", message: "Upload failed." }] },
      error: null,
    });

    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const result = await publishRoundReview({
      ...baseInput,
      photoDrafts: [
        {
          id: "draft-1",
          file,
          previewUrl: "blob:preview",
          caption: "",
          sortOrder: 0,
        },
      ],
      coverDraftId: "draft-1",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(createCourseRoundFeedPost).not.toHaveBeenCalled();
    expect(result.pending).toEqual({ roundId: "round-1", photosComplete: false });
  });

  it("uploads photos before creating the feed post", async () => {
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const result = await publishRoundReview({
      ...baseInput,
      photoDrafts: [
        {
          id: "draft-1",
          file,
          previewUrl: "blob:preview",
          caption: "",
          sortOrder: 0,
        },
      ],
      coverDraftId: "draft-1",
    });

    expect(result.ok).toBe(true);
    expect(uploadCourseRoundPhotos).toHaveBeenCalled();
    expect(createCourseRoundFeedPost).toHaveBeenCalled();
    expect(uploadCourseRoundPhotos.mock.invocationCallOrder[0]).toBeLessThan(
      createCourseRoundFeedPost.mock.invocationCallOrder[0],
    );
    expect(setRoundCoverPhoto).toHaveBeenCalledWith("round-1", "photo-1");
  });

  it("reuses an existing feed post on retry after photos are complete", async () => {
    const existingPost = { id: "post-existing" } as FeedPost;
    fetchMemberFeedPostForRound.mockResolvedValue({ data: existingPost, error: null });

    const result = await publishRoundReview(baseInput, {
      roundId: "round-1",
      photosComplete: true,
    });

    if (result.ok) {
      expect(result.post).toBe(existingPost);
    } else {
      expect.fail("expected publishRoundReview to succeed");
    }
    expect(submitMemberCourseRound).not.toHaveBeenCalled();
    expect(createCourseRoundFeedPost).not.toHaveBeenCalled();
  });
});
