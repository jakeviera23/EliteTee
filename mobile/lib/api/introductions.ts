import type { MobileMemberProfile } from "@/types/member";
import type { IntroductionRequestType, MobileIntroductionRequest } from "@/types/introduction";
import { getCurrentUserId } from "./members";
import { requireSupabase } from "../supabase";

type IntroductionRequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  request_type: IntroductionRequestType;
  message: string;
  created_at: string;
  accepted_at?: string | null;
  response_message?: string | null;
};

async function attachProfileNames(
  requests: IntroductionRequestRow[],
): Promise<MobileIntroductionRequest[]> {
  if (requests.length === 0) return [];

  const client = requireSupabase();
  const userIds = [
    ...new Set(requests.flatMap((request) => [request.sender_id, request.receiver_id])),
  ];

  const { data: profiles } = await client
    .from("member_profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  const nameByUserId = new Map(
    (profiles ?? [])
      .filter((profile) => profile.user_id)
      .map((profile) => [String(profile.user_id), String(profile.full_name ?? "Member")]),
  );

  return requests.map((request) => ({
    ...request,
    sender_name: nameByUserId.get(request.sender_id),
    receiver_name: nameByUserId.get(request.receiver_id),
  }));
}

export async function fetchIntroductionRequests() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("introduction_requests")
    .select(
      "id, sender_id, receiver_id, status, request_type, message, created_at, accepted_at, response_message",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as MobileIntroductionRequest[], error };
  }

  const withNames = await attachProfileNames((data ?? []) as IntroductionRequestRow[]);
  return { data: withNames, error: null };
}

export async function createIntroductionRequest({
  receiverMember,
  requestType,
  message,
}: {
  receiverMember: Pick<MobileMemberProfile, "user_id" | "full_name">;
  requestType: IntroductionRequestType;
  message: string;
}) {
  const { userId: senderId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !senderId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in.") };
  }

  const receiverId = receiverMember.user_id;
  if (!receiverId) {
    return { data: null, error: new Error("This member is not linked to a user account yet.") };
  }

  if (senderId === receiverId) {
    return { data: null, error: new Error("You cannot request an introduction to yourself.") };
  }

  const client = requireSupabase();
  const { data: existingPending } = await client
    .from("introduction_requests")
    .select("id")
    .eq("sender_id", senderId)
    .eq("receiver_id", receiverId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending) {
    return {
      data: null,
      error: new Error(
        "You already have a pending introduction request with this member. Check Introduction Requests for status.",
      ),
    };
  }

  const { data, error } = await client
    .from("introduction_requests")
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      status: "pending",
      request_type: requestType,
      message: message.trim(),
    })
    .select("id")
    .single();

  return { data, error };
}

export async function updateIntroductionRequestStatus(
  requestId: string,
  status: "accepted" | "declined",
  responseMessage?: string,
) {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in.") };
  }

  const updatePayload: {
    status: "accepted" | "declined";
    accepted_at?: string;
    response_message?: string;
  } = { status };

  if (status === "accepted") {
    updatePayload.accepted_at = new Date().toISOString();
  }

  const trimmedResponseMessage = responseMessage?.trim();
  if (trimmedResponseMessage) {
    updatePayload.response_message = trimmedResponseMessage;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("introduction_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: new Error("Unable to update this introduction request.") };
  }

  return { data, error: null };
}

export async function cancelIntroductionRequest(requestId: string) {
  const { userId, error: sessionError } = await getCurrentUserId();
  if (sessionError || !userId) {
    return { data: null, error: sessionError ?? new Error("You must be signed in.") };
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("introduction_requests")
    .update({ status: "declined" })
    .eq("id", requestId)
    .eq("sender_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: new Error("Unable to cancel this introduction request.") };
  }

  return { data, error: null };
}

function sharedValues(left: string[], right: string[]) {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => rightSet.has(value.toLowerCase()));
}

export function buildIntroductionRecommendations({
  viewer,
  members,
  requests,
  limit = 5,
}: {
  viewer: MobileMemberProfile | null;
  members: MobileMemberProfile[];
  requests: MobileIntroductionRequest[];
  limit?: number;
}) {
  if (!viewer?.user_id) return [];

  return members
    .filter((member) => {
      if (!member.user_id || member.user_id === viewer.user_id) return false;
      return !requests.some(
        (request) =>
          request.status !== "declined" &&
          ((request.sender_id === viewer.user_id && request.receiver_id === member.user_id) ||
            (request.receiver_id === viewer.user_id && request.sender_id === member.user_id)),
      );
    })
    .map((member) => {
      const reasons: string[] = [];
      let score = 0;

      if (
        viewer.based_in &&
        member.based_in &&
        viewer.based_in.toLowerCase() === member.based_in.toLowerCase()
      ) {
        reasons.push(`Also based in ${member.based_in}`);
        score += 3;
      }

      if (
        viewer.primary_club &&
        member.primary_club &&
        viewer.primary_club.toLowerCase() === member.primary_club.toLowerCase()
      ) {
        reasons.push(`Same home club`);
        score += 2;
      }

      const sharedGolf = sharedValues(viewer.golf_interests, member.golf_interests);
      if (sharedGolf.length > 0) {
        reasons.push(`Shared golf interests: ${sharedGolf.slice(0, 2).join(", ")}`);
        score += sharedGolf.length;
      }

      const sharedBusiness = sharedValues(viewer.business_interests, member.business_interests);
      if (sharedBusiness.length > 0) {
        reasons.push(`Shared business interests: ${sharedBusiness.slice(0, 2).join(", ")}`);
        score += sharedBusiness.length;
      }

      if (member.traveling_to?.trim()) {
        reasons.push(`Traveling to ${member.traveling_to.trim()}`);
        score += 1;
      }

      return { member, reasons: reasons.slice(0, 3), score };
    })
    .filter((recommendation) => recommendation.score > 0 && recommendation.reasons.length > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.member.full_name.localeCompare(right.member.full_name),
    )
    .slice(0, limit);
}
