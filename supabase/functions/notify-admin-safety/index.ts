import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
  const raw =
    Deno.env.get("ADMIN_NOTIFY_EMAILS") ||
    Deno.env.get("VITE_ADMIN_EMAILS") ||
    Deno.env.get("ADMIN_EMAILS") ||
    "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function sendResendEmail(input: {
  to: string[];
  subject: string;
  text: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("ADMIN_NOTIFY_FROM_EMAIL") ||
    Deno.env.get("RESEND_FROM_EMAIL") ||
    "";

  if (!apiKey || !from || input.to.length === 0) {
    return { sent: false as const, reason: "email_not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: NotifyBody;
  try {
    body = (await req.json()) as NotifyBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

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
      return jsonResponse({ error: alertError.message }, 500);
    }
    if (!alert) {
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
    return jsonResponse({ error: error.message }, 500);
  }
  if (!alert) {
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
    "Open /admin-members → Moderation to review.",
    "Do not treat this email as a guaranteed 24-hour SLA; it is an operational alert.",
  ].join("\n");

  try {
    const emailResult = await sendResendEmail({
      to: recipients,
      subject,
      text,
    });

    if (emailResult.sent) {
      await admin.rpc("mark_admin_safety_alert_emailed", {
        p_alert_id: alert.id,
      });
      return jsonResponse({ ok: true, emailed: true, recipients: recipients.length });
    }

    return jsonResponse({
      ok: true,
      emailed: false,
      reason: emailResult.reason,
      note: "Alert remains queued in admin_safety_alerts for in-app review.",
    });
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        emailed: false,
        error: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});
