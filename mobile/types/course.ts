export type MobileGolfCourse = {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  course_type?: string | null;
  access_type?: string | null;
  holes?: number | null;
  par?: number | null;
  yardage?: number | null;
  description?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  architect?: string | null;
  year_opened?: number | null;
  round_count?: number;
  member_count?: number;
  recommend_pct?: number | null;
  avg_rating?: number | null;
  latest_activity_at?: string | null;
  submitted_by_member?: boolean;
  source_name?: string | null;
};

export function formatGolfCourseLocation(
  course: Pick<MobileGolfCourse, "city" | "region" | "country">,
): string {
  return [course.city, course.region, course.country].filter(Boolean).join(", ");
}
