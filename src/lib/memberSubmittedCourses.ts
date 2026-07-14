import type { GolfCourseRecord } from "../types/golfCourse";
import { supabase } from "./supabase";

/** Mirrors public.can_edit_member_submitted_golf_course authorization rules. */
export function canEditMemberSubmittedCourseRecord(
  course: Pick<GolfCourseRecord, "source_name" | "submitted_by_member" | "created_by_user_id">,
  userId: string | null,
  isAdmin: boolean,
): boolean {
  if (course.source_name !== "member_submitted" || !course.submitted_by_member) {
    return false;
  }
  if (isAdmin) return true;
  if (!userId || !course.created_by_user_id) return false;
  return course.created_by_user_id === userId;
}

export async function canEditMemberSubmittedCourse(courseId: string) {
  if (!supabase) return { data: null, error: new Error("Supabase is not configured.") };
  const normalizedId = courseId.trim();
  if (!normalizedId) return { data: null, error: new Error("Course id is required.") };

  const { data, error } = await supabase.rpc("can_edit_member_submitted_golf_course", {
    p_course_id: normalizedId,
  });

  if (error) return { data: null, error };
  return { data: Boolean(data), error: null };
}

export async function updateMemberSubmittedCourse(input: {
  courseId: string;
  name: string;
  city: string;
  region: string;
  country: string;
  website_url?: string;
  course_type?: string;
  access_type?: string;
  holes?: number | null;
}) {
  if (!supabase) return { data: null, error: new Error("Supabase is not configured.") };

  const { data, error } = await supabase.rpc("update_member_submitted_golf_course", {
    p_course_id: input.courseId.trim(),
    p_name: input.name.trim(),
    p_city: input.city.trim(),
    p_region: input.region.trim(),
    p_country: input.country.trim(),
    p_website_url: input.website_url?.trim() ?? "",
    p_course_type: input.course_type?.trim() ?? "",
    p_access_type: input.access_type?.trim() ?? "",
    p_holes: input.holes ?? null,
  });

  if (error) return { data: null, error };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { data: null, error: new Error("Course update did not return a result.") };

  return { data: row as unknown as Partial<GolfCourseRecord>, error: null };
}

