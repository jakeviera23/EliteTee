import type { MobileRoundPhotoDraft } from "@/types/courseRoundPhoto";
import {
  createCourseRoundFeedPost,
  fetchMemberFeedPostForRound,
} from "./feedPosts";
import { fetchPhotosForRoundIds, setRoundCoverPhoto, uploadCourseRoundPhotos } from "./courseRoundPhotos";
import { submitMemberCourseRound } from "./courseRounds";

export type PublishRoundReviewInput = {
  courseName: string;
  location?: string;
  golfCourseId?: string | null;
  message: string;
  courseRating: number;
  playedWith?: string;
  photoDrafts: MobileRoundPhotoDraft[];
  coverDraftId: string | null;
  playedOn?: string;
  wouldPlayAgain?: boolean;
};

export type PublishRoundReviewPending = {
  roundId: string;
  photosComplete: boolean;
};

export type PublishRoundReviewOutcome =
  | { ok: true; postId: string }
  | {
      ok: false;
      error: string;
      pending?: PublishRoundReviewPending;
    };

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function publishRoundReview(
  input: PublishRoundReviewInput,
  pending?: PublishRoundReviewPending | null,
): Promise<PublishRoundReviewOutcome> {
  let roundId = pending?.roundId;
  let photosComplete = pending?.photosComplete ?? false;

  if (!roundId) {
    const { data: roundData, error: roundError } = await submitMemberCourseRound({
      course_name: input.courseName,
      location: input.location?.trim() ?? "",
      played_on: input.playedOn ?? todayIsoDate(),
      note: input.message,
      would_play_again: input.wouldPlayAgain ?? true,
      course_rating: input.courseRating,
      golf_course_id: input.golfCourseId,
    });

    if (roundError || !roundData?.id) {
      return {
        ok: false,
        error: roundError?.message ?? "Your round could not be saved.",
      };
    }

    roundId = roundData.id;
  }

  if (!photosComplete && input.photoDrafts.length > 0) {
    const { data: existingPhotos } = await fetchPhotosForRoundIds([roundId]);
    if ((existingPhotos?.length ?? 0) >= input.photoDrafts.length) {
      photosComplete = true;
    }
  }

  if (!photosComplete && input.photoDrafts.length > 0) {
    const { data: uploadResult, error: uploadError } = await uploadCourseRoundPhotos(
      roundId,
      input.photoDrafts,
    );

    if (uploadError) {
      return {
        ok: false,
        error: uploadError.message ?? "Photos could not be uploaded. Please try again.",
        pending: { roundId, photosComplete: false },
      };
    }

    const uploadedCount = uploadResult?.uploaded.length ?? 0;
    const failedCount = uploadResult?.failed.length ?? 0;

    if (failedCount > 0 || uploadedCount === 0) {
      const firstFailure = uploadResult?.failed[0]?.message ?? "Photo upload failed.";
      return {
        ok: false,
        error:
          failedCount > 0 && uploadedCount > 0
            ? `${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded, but ${failedCount} failed. Please try again.`
            : `Photos could not be uploaded: ${firstFailure}`,
        pending: { roundId, photosComplete: false },
      };
    }

    const coverDraft =
      input.photoDrafts.find((draft) => draft.id === input.coverDraftId) ??
      input.photoDrafts[0] ??
      null;
    const coverPhoto =
      uploadResult?.uploaded.find((photo) => photo.sort_order === coverDraft?.sortOrder) ??
      uploadResult?.uploaded[0];

    if (coverPhoto) {
      const { error: coverError } = await setRoundCoverPhoto(roundId, coverPhoto.id);
      if (coverError) {
        return {
          ok: false,
          error: "Photos uploaded, but the cover photo could not be set. Please try again.",
          pending: { roundId, photosComplete: false },
        };
      }
    }

    photosComplete = true;
  } else if (input.photoDrafts.length === 0) {
    photosComplete = true;
  }

  const { data: existingPost, error: existingPostError } = await fetchMemberFeedPostForRound(roundId);

  if (existingPostError) {
    return {
      ok: false,
      error: existingPostError.message ?? "Your review could not be published. Please try again.",
      pending: { roundId, photosComplete },
    };
  }

  if (existingPost) {
    return { ok: true, postId: existingPost.id };
  }

  const { data: post, error: feedError } = await createCourseRoundFeedPost({
    roundId,
    courseName: input.courseName,
    location: input.location ?? "",
    note: input.message,
    wouldPlayAgain: input.wouldPlayAgain ?? true,
    playedOn: input.playedOn ?? todayIsoDate(),
    courseRating: input.courseRating,
    playedWith: input.playedWith,
  });

  if (feedError || !post) {
    return {
      ok: false,
      error:
        feedError?.message ??
        "Your review was saved, but it could not be published to the feed. Please try again.",
      pending: { roundId, photosComplete },
    };
  }

  return { ok: true, postId: post.id };
}
