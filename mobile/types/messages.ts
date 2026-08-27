export type MobilePrivateMessageAttachment = {
  id: string;
  message_id: string;
  storage_path: string;
  content_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
  signedUrl?: string | null;
};

export type MobilePrivateMessage = {
  id: string;
  introduction_request_id: string | null;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
  edited_at?: string | null;
  attachments?: MobilePrivateMessageAttachment[];
};

export type MobileConversationSummary = {
  otherUserId: string;
  otherUserName: string;
  otherUserPhotoUrl: string | null;
  otherUserPrimaryClub: string;
  otherUserBasedIn: string;
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
};
