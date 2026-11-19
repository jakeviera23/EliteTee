import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Sends optional email for queued admin_safety_alerts rows.
 * Persistent alerts are always created in-DB by report/block RPCs.
 *
 * Required for email delivery (Resend):
 * - RESEND_API_KEY
 * - ADMIN_NOTIFY_FROM_EMAIL or RESEND_FROM_EMAIL (verified sender)
 * - ADMIN_NOTIFY_EMAILS (comma-separated) — keep in sync with admin_email_allowlist
 *   and VITE_ADMIN_EMAILS
 *
 * Platform secrets (never ship to clients):
 * - SUPABASE_SERVICE_ROLE_KEY (used only inside this function)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotifyBody = {
  type?: "content_report" | "member_block";
  id?: string;
  alertId?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function adminNotifyEmails(): string[] {
  const raw = (
    Deno.env.get("ADMIN_NOTIFY_EMAILS") ||
    Deno.env.get("ADMIN_EMAILS") ||
    ""
  ).replace(/\r/g, "");
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function logNotify(level: "info" | "warn" | "error", message: string, detail?: unknown) {
  const payload = detail === undefined ? message : `${message} ${JSON.stringify(detail)}`;
  if (level === "error") console.error(`[notify-admin-safety] ${payload}`);
  else if (level === "warn") console.warn(`[notify-admin-safety] ${payload}`);
  else console.log(`[notify-admin-safety] ${payload}`);
}

async function sendResendEmail(input: {
  to: string[];
  subject: string;
  text: string;
}) {
  // Sanitize secrets — paste dialogs can introduce newlines/zero-width chars that break Deno fetch headers.
  const apiKey = (Deno.env.get("RESEND_API_KEY") || "")
    .replace(/[^\x21-\x7E]/g, "")
    .trim();
  const from = (
    Deno.env.get("ADMIN_NOTIFY_FROM_EMAIL") ||
    Deno.env.get("RESEND_FROM_EMAIL") ||
    ""
  )
    .replace(/[^\x20-\x7E]/g, "")
    .trim();

  if (!apiKey || !from || input.to.length === 0) {
    return {
      sent: false as const,
      reason: "email_not_configured" as const,
      missing: {
        resendApiKey: !apiKey,
        from: !from,
        recipients: input.to.length === 0,
      },
    };
  }

  const authHeader = `Bearer ${apiKey}`;
  // Never log the key — only shape diagnostics if Request construction fails.
  if (![...authHeader].every((ch) => ch.charCodeAt(0) <= 0x7e)) {
    throw new Error("RESEND_API_KEY contains non-ASCII after sanitize");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend failed (${response.status}): ${detail}`);
  }

  return { sent: true as const };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    logNotify("error", "server configuration incomplete");
    return jsonResponse({ error: "Server configuration incomplete" }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    logNotify("warn", "unauthorized invoke", { message: userError?.message });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: NotifyBody;
  try {
    body = (await req.json()) as NotifyBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // Service role stays inside the function only — never returned to clients.
  const admin = createClient(supabaseUrl, serviceRoleKey);
  let alertId = body.alertId?.trim() || "";

  if (!alertId && body.type && body.id) {
    const { data: alert, error: alertError } = await admin
      .from("admin_safety_alerts")
      .select("id, summary, alert_type, reference_id, created_at, email_notified_at, payload")
      .eq("alert_type", body.type)
      .eq("reference_id", body.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (alertError) {
      logNotify("error", "alert lookup failed", { message: alertError.message });
      return jsonResponse({ error: alertError.message }, 500);
    }
    if (!alert) {
      logNotify("warn", "alert not found for type/id", {
        type: body.type,
        id: body.id,
      });
      return jsonResponse({ ok: true, emailed: false, reason: "alert_not_found" });
    }
    alertId = alert.id;
  }

  if (!alertId) {
    return jsonResponse({ error: "alertId or type+id required" }, 400);
  }

  const { data: alert, error } = await admin
    .from("admin_safety_alerts")
    .select("id, summary, alert_type, reference_id, created_at, email_notified_at, payload")
    .eq("id", alertId)
    .maybeSingle();

  if (error) {
    logNotify("error", "alert fetch failed", { message: error.message });
    return jsonResponse({ error: error.message }, 500);
  }
  if (!alert) {
    logNotify("warn", "alert not found by id", { alertId });
    return jsonResponse({ ok: true, emailed: false, reason: "alert_not_found" });
  }

  if (alert.email_notified_at) {
    return jsonResponse({ ok: true, emailed: false, reason: "already_notified" });
  }

  const recipients = adminNotifyEmails();
  const subject = `[EliteTee Safety] ${alert.alert_type}: ${alert.summary}`;
  const text = [
    "A new EliteTee safety event requires review.",
    "",
    `Type: ${alert.alert_type}`,
    `Summary: ${alert.summary}`,
    `Reference: ${alert.reference_id}`,
    `Created: ${alert.created_at}`,
    "",
    "Open /admin-members → Moderation to review within your 24-hour moderation workflow.",
    "This email is an operational alert, not a contractual SLA guarantee.",
  ].join("\n");

  try {
    const emailResult = await sendResendEmail({
      to: recipients,
      subject,
      text,
    });

    if (emailResult.sent) {
      const { error: markError } = await admin.rpc("mark_admin_safety_alert_emailed", {
        p_alert_id: alert.id,
      });
      if (markError) {
        logNotify("error", "failed to mark alert emailed", { message: markError.message });
      } else {
        logNotify("info", "email sent", {
          alertId: alert.id,
          recipients: recipients.length,
        });
      }
      return jsonResponse({ ok: true, emailed: true, recipients: recipients.length });
    }

    logNotify("warn", "email not sent; alert remains in admin_safety_alerts", {
      alertId: alert.id,
      reason: emailResult.reason,
      missing: "missing" in emailResult ? emailResult.missing : undefined,
    });

    return jsonResponse({
      ok: true,
      emailed: false,
      reason: emailResult.reason,
      note: "Alert remains queued in admin_safety_alerts for in-app review.",
    });
  } catch (err) {
    logNotify("error", "notify failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse(
      {
        ok: false,
        emailed: false,
        error: "Notification delivery failed. Alert remains available in-app.",
      },
      500,
    );
  }
});
