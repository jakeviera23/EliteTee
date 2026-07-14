export const GOLF_COURSE_LIFECYCLE_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "hidden",
] as const;

export type GolfCourseLifecycleStatus = (typeof GOLF_COURSE_LIFECYCLE_STATUSES)[number];

export const COURSE_IMPORT_BATCH_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type CourseImportBatchStatus = (typeof COURSE_IMPORT_BATCH_STATUSES)[number];

export const COURSE_IMPORT_RECORD_STATUSES = [
  "pending",
  "validated",
  "duplicate",
  "inserted",
  "updated",
  "skipped",
  "error",
] as const;

export type CourseImportRecordStatus = (typeof COURSE_IMPORT_RECORD_STATUSES)[number];

export const GOLF_COURSE_ENRICHMENT_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "needs_review",
] as const;

export type GolfCourseEnrichmentStatus = (typeof GOLF_COURSE_ENRICHMENT_STATUSES)[number];

export type GolfCourseDuplicateMatchReason =
  | "external_id"
  | "normalized_name_city_country"
  | "normalized_name_country";

export type GolfCourseDuplicateCandidate = {
  golf_course_id: string;
  match_reason: GolfCourseDuplicateMatchReason;
  match_rank: number;
};

export type CourseImportBatchRecord = {
  id: string;
  source_name: string;
  source_label: string | null;
  status: CourseImportBatchStatus;
  started_at: string | null;
  completed_at: string | null;
  created_by_email: string | null;
  total_records: number;
  processed_count: number;
  success_count: number;
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
  duplicate_count: number;
  error_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseImportRecordRow = {
  id: string;
  batch_id: string;
  external_id: string | null;
  source_name: string;
  status: CourseImportRecordStatus;
  raw_payload: Record<string, unknown>;
  normalized_name: string | null;
  name: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  duplicate_candidate_ids: string[];
  matched_golf_course_id: string | null;
  resulting_golf_course_id: string | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseImportRecordInput = {
  external_id?: string | null;
  name?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  raw_payload?: Record<string, unknown>;
};
