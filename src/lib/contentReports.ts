import { isSupabaseConfigured, supabase } from "./supabase";

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

export const CONTENT_REPORT_REASONS = [
  { value: "harassment", label: "Harassment or abusive behavior" },
  { value: "inappropriate_content", label: "Inappropriate or objectionable content" },
  { value: "spam", label: "Spam or misleading content" },
  { value: "other", label: "Other" },
] as const;

export type ContentReportReason = (typeof CONTENT_REPORT_REASONS)[number]["value"];
export type ContentReportTargetType =
  | "feed_post"
  | "feed_comment"
  | "private_message"
  | "member_profile";

export type ContentReportRecord = {
  id: string;
  reporter_user_id: string;
  target_type: ContentReportTargetType;
  target_id: string;
  target_user_id: string | null;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  resolution_notes: string | null;
};

export function formatContentReportError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : "Something went wrong while submitting your report.";

  const lower = message.toLowerCase();
  if (lower.includes("already have an open report")) {
    return "You already have an open report for this content.";
  }
  if (lower.includes("could not be found")) {
    return "That content is no longer available to report.";
  }
  if (lower.includes("cannot report your own")) {
    return "You cannot report your own content.";
  }
  if (lower.includes("portal access")) {
    return "Portal access is required to submit a report.";
  }
  return "Your report could not be submitted. Please try again.";
}

export async function submitContentReport(input: {
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ContentReportReason;
  details?: string;
}): Promise<ContentReportRecord> {
  const client = requireClient();
  const { data, error } = await client.rpc("submit_content_report", {
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_reason: input.reason,
    p_details: input.details?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const report = data as ContentReportRecord;
  void notifyAdminsOfSafetyEvent({ type: "content_report", id: report.id });
  return report;
}

async function notifyAdminsOfSafetyEvent(payload: {
  type: "content_report" | "member_block";
  id: string;
}) {
  try {
    const client = requireClient();
    await client.functions.invoke("notify-admin-safety", {
      body: payload,
    });
  } catch {
    // In-app admin alerts are still queued in the database.
  }
}
