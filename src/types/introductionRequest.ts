export const INTRODUCTION_REQUEST_TYPES = [
  "Golf Access",
  "Business Introduction",
  "Travel Networking",
  "Reciprocal Hosting",
  "Other",
] as const;

export type IntroductionRequestType = (typeof INTRODUCTION_REQUEST_TYPES)[number];

export type IntroductionRequestStatus = "pending" | "accepted" | "declined";

export type IntroductionRequestRecord = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: IntroductionRequestStatus | string;
  request_type: IntroductionRequestType;
  message: string;
  created_at: string;
  sender_name?: string;
  receiver_name?: string;
};
