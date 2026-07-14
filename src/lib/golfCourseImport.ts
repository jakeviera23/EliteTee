import type {
  CourseImportBatchRecord,
  CourseImportRecordInput,
  CourseImportRecordRow,
} from "../types/golfCourseImport";
import { normalizeGolfCourseNameForMatch } from "./golfCourseDuplicates";
import { supabase } from "./supabase";

function normalizeImportRecordRow(row: Record<string, unknown>): CourseImportRecordRow {
  return {
    id: String(row.id ?? ""),
    batch_id: String(row.batch_id ?? ""),
    external_id: row.external_id ? String(row.external_id) : null,
    source_name: String(row.source_name ?? ""),
    status: String(row.status ?? "pending") as CourseImportRecordRow["status"],
    raw_payload:
      row.raw_payload && typeof row.raw_payload === "object" && !Array.isArray(row.raw_payload)
        ? (row.raw_payload as Record<string, unknown>)
        : {},
    normalized_name: row.normalized_name ? String(row.normalized_name) : null,
    name: row.name ? String(row.name) : null,
    city: row.city ? String(row.city) : null,
    region: row.region ? String(row.region) : null,
    country: row.country ? String(row.country) : null,
    duplicate_candidate_ids: Array.isArray(row.duplicate_candidate_ids)
      ? row.duplicate_candidate_ids.map((id) => String(id))
      : [],
    matched_golf_course_id: row.matched_golf_course_id ? String(row.matched_golf_course_id) : null,
    resulting_golf_course_id: row.resulting_golf_course_id
      ? String(row.resulting_golf_course_id)
      : null,
    error_message: row.error_message ? String(row.error_message) : null,
    processed_at: row.processed_at ? String(row.processed_at) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeImportBatchRow(row: Record<string, unknown>): CourseImportBatchRecord {
  return {
    id: String(row.id ?? ""),
    source_name: String(row.source_name ?? ""),
    source_label: row.source_label ? String(row.source_label) : null,
    status: String(row.status ?? "pending") as CourseImportBatchRecord["status"],
    started_at: row.started_at ? String(row.started_at) : null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    created_by_email: row.created_by_email ? String(row.created_by_email) : null,
    total_records: Number(row.total_records ?? 0),
    processed_count: Number(row.processed_count ?? 0),
    success_count: Number(row.success_count ?? 0),
    inserted_count: Number(row.inserted_count ?? 0),
    updated_count: Number(row.updated_count ?? 0),
    skipped_count: Number(row.skipped_count ?? 0),
    duplicate_count: Number(row.duplicate_count ?? 0),
    error_count: Number(row.error_count ?? 0),
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function buildCourseImportRecordPreview(input: CourseImportRecordInput) {
  return {
    external_id: input.external_id?.trim() || null,
    name: input.name?.trim() || null,
    city: input.city?.trim() || null,
    region: input.region?.trim() || null,
    country: input.country?.trim() || null,
    normalized_name: normalizeGolfCourseNameForMatch(input.name),
    raw_payload: input.raw_payload ?? {},
  };
}

export async function adminCreateCourseImportBatch(input: {
  sourceName: string;
  sourceLabel?: string | null;
  notes?: string | null;
}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("admin_create_course_import_batch", {
    p_source_name: input.sourceName.trim(),
    p_source_label: input.sourceLabel?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });

  if (error) {
    return { data: null, error };
  }

  return {
    data: normalizeImportBatchRow((data ?? {}) as Record<string, unknown>),
    error: null,
  };
}

export async function adminAddCourseImportRecord(
  batchId: string,
  sourceName: string,
  input: CourseImportRecordInput = {},
) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const preview = buildCourseImportRecordPreview(input);

  const { data, error } = await supabase.rpc("admin_add_course_import_record", {
    p_batch_id: batchId,
    p_source_name: sourceName.trim(),
    p_external_id: preview.external_id,
    p_name: preview.name,
    p_city: preview.city,
    p_region: preview.region,
    p_country: preview.country,
    p_raw_payload: preview.raw_payload,
  });

  if (error) {
    return { data: null, error };
  }

  return {
    data: normalizeImportRecordRow((data ?? {}) as Record<string, unknown>),
    error: null,
  };
}

export async function adminFindGolfCourseDuplicateCandidates(input: CourseImportRecordInput & {
  excludeCourseId?: string | null;
}) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase.rpc("admin_find_golf_course_duplicate_candidates", {
    p_external_id: input.external_id?.trim() || null,
    p_name: input.name?.trim() || null,
    p_city: input.city?.trim() || null,
    p_country: input.country?.trim() || null,
    p_exclude_course_id: input.excludeCourseId?.trim() || null,
  });

  if (error) {
    return { data: null, error };
  }

  return { data: data ?? [], error: null };
}
