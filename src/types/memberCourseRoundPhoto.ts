export type CourseRoundMediaKind = "image" | "video";

export type MemberCourseRoundPhotoRecord = {
  id: string;
  member_course_round_id: string;
  user_id: string;
  golf_course_id?: string | null;
  storage_path: string;
  caption?: string | null;
  sort_order: number;
  width?: number | null;
  height?: number | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  media_kind?: CourseRoundMediaKind;
  duration_seconds?: number | null;
  poster_storage_path?: string | null;
  is_featured: boolean;
  moderation_status: string;
  hidden_at?: string | null;
  hidden_reason?: string | null;
  created_at: string;
  /** Populated client-side after signing storage paths */
  signed_url?: string | null;
  /** Signed poster for videos */
  poster_signed_url?: string | null;
  /** Populated when fetching course gallery */
  member_name?: string;
  played_on?: string;
};

export type CourseRoundPhotoDraft = {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  sortOrder: number;
  mediaKind?: CourseRoundMediaKind;
};

export type CourseRoundPhotoUploadResult = {
  uploaded: MemberCourseRoundPhotoRecord[];
  failed: Array<{ fileName: string; message: string }>;
};
