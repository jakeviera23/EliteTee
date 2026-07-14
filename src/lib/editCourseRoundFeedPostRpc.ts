import type { CourseRoundPostEditInput } from "./feedPostEditing";

export function buildEditCourseRoundFeedPostRpcParams(
  postId: string,
  payload: CourseRoundPostEditInput,
  courseRating: number,
) {
  const base = {
    p_post_id: postId,
    p_message: payload.message.trim(),
    p_course_rating: courseRating,
    p_played_on: payload.playedOn,
    p_would_play_again: payload.wouldPlayAgain,
    p_location: payload.location.trim(),
  };

  const city = payload.city?.trim();
  const region = payload.region?.trim();
  const country = payload.country?.trim();

  if (city && region && country) {
    return {
      ...base,
      p_city: city,
      p_region: region,
      p_country: country,
    };
  }

  return base;
}
