import { isSupabaseConfigured, supabase } from "./supabase";
import type { ContentReportRecord } from "./contentReports";

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

export type AdminSafetyAlert = {
  id: string;
  alert_type: "content_report" | "member_block";
  reference_id: string;
  summary: string;
  payload: Record<string, unknown>;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  email_notified_at: string | null;
};

export type AdminMemberBlockRow = {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  blocker_name: string | null;
  blocked_name: string | null;
  created_at: string;
};

export type ModerationAuditEvent = {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_user_id: string | null;
  report_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function hoursOpen(createdAt: string, now = Date.now()): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return (now - created) / (1000 * 60 * 60);
}

export function isReportApproachingDeadline(createdAt: string, now = Date.now()): boolean {
  const openHours = hoursOpen(createdAt, now);
  return openHours >= 18 && openHours < 24;
}

export function isReportPastDeadline(createdAt: string, now = Date.now()): boolean {
  return hoursOpen(createdAt, now) >= 24;
}

export async function fetchAdminContentReports(
  status?: string | null,
): Promise<ContentReportRecord[]> {
  const client = requireClient();
  const { data, error } = await client.rpc("admin_list_content_reports", {
    p_status: status?.trim() || null,
    p_limit: 200,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ContentReportRecord[];
}

export async function updateAdminContentReport(input: {
  reportId: string;
  status: ContentReportRecord["status"];
  resolutionNotes?: string;
}): Promise<ContentReportRecord> {
  const client = requireClient();
  const { data, error } = await client.rpc("admin_update_content_report", {
    p_report_id: input.reportId,
    p_status: input.status,
    p_resolution_notes: input.resolutionNotes?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as ContentReportRecord;
}

export async function hideReportedContent(input: {
  targetType: ContentReportRecord["target_type"];
  targetId: string;
  reason?: string;
  reportId?: string;
}): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc("admin_hide_reported_content", {
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_reason: input.reason?.trim() || null,
    p_report_id: input.reportId || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function setMemberPortalAccess(input: {
  userId: string;
  enabled: boolean;
  reason?: string;
  reportId?: string;
}): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc("admin_set_member_portal_access", {
    p_user_id: input.userId,
    p_enabled: input.enabled,
    p_reason: input.reason?.trim() || null,
    p_report_id: input.reportId || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchRecentMemberBlocks(): Promise<AdminMemberBlockRow[]> {
  const client = requireClient();
  const { data, error } = await client.rpc("admin_list_recent_member_blocks", {
    p_limit: 50,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdminMemberBlockRow[];
}

export async function fetchAdminSafetyAlerts(): Promise<AdminSafetyAlert[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("admin_safety_alerts")
    .select(
      "id, alert_type, reference_id, summary, payload, created_at, acknowledged_at, acknowledged_by, email_notified_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdminSafetyAlert[];
}

export async function acknowledgeSafetyAlert(alertId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc("admin_acknowledge_safety_alert", {
    p_alert_id: alertId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchModerationAuditEvents(): Promise<ModerationAuditEvent[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("moderation_audit_events")
    .select(
      "id, actor_user_id, action, target_type, target_id, target_user_id, report_id, notes, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ModerationAuditEvent[];
}
