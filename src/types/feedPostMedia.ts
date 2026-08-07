export type FeedPostMediaRecord = {
  id: string;
  feed_post_id: string;
  user_id: string;
  storage_path: string;
  caption?: string | null;
  sort_order: number;
  width?: number | null;
  height?: number | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  moderation_status: string;
  hidden_at?: string | null;
  hidden_reason?: string | null;
  created_at: string;
  signed_url?: string | null;
};

export type FeedPostMediaDraft = {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  sortOrder: number;
};

export type FeedPostMediaUploadResult = {
  uploaded: FeedPostMediaRecord[];
  failed: Array<{ fileName: string; message: string }>;
};
