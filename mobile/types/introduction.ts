export const INTRODUCTION_REQUEST_TYPES = [
  "General Introduction",
  "Looking to Play Golf",
  "Traveling",
  "Business Networking",
] as const;

export type IntroductionRequestType = (typeof INTRODUCTION_REQUEST_TYPES)[number];

export type IntroductionRequestStatus = "pending" | "accepted" | "declined";

export type MobileIntroductionRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: IntroductionRequestStatus | string;
  request_type: IntroductionRequestType | string;
  message: string;
  created_at: string;
  accepted_at?: string | null;
  response_message?: string | null;
  sender_name?: string;
  receiver_name?: string;
};

export type IntroductionTab = "incoming" | "sent" | "accepted" | "declined";
