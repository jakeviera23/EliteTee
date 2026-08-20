export type MobilePrivateMessage = {
  id: string;
  introduction_request_id: string | null;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
  edited_at?: string | null;
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
