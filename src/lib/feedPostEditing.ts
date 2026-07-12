import { validateCourseRating } from "./courseRating";
import { isCourseRoundPost } from "./feedCardMeta";
import type { FeedPost } from "../data/portalSocial";

export const FOUNDER_WELCOME_POST_ID = "founder-welcome";

export type FeedPostEditMode = "text" | "course-round";

export type TextPostEditInput = {
  message: string;
};

export type CourseRoundPostEditInput = {
  message: string;
  courseRating: number;
  playedOn: string;
  wouldPlayAgain: boolean;
  location: string;
};

export type FeedPostEditValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function canMemberEditFeedPost(
  post: FeedPost,
  currentUserId: string | null | undefined,
): boolean {
  if (!currentUserId) return false;
  if (post.id === FOUNDER_WELCOME_POST_ID) return false;
  if (!post.authorUserId) return false;
  return post.authorUserId === currentUserId;
}

export function getFeedPostEditMode(post: FeedPost): FeedPostEditMode {
  return isCourseRoundPost(post) ? "course-round" : "text";
}

export function isFeedPostEdited(createdAt?: string, updatedAt?: string): boolean {
  if (!createdAt || !updatedAt) return false;
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  if (Number.isNaN(created) || Number.isNaN(updated)) return false;
  return updated > created;
}

export function validateTextPostEditInput(input: TextPostEditInput): FeedPostEditValidationResult {
  if (!input.message.trim()) {
    return { ok: false, message: "Post text cannot be empty." };
  }
  return { ok: true };
}

export function validateCourseRoundPostEditInput(
  input: CourseRoundPostEditInput,
): FeedPostEditValidationResult {
  const messageResult = validateTextPostEditInput({ message: input.message });
  if (!messageResult.ok) return messageResult;

  if (!input.location.trim()) {
    return { ok: false, message: "Location cannot be empty." };
  }

  const ratingResult = validateCourseRating(input.courseRating);
  if (!ratingResult.ok) {
    return { ok: false, message: ratingResult.message };
  }

  if (!input.playedOn.trim()) {
    return { ok: false, message: "Played date is required." };
  }

  const playedDate = new Date(`${input.playedOn}T12:00:00`);
  if (Number.isNaN(playedDate.getTime())) {
    return { ok: false, message: "Played date is invalid." };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (playedDate.getTime() > today.getTime()) {
    return { ok: false, message: "Played date cannot be in the future." };
  }

  if (typeof input.wouldPlayAgain !== "boolean") {
    return { ok: false, message: "Would play again is required." };
  }

  return { ok: true };
}

export function deriveCourseRoundEditDefaults(post: FeedPost): CourseRoundPostEditInput {
  const locationDetail =
    post.details?.find((detail) => detail.label.toLowerCase() === "location")?.value ??
    post.courseLocation;
  const wouldPlayAgainDetail = post.details?.find((detail) =>
    detail.label.toLowerCase().includes("would play"),
  )?.value;

  return {
    message: post.caption ?? "",
    courseRating: post.rating ?? 10,
    playedOn: post.playedOn ?? "",
    wouldPlayAgain:
      post.wouldPlayAgain ??
      (wouldPlayAgainDetail ? wouldPlayAgainDetail.toLowerCase() === "yes" : true),
    location: locationDetail ?? "",
  };
}

export function mergeFeedPostAfterEdit(
  previous: FeedPost,
  updated: FeedPost,
): FeedPost {
  return {
    ...updated,
    likes: previous.likes,
    comments: previous.comments,
    isLiked: previous.isLiked,
    isSaved: previous.isSaved,
    commentPreview: previous.commentPreview,
    images: updated.images.length > 0 ? updated.images : previous.images,
  };
}
