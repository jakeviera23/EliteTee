export type PrivateMessageRecord = {
  id: string;
  introduction_request_id: string | null;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
  edited_at?: string | null;
};

export type DirectConversationSummary = {
  otherUserId: string;
  otherUserName: string;
  otherUserPhotoUrl?: string | null;
  otherUserFoundingNumber?: string | null;
  otherUserPrimaryClub?: string;
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type ConversationParticipantIdentity = {
  full_name: string;
  club_logo_url: string | null;
  founding_member_number: string | null;
  primary_club: string;
};
