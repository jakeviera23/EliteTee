export const GOLF_COURSE_ELITE_TIERS = [
  "global_icon",
  "elite_private",
  "destination",
  "notable",
  "member_course",
] as const;

export type GolfCourseEliteTier = (typeof GOLF_COURSE_ELITE_TIERS)[number];

export const GOLF_COURSE_CURATED_TAGS = [
  "historic",
  "championship",
  "links",
  "resort",
  "architecturally_significant",
  "bucket_list",
  "private",
  "public_access",
] as const;

export type GolfCourseCuratedTag = (typeof GOLF_COURSE_CURATED_TAGS)[number];

export const GOLF_COURSE_FEATURED_STATUSES = ["featured", "standard"] as const;

export type GolfCourseFeaturedStatus = (typeof GOLF_COURSE_FEATURED_STATUSES)[number];

export type GolfCourseCuratedMetadata = {
  elite_tier?: GolfCourseEliteTier | null;
  curated_tags?: GolfCourseCuratedTag[];
  featured_status?: GolfCourseFeaturedStatus | null;
};
