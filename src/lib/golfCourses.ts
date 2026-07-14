import type { GolfCourseRecord, GolfCourseSearchResult } from "../types/golfCourse";
import { supabase } from "./supabase";

const SEARCH_PAGE_SIZE = 20;

function normalizeCourseRow(row: Record<string, unknown>): GolfCourseSearchResult {
  return {
    id: String(row.id ?? ""),
    external_id: row.external_id ? String(row.external_id) : null,
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    city: row.city ? String(row.city) : null,
    region: row.region ? String(row.region) : null,
    country: row.country ? String(row.country) : null,
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude:
      row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    website_url: row.website_url ? String(row.website_url) : null,
    course_type: row.course_type ? String(row.course_type) : null,
    access_type: row.access_type ? String(row.access_type) : null,
    holes: row.holes === null || row.holes === undefined ? null : Number(row.holes),
    par: row.par === null || row.par === undefined ? null : Number(row.par),
    yardage: row.yardage === null || row.yardage === undefined ? null : Number(row.yardage),
    description: row.description ? String(row.description) : null,
    image_url: row.image_url ? String(row.image_url) : null,
    thumbnail_url: row.thumbnail_url ? String(row.thumbnail_url) : null,
    image_source: row.image_source ? String(row.image_source) : null,
    image_attribution: row.image_attribution ? String(row.image_attribution) : null,
    image_license: row.image_license ? String(row.image_license) : null,
    image_updated_at: row.image_updated_at ? String(row.image_updated_at) : null,
    source_name: row.source_name ? String(row.source_name) : null,
    submitted_by_member: Boolean(row.submitted_by_member),
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
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("search_golf_courses", {
    p_query: query.trim(),
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    return { data: null, error };
  }

  return {
    data: (data ?? []).map((row: Record<string, unknown>) => normalizeCourseRow(row)),
    error: null,
  };
}

export async function fetchPopularGolfCourses(limit = 6) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("popular_golf_courses", {
    p_limit: limit,
  });

  if (error) {
    return { data: null, error };
  }

  return {
    data: (data ?? []).map((row: Record<string, unknown>) => normalizeCourseRow(row)),
    error: null,
  };
}

export async function findOrCreateMemberGolfCourse(courseName: string, location: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("find_or_create_member_golf_course", {
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
      createdNew: Boolean((row as { created_new?: boolean }).created_new),
    },
    error: null,
  };
}

export async function fetchGolfCourseBySlug(slug: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("get_golf_course_by_slug", {
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
    data: normalizeCourseRow(row as Record<string, unknown>) as GolfCourseRecord,
    error: null,
  };
}

export async function fetchGolfCoursesByIds(courseIds: string[]) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const normalizedIds = [...new Set(courseIds.map((id) => id.trim()).filter(Boolean))];
  if (normalizedIds.length === 0) {
    return { data: [] as GolfCourseSearchResult[], error: null };
  }

  const { data, error } = await supabase
    .from("golf_courses")
    .select(
      "id, external_id, name, slug, city, region, country, latitude, longitude, website_url, course_type, access_type, holes, description, image_url, thumbnail_url, image_source, image_attribution, image_license, image_updated_at, source_name, submitted_by_member",
    )
    .in("id", normalizedIds);

  if (error) {
    return { data: null, error };
  }

  const rowsById = new Map(
    (data ?? []).map((row) => [
      String((row as { id: string }).id),
      normalizeCourseRow(row as Record<string, unknown>),
    ]),
  );

  return {
    data: normalizedIds
      .map((id) => rowsById.get(id))
      .filter((course): course is GolfCourseSearchResult => Boolean(course)),
    error: null,
  };
}

export async function fetchGolfCourseById(courseId: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const normalizedId = courseId.trim();
  if (!normalizedId) {
    return { data: null, error: new Error("Course id is required.") };
  }

  const { data, error } = await supabase
    .from("golf_courses")
    .select(
      "id, name, slug, city, region, country, source_name, submitted_by_member, course_type, access_type",
    )
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return {
    data: normalizeCourseRow(data as Record<string, unknown>),
    error: null,
  };
}

export async function adminUpdateGolfCourseLocation(input: {
  courseId: string;
  city: string;
  region: string;
  country: string;
}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("admin_update_golf_course_location", {
    p_course_id: input.courseId.trim(),
    p_city: input.city.trim(),
    p_region: input.region.trim(),
    p_country: input.country.trim(),
  });

  if (error) {
    return { data: null, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { data: null, error: new Error("Course location could not be updated.") };
  }

  return {
    data: normalizeCourseRow(row as Record<string, unknown>),
    error: null,
  };
}

export { SEARCH_PAGE_SIZE };
