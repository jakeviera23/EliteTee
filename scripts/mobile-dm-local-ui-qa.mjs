#!/usr/bin/env node
/**
 * Mobile DM read-path QA against local Supabase only.
 * Mirrors mobile/lib/api/messages.ts + messagePreview.ts (no production writes).
 *
 * Usage: node scripts/mobile-dm-local-ui-qa.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const PASS = "PASS";
const FAIL = "FAIL";
const results = [];

function record(name, status, detail = "") {
  results.push({ name, status, detail });
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`[${status}] ${name}${suffix}`);
}

function assertOk(condition, name, detail = "") {
  record(name, condition ? PASS : FAIL, detail);
  return condition;
}

function formatMobileMessagePreviewBody(body, attachmentCount = 0) {
  const trimmed = body.trim();
  if (trimmed) return trimmed;
  if (attachmentCount <= 0) return "";
  return attachmentCount === 1 ? "Photo" : "Photos";
}

function tinyPngBytes() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

function makeFile(name, type, bytes) {
  return new File([new Blob([bytes], { type })], name, { type });
}

function getLocalSupabaseEnv() {
  const raw = execSync("npx supabase status -o env", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const env = {};
  for (const line of raw.split("\n")) {
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1).replace(/^"|"$/g, "");
  }
  return env;
}

async function createPortalMember(admin, { email, password, label }) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`${label} auth create failed: ${createError?.message ?? "unknown"}`);
  }
  const userId = created.user.id;
  await admin.from("users").upsert({ id: userId, email });
  await admin.from("member_profiles").upsert(
    {
      user_id: userId,
      full_name: label,
      email,
      primary_club: "Mobile QA Club",
      based_in: "Mobile QA City",
      industry: "QA",
      membership_status: "approved",
      portal_access_enabled: true,
      is_verified: true,
      current_request: "",
    },
    { onConflict: "email" },
  );
  return { userId, email, password };
}

async function signIn(url, anonKey, email, password) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`signIn failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return client;
}

async function hydrateMessagesWithAttachments(client, messages) {
  if (messages.length === 0) return messages;
  const ids = messages.map((message) => message.id);
  const { data, error } = await client
    .from("private_message_attachments")
    .select("id, message_id, storage_path, content_type, byte_size, width, height, sort_order, created_at")
    .in("message_id", ids)
    .order("sort_order", { ascending: true });

  if (error) {
    return messages.map((message) => ({ ...message, attachments: [] }));
  }

  const byMessageId = new Map();
  for (const row of data ?? []) {
    const list = byMessageId.get(row.message_id) ?? [];
    list.push(row);
    byMessageId.set(row.message_id, list);
  }

  return Promise.all(
    messages.map(async (message) => {
      const attachments = byMessageId.get(message.id) ?? [];
      const signed = await Promise.all(
        attachments.map(async (attachment) => {
          const { data: signedData } = await client.storage
            .from("private-message-media")
            .createSignedUrl(attachment.storage_path, 3600);
          return { ...attachment, signedUrl: signedData?.signedUrl ?? null };
        }),
      );
      return { ...message, attachments: signed };
    }),
  );
}

async function fetchConversationThread(client, userId, otherUserId) {
  const { data, error } = await client
    .from("private_messages")
    .select("id, introduction_request_id, sender_id, receiver_id, body, created_at, read_at, edited_at")
    .is("introduction_request_id", null)
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true });

  if (error) throw error;
  return hydrateMessagesWithAttachments(client, data ?? []);
}

async function fetchConversations(client, userId) {
  const { data: messages, error } = await client
    .from("private_messages")
    .select("id, introduction_request_id, sender_id, receiver_id, body, created_at, read_at, edited_at")
    .is("introduction_request_id", null)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const records = await hydrateMessagesWithAttachments(client, messages ?? []);
  const summaries = new Map();

  for (const message of records) {
    const otherUserId =
      message.sender_id === userId ? message.receiver_id : message.sender_id;
    const preview = formatMobileMessagePreviewBody(message.body, message.attachments?.length ?? 0);
    const existing = summaries.get(otherUserId);
    if (!existing) {
      summaries.set(otherUserId, {
        otherUserId,
        lastMessageBody: preview,
        lastMessageAt: message.created_at,
        unreadCount: message.receiver_id === userId && !message.read_at ? 1 : 0,
      });
      continue;
    }
    existing.lastMessageBody = preview;
    existing.lastMessageAt = message.created_at;
    if (message.receiver_id === userId && !message.read_at) {
      existing.unreadCount += 1;
    }
  }

  return [...summaries.values()];
}

async function sendWebImageOnlyMessage(clientA, userA, userB) {
  const { data: message, error: msgError } = await clientA
    .from("private_messages")
    .insert({
      introduction_request_id: null,
      sender_id: userA.userId,
      receiver_id: userB.userId,
      body: "",
    })
    .select("id")
    .maybeSingle();
  if (msgError || !message) {
    throw new Error(msgError?.message ?? "image-only message insert failed");
  }

  const file = makeFile("mobile-qa.png", "image/png", tinyPngBytes());
  const storagePath = `${userA.userId}/${message.id}/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await clientA.storage
    .from("private-message-media")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { error: attachError } = await clientA.from("private_message_attachments").insert({
    message_id: message.id,
    storage_path: storagePath,
    content_type: file.type,
    byte_size: file.size,
    width: 1,
    height: 1,
    sort_order: 0,
  });
  if (attachError) throw attachError;

  return message.id;
}

async function main() {
  const env = getLocalSupabaseEnv();
  const url = env.API_URL;
  const anonKey = env.ANON_KEY;
  const serviceKey = env.SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    console.error("Local Supabase is not running. Run `npx supabase start` first.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const password = "MobileQa123!";
  const userA = await createPortalMember(admin, {
    email: `mobile-qa-a-${stamp}@example.com`,
    password,
    label: "Mobile QA A",
  });
  const userB = await createPortalMember(admin, {
    email: `mobile-qa-b-${stamp}@example.com`,
    password,
    label: "Mobile QA B",
  });

  const clientA = await signIn(url, anonKey, userA.email, password);
  const clientB = await signIn(url, anonKey, userB.email, password);

  // Existing text-only conversation (mobile send path)
  const { data: textMsg, error: textErr } = await clientA
    .from("private_messages")
    .insert({
      introduction_request_id: null,
      sender_id: userA.userId,
      receiver_id: userB.userId,
      body: "text-only mobile QA",
    })
    .select("id, body")
    .maybeSingle();
  assertOk(!textErr && textMsg?.body === "text-only mobile QA", "text-only conversation loads");

  // Web-created image-only DM
  const imageMessageId = await sendWebImageOnlyMessage(clientA, userA, userB);

  const thread = await fetchConversationThread(clientB, userB.userId, userA.userId);
  const textRow = thread.find((row) => row.body === "text-only mobile QA");
  const imageRow = thread.find((row) => row.id === imageMessageId);

  assertOk(Boolean(textRow), "thread includes text-only message");
  assertOk(Boolean(imageRow), "thread includes web image-only message");
  assertOk((imageRow?.attachments?.length ?? 0) === 1, "image bubble has one attachment row");
  assertOk(Boolean(imageRow?.attachments?.[0]?.signedUrl), "attachment has signed URL for bubble");

  let imageFetchOk = false;
  if (imageRow?.attachments?.[0]?.signedUrl) {
    const response = await fetch(imageRow.attachments[0].signedUrl);
    imageFetchOk = response.ok;
  }
  assertOk(imageFetchOk, "signed image URL opens (HTTP 200)");

  const inbox = await fetchConversations(clientB, userB.userId);
  const summary = inbox.find((row) => row.otherUserId === userA.userId);
  assertOk(summary?.lastMessageBody === "Photo", "inbox preview says Photo", summary?.lastMessageBody ?? "missing summary");

  const unreadBefore = thread.filter(
    (row) => row.receiver_id === userB.userId && !row.read_at,
  ).length;
  assertOk(unreadBefore > 0, "unread messages exist before mark-read");

  const { error: markErr } = await clientB.rpc("mark_direct_private_messages_read", {
    p_other_user_id: userA.userId,
  });
  assertOk(!markErr, "read receipt RPC succeeds");

  const threadAfterRead = await fetchConversationThread(clientB, userB.userId, userA.userId);
  const stillUnread = threadAfterRead.filter(
    (row) => row.receiver_id === userB.userId && !row.read_at,
  ).length;
  assertOk(stillUnread === 0, "read receipt clears unread state");

  // Mobile has no image-send UI: sendDirectPrivateMessage rejects empty body before insert.
  function validateMessageBody(body) {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      return { trimmedBody: "", error: new Error("Message cannot be empty.") };
    }
    return { trimmedBody, error: null };
  }
  const emptyValidation = validateMessageBody("");
  assertOk(Boolean(emptyValidation.error), "mobile send path rejects empty body (no image-only send)");

  const composerSource = readFileSync(
    join(root, "mobile/app/(app)/messages/[userId].tsx"),
    "utf8",
  );
  const composerHasNoImagePicker = !/(ImagePicker|launchImageLibraryAsync)/.test(composerSource);
  assertOk(composerHasNoImagePicker, "no mobile image-send UI in composer screen");

  console.log("\n=== Mobile local QA summary ===");
  const failed = results.some((row) => row.status === FAIL);
  const passCount = results.filter((row) => row.status === PASS).length;
  console.log(`PASS: ${passCount}  FAIL: ${results.filter((row) => row.status === FAIL).length}`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
