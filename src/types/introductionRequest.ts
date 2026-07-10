export const INTRODUCTION_REQUEST_TYPES = [
  "General Introduction",
  "Looking to Play Golf",
  "Traveling",
  "Business Networking",
] as const;

export type IntroductionRequestType = (typeof INTRODUCTION_REQUEST_TYPES)[number];

export const INTRODUCTION_REQUEST_TYPE_HINTS: Record<IntroductionRequestType, string> = {
  "General Introduction": "A thoughtful introduction to connect through golf.",
  "Looking to Play Golf": "You would like to arrange a round together.",
  Traveling: "You will be in their area and hope to connect.",
  "Business Networking": "You are interested in a business relationship through golf.",
};

export type IntroductionRequestStatus = "pending" | "accepted" | "declined";

export type IntroductionRequestRecord = {
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
