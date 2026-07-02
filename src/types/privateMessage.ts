export type PrivateMessageRecord = {
  id: string;
  introduction_request_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};
