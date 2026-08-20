export type MobileRoundPhotoDraft = {
  id: string;
  uri: string;
  mimeType: string;
  fileName: string;
  sortOrder: number;
  caption: string;
};

export type MobileCourseRoundRecord = {
  id: string;
  member_user_id: string;
  golf_course_id: string | null;
  course_name: string;
  location: string;
  played_on: string;
  note: string;
  would_play_again: boolean;
  course_rating: number;
  cover_photo_id: string | null;
  created_at: string;
  member_name?: string;
  /** Linked member feed post when this round was published to the feed. */
  feed_post_id?: string | null;
  photos?: MobileCourseRoundPhoto[];
  course_slug?: string;
};

export type MobileCourseRoundPhoto = {
  id: string;
  member_course_round_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  signed_url?: string | null;
};
