import { validateCourseRating } from "./courseRating";
import {
  FEED_ROUND_REVIEW_LOCATION_REQUIRED_MESSAGE,
  isUsableRoundReviewLocation,
} from "./feedRoundReviewLocation";

export const FEED_COMPOSER_MIN_MESSAGE_LENGTH = 20;

export type FeedComposerValidationInput = {
  message: string;
  primaryFieldValue?: string;
  primaryFieldLabel?: string;
  requiresPrimaryField: boolean;
  ratingValue?: string;
  requiresRating: boolean;
  /** When true, locationValue must be a usable round location. */
  requiresLocation?: boolean;
  locationValue?: string;
  locationMissingMessage?: string;
};

export type FeedComposerValidationResult = {
  messageLength: number;
  minMessageLength: number;
  canSubmit: boolean;
  blockerMessage: string | null;
  characterCounterLabel: string;
};

export function getFeedComposerMessageLength(message: string): number {
  return message.trim().length;
}

export function getFeedComposerValidation(
  input: FeedComposerValidationInput,
): FeedComposerValidationResult {
  const messageLength = getFeedComposerMessageLength(input.message);
  const messageTooShort = messageLength < FEED_COMPOSER_MIN_MESSAGE_LENGTH;
  const primaryMissing =
    input.requiresPrimaryField && !input.primaryFieldValue?.trim();
  const ratingInvalid =
    input.requiresRating && !validateCourseRating(input.ratingValue ?? "").ok;
  const locationMissing =
    Boolean(input.requiresLocation) && !isUsableRoundReviewLocation(input.locationValue);

  const canSubmit =
    !messageTooShort && !primaryMissing && !ratingInvalid && !locationMissing;

  let blockerMessage: string | null = null;
  if (messageTooShort) {
    blockerMessage = `Enter at least ${FEED_COMPOSER_MIN_MESSAGE_LENGTH} characters to post.`;
  } else if (primaryMissing && input.primaryFieldLabel) {
    blockerMessage = `Add ${input.primaryFieldLabel.toLowerCase()} to post.`;
  } else if (ratingInvalid) {
    blockerMessage = "Select a course rating to post.";
  } else if (locationMissing) {
    blockerMessage =
      input.locationMissingMessage ?? FEED_ROUND_REVIEW_LOCATION_REQUIRED_MESSAGE;
  }

  return {
    messageLength,
    minMessageLength: FEED_COMPOSER_MIN_MESSAGE_LENGTH,
    canSubmit,
    blockerMessage,
    characterCounterLabel: `${messageLength} / ${FEED_COMPOSER_MIN_MESSAGE_LENGTH} characters`,
  };
}
