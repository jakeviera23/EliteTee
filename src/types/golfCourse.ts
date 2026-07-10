export type GolfCourseRecord = {
  id: string;
  external_id?: string | null;
  name: string;
  slug: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  website_url?: string | null;
  course_type?: string | null;
  access_type?: string | null;
  holes?: number | null;
  description?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  image_source?: string | null;
  image_attribution?: string | null;
  image_license?: string | null;
  image_updated_at?: string | null;
  source_name?: string | null;
  submitted_by_member?: boolean;
  round_count?: number;
  member_count?: number;
  recommend_pct?: number | null;
  latest_activity_at?: string | null;
};

export type GolfCourseSearchResult = GolfCourseRecord;

export type GolfCourseImageVariant = "card" | "hero";

export function isMemberSubmittedCourse(
  course: Pick<GolfCourseRecord, "source_name" | "submitted_by_member">,
) {
  return Boolean(course.submitted_by_member) || course.source_name === "member_submitted";
}

export function formatGolfCourseLocation(course: Pick<GolfCourseRecord, "city" | "region" | "country">) {
  return [course.city, course.region, course.country].filter(Boolean).join(", ");
}

export function getGolfCourseInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z]/g, ""))
    .filter(Boolean);

  if (parts.length === 0) return "GC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function resolveGolfCourseDisplayImage(
  course: Pick<GolfCourseRecord, "image_url" | "thumbnail_url">,
  variant: GolfCourseImageVariant,
) {
  const imageUrl = course.image_url?.trim() || null;
  const thumbnailUrl = course.thumbnail_url?.trim() || null;

  if (variant === "hero") {
    return imageUrl ?? thumbnailUrl;
  }

  return thumbnailUrl ?? imageUrl;
}
