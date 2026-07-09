export type PrivateMessageRecord = {
  id: string;
  introduction_request_id: string | null;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};

export type DirectConversationSummary = {
  otherUserId: string;
  otherUserName: string;
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
};
