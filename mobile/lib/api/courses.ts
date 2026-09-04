import type { MobileGolfCourse } from "@/types/course";
import { requireSupabase } from "../supabase";

const SEARCH_PAGE_SIZE = 20;

function normalizeCourseRow(row: Record<string, unknown>): MobileGolfCourse {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    city: row.city ? String(row.city) : null,
    region: row.region ? String(row.region) : null,
    country: row.country ? String(row.country) : null,
    course_type: row.course_type ? String(row.course_type) : null,
    access_type: row.access_type ? String(row.access_type) : null,
    holes: row.holes === null || row.holes === undefined ? null : Number(row.holes),
    par: row.par === null || row.par === undefined ? null : Number(row.par),
    yardage: row.yardage === null || row.yardage === undefined ? null : Number(row.yardage),
    description: row.description ? String(row.description) : null,
    image_url: row.image_url ? String(row.image_url) : null,
    thumbnail_url: row.thumbnail_url ? String(row.thumbnail_url) : null,
    architect: row.architect ? String(row.architect) : null,
    year_opened:
      row.year_opened === null || row.year_opened === undefined ? null : Number(row.year_opened),
    round_count: row.round_count === undefined ? undefined : Number(row.round_count ?? 0),
    member_count: row.member_count === undefined ? undefined : Number(row.member_count ?? 0),
    recommend_pct:
      row.recommend_pct === null || row.recommend_pct === undefined
        ? null
        : Number(row.recommend_pct),
    avg_rating:
      row.avg_rating === null || row.avg_rating === undefined ? null : Number(row.avg_rating),
    latest_activity_at: row.latest_activity_at ? String(row.latest_activity_at) : null,
    submitted_by_member: Boolean(row.submitted_by_member),
    source_name: row.source_name ? String(row.source_name) : null,
  };
}

export async function searchGolfCourses({
  query = "",
  limit = SEARCH_PAGE_SIZE,
  offset = 0,
}: {
  query?: string;
  limit?: number;
  offset?: number;
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("search_golf_courses", {
    p_query: query.trim(),
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    return { data: [] as MobileGolfCourse[], error };
  }

  return {
    data: (data ?? []).map((row: Record<string, unknown>) => normalizeCourseRow(row)),
    error: null,
  };
}

/** Full production directory page — same RPC the web Courses page uses. */
export async function fetchGolfCourseDirectoryPage({
  query = "",
  limit = SEARCH_PAGE_SIZE,
  offset = 0,
}: {
  query?: string;
  limit?: number;
  offset?: number;
} = {}) {
  return searchGolfCourses({ query, limit, offset });
}

export async function fetchPopularGolfCourses(limit = 20) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("popular_golf_courses", {
    p_limit: limit,
  });

  if (error) {
    return { data: [] as MobileGolfCourse[], error };
  }

  return {
    data: (data ?? []).map((row: Record<string, unknown>) => normalizeCourseRow(row)),
    error: null,
  };
}

export async function fetchGolfCourseBySlug(slug: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_golf_course_by_slug", {
    p_slug: slug.trim(),
  });

  if (error) {
    return { data: null, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { data: null, error: null };
  }

  return {
    data: normalizeCourseRow(row as Record<string, unknown>),
    error: null,
  };
}

export async function findOrCreateMemberGolfCourse(courseName: string, location: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("find_or_create_member_golf_course", {
    p_course_name: courseName.trim(),
    p_location: location.trim(),
  });

  if (error) {
    return { data: null, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { data: null, error: new Error("Could not link this course to the directory.") };
  }

  return {
    data: {
      id: String((row as { golf_course_id: string }).golf_course_id),
      slug: String((row as { slug: string }).slug),
    },
    error: null,
  };
}

export { SEARCH_PAGE_SIZE };
