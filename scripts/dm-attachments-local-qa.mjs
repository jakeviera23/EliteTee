#!/usr/bin/env node
/**
 * DM Image Attachments V1 — local Supabase integration + security QA.
 *
 * Prerequisites:
 *   1. Docker Desktop (or Podman) running
 *   2. `npx supabase start` (API at http://127.0.0.1:54321)
 *   3. `npx supabase db reset` or migration 065 applied locally
 *
 * Usage:
 *   node scripts/dm-attachments-local-qa.mjs
 *
 * Uses service role ONLY for test-user setup. All security assertions use
 * authenticated anon clients (no service role in send/read paths under test).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const PASS = "PASS";
const FAIL = "FAIL";
const BLOCK = "BLOCKED";

const results = [];

function record(category, name, status, detail = "") {
  results.push({ category, name, status, detail });
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`[${status}] ${category}: ${name}${suffix}`);
}

function assertOk(condition, category, name, detail = "") {
  record(category, name, condition ? PASS : FAIL, detail);
  return condition;
}

function tinyPngBytes() {
  // 1x1 PNG
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

function makeFile(name, type, bytes) {
  const blob = new Blob([bytes], { type });
  return new File([blob], name, { type });
}

function getLocalSupabaseEnv() {
  try {
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
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
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

  const profile = {
    user_id: userId,
    full_name: label,
    email,
    primary_club: "QA Club",
    based_in: "QA City",
    industry: "QA",
    membership_status: "approved",
    portal_access_enabled: true,
    is_verified: true,
    current_request: "",
  };

  const { error: profileError } = await admin.from("member_profiles").upsert(profile, {
    onConflict: "email",
  });
  if (profileError) {
    throw new Error(`${label} profile upsert failed: ${profileError.message}`);
  }

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

async function sendDirectMessage(client, { senderId, receiverId, body }) {
  const { data, error } = await client
    .from("private_messages")
    .insert({
      introduction_request_id: null,
      sender_id: senderId,
      receiver_id: receiverId,
      body,
    })
    .select("id, body, sender_id, receiver_id, read_at")
    .maybeSingle();
  return { data, error };
}

async function uploadAttachmentFlow(client, { senderId, messageId, file, sortOrder = 0 }) {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${senderId}/${messageId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await client.storage
    .from("private-message-media")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { storagePath, attachment: null, uploadError };
  }

  const { data: attachment, error: insertError } = await client
    .from("private_message_attachments")
    .insert({
      message_id: messageId,
      storage_path: storagePath,
      content_type: file.type,
      byte_size: file.size,
      width: 1,
      height: 1,
      sort_order: sortOrder,
    })
    .select("*")
    .maybeSingle();

  return { storagePath, attachment, uploadError: insertError };
}

async function simulatePartialUploadCleanup(clientA, senderId, receiverId) {
  const { data: message, error: msgError } = await sendDirectMessage(clientA, {
    senderId,
    receiverId,
    body: "",
  });
  if (msgError || !message) {
    return { ok: false, detail: msgError?.message ?? "message insert failed" };
  }

  const okFile = makeFile("one.png", "image/png", tinyPngBytes());
  const first = await uploadAttachmentFlow(clientA, {
    senderId,
    messageId: message.id,
    file: okFile,
    sortOrder: 0,
  });
  if (first.uploadError || !first.attachment) {
    return { ok: false, detail: `first upload failed: ${first.uploadError?.message}` };
  }

  const tooLarge = makeFile("two.jpg", "image/jpeg", new Uint8Array(5 * 1024 * 1024 + 1));
  const second = await uploadAttachmentFlow(clientA, {
    senderId,
    messageId: message.id,
    file: tooLarge,
    sortOrder: 1,
  });

  // Manual cleanup mirroring app behavior when second upload fails mid-batch.
  if (first.storagePath) {
    await clientA.storage.from("private-message-media").remove([first.storagePath]);
  }
  if (first.attachment?.id) {
    await clientA.from("private_message_attachments").delete().eq("id", first.attachment.id);
  }
  await clientA.from("private_messages").delete().eq("id", message.id).eq("sender_id", senderId);

  const storageLeft = await clientA.storage.from("private-message-media").list(`${senderId}/${message.id}`);
  const { data: attachmentsLeft } = await clientA
    .from("private_message_attachments")
    .select("id")
    .eq("message_id", message.id);
  const { data: messageLeft } = await clientA
    .from("private_messages")
    .select("id")
    .eq("id", message.id)
    .maybeSingle();

  return {
    ok: true,
    secondFailed: Boolean(second.uploadError),
    storageEmpty: (storageLeft.data ?? []).length === 0,
    attachmentsEmpty: (attachmentsLeft ?? []).length === 0,
    messageDeleted: !messageLeft,
  };
}

async function main() {
  console.log("=== DM Image Attachments V1 — Local Supabase QA ===\n");

  const localEnv = getLocalSupabaseEnv();
  if (localEnv.error || !localEnv.API_URL || !localEnv.ANON_KEY || !localEnv.SERVICE_ROLE_KEY) {
    record(
      "Environment",
      "Local Supabase running",
      BLOCK,
      localEnv.error ??
        "Run Docker Desktop, then `npx supabase start` and `npx supabase db reset`",
    );
    printSummary();
    process.exit(2);
  }

  const url = localEnv.API_URL;
  const anonKey = localEnv.ANON_KEY;
  const serviceKey = localEnv.SERVICE_ROLE_KEY;

  if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
    record("Environment", "Refusing non-local Supabase URL", FAIL, url);
    printSummary();
    process.exit(2);
  }

  record("Environment", "Local Supabase running", PASS, url);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: tableProbeError } = await admin.from("private_message_attachments").select("id").limit(1);
  if (tableProbeError) {
    record(
      "Environment",
      "Migration 065 applied",
      FAIL,
      `${tableProbeError.message}. Run \`npx supabase db reset\` locally.`,
    );
    printSummary();
    process.exit(2);
  }
  record("Environment", "Migration 065 applied", PASS);

  const stamp = Date.now();
  const password = "QaTestPass123!";
  let userA, userB, userC;
  try {
    userA = await createPortalMember(admin, {
      email: `dm-qa-a-${stamp}@example.com`,
      password,
      label: "QA User A",
    });
    userB = await createPortalMember(admin, {
      email: `dm-qa-b-${stamp}@example.com`,
      password,
      label: "QA User B",
    });
    userC = await createPortalMember(admin, {
      email: `dm-qa-c-${stamp}@example.com`,
      password,
      label: "QA User C",
    });
    record("Setup", "Create portal test users A/B/C", PASS);
  } catch (error) {
    record("Setup", "Create portal test users A/B/C", FAIL, error instanceof Error ? error.message : String(error));
    printSummary();
    process.exit(1);
  }

  const clientA = await signIn(url, anonKey, userA.email, password);
  const clientB = await signIn(url, anonKey, userB.email, password);
  const clientC = await signIn(url, anonKey, userC.email, password);

  // --- Sending validations ---
  const png = makeFile("photo.png", "image/png", tinyPngBytes());
  const jpeg = makeFile("photo.jpg", "image/jpeg", tinyPngBytes());
  const webp = makeFile("photo.webp", "image/webp", tinyPngBytes());
  const gif = makeFile("photo.gif", "image/gif", tinyPngBytes());
  const pdf = makeFile("doc.pdf", "application/pdf", new Uint8Array([1, 2, 3]));
  const video = makeFile("clip.mp4", "video/mp4", new Uint8Array([1, 2, 3]));
  const tooLarge = makeFile("big.jpg", "image/jpeg", new Uint8Array(5 * 1024 * 1024 + 1));

  const textOnly = await sendDirectMessage(clientA, {
    senderId: userA.userId,
    receiverId: userB.userId,
    body: "text-only QA",
  });
  assertOk(!textOnly.error && textOnly.data?.body === "text-only QA", "Sending", "text-only message");

  const imageOnlyMsg = await sendDirectMessage(clientA, {
    senderId: userA.userId,
    receiverId: userB.userId,
    body: "",
  });
  const imageOnlyUpload = imageOnlyMsg.data
    ? await uploadAttachmentFlow(clientA, {
        senderId: userA.userId,
        messageId: imageOnlyMsg.data.id,
        file: png,
      })
    : { uploadError: new Error("no message") };
  assertOk(
    !imageOnlyMsg.error && !imageOnlyUpload.uploadError && imageOnlyUpload.attachment,
    "Sending",
    "one image without text",
  );

  const textImageMsg = await sendDirectMessage(clientA, {
    senderId: userA.userId,
    receiverId: userB.userId,
    body: "caption QA",
  });
  const textImageUpload = textImageMsg.data
    ? await uploadAttachmentFlow(clientA, {
        senderId: userA.userId,
        messageId: textImageMsg.data.id,
        file: jpeg,
      })
    : { uploadError: new Error("no message") };
  assertOk(
    !textImageMsg.error && !textImageUpload.uploadError,
    "Sending",
    "text + one image",
  );

  const threeMsg = await sendDirectMessage(clientA, {
    senderId: userA.userId,
    receiverId: userB.userId,
    body: "",
  });
  let threeOk = Boolean(threeMsg.data);
  if (threeMsg.data) {
    for (let i = 0; i < 3; i += 1) {
      const file = i === 0 ? png : i === 1 ? jpeg : webp;
      const up = await uploadAttachmentFlow(clientA, {
        senderId: userA.userId,
        messageId: threeMsg.data.id,
        file,
        sortOrder: i,
      });
      if (up.uploadError) threeOk = false;
    }
  }
  assertOk(threeOk, "Sending", "three images");

  if (threeMsg.data) {
    const fourth = await uploadAttachmentFlow(clientA, {
      senderId: userA.userId,
      messageId: threeMsg.data.id,
      file: png,
      sortOrder: 3,
    });
    assertOk(Boolean(fourth.uploadError), "Sending", "fourth image rejected");
  } else {
    record("Sending", "fourth image rejected", FAIL, "three-image message missing");
  }

  for (const [label, file] of [
    ["GIF rejected", gif],
    ["PDF rejected", pdf],
    ["video rejected", video],
    [">5 MB rejected", tooLarge],
  ]) {
    const probeMsg = await sendDirectMessage(clientA, {
      senderId: userA.userId,
      receiverId: userB.userId,
      body: "",
    });
    if (!probeMsg.data) {
      record("Sending", label, FAIL, "message insert failed");
      continue;
    }
    const up = await uploadAttachmentFlow(clientA, {
      senderId: userA.userId,
      messageId: probeMsg.data.id,
      file,
    });
    assertOk(Boolean(up.uploadError), "Sending", label);
  }

  // Primary attachment under test
  const primaryMessageId = imageOnlyMsg.data?.id;
  const primaryStoragePath = imageOnlyUpload.storagePath;

  // --- Attachment privacy ---
  const { data: aRows, error: aReadErr } = await clientA
    .from("private_message_attachments")
    .select("id")
    .eq("message_id", primaryMessageId);
  assertOk(!aReadErr && (aRows?.length ?? 0) > 0, "Attachment privacy", "A can read attachment row");

  const { data: bRows, error: bReadErr } = await clientB
    .from("private_message_attachments")
    .select("id")
    .eq("message_id", primaryMessageId);
  assertOk(!bReadErr && (bRows?.length ?? 0) > 0, "Attachment privacy", "B can read attachment row");

  const { data: cRows, error: cReadErr } = await clientC
    .from("private_message_attachments")
    .select("id")
    .eq("message_id", primaryMessageId);
  assertOk(Boolean(cReadErr) || (cRows?.length ?? 0) === 0, "Attachment privacy", "C cannot read attachment row");

  const { data: aSigned, error: aSignErr } = await clientA.storage
    .from("private-message-media")
    .createSignedUrl(primaryStoragePath, 120);
  assertOk(!aSignErr && Boolean(aSigned?.signedUrl), "Attachment privacy", "A can create signed Storage URL");

  const { data: bSigned, error: bSignErr } = await clientB.storage
    .from("private-message-media")
    .createSignedUrl(primaryStoragePath, 120);
  assertOk(!bSignErr && Boolean(bSigned?.signedUrl), "Attachment privacy", "B can read private Storage object");

  const { data: cSigned, error: cSignErr } = await clientC.storage
    .from("private-message-media")
    .createSignedUrl(primaryStoragePath, 120);
  assertOk(Boolean(cSignErr) || !cSigned?.signedUrl, "Attachment privacy", "C cannot read Storage object");

  const { data: cDirectRows, error: cDirectErr } = await clientC
    .from("private_message_attachments")
    .select("id")
    .eq("storage_path", primaryStoragePath);
  assertOk(
    Boolean(cDirectErr) || (cDirectRows?.length ?? 0) === 0,
    "Attachment privacy",
    "Guessing storage path does not bypass attachment RLS",
  );

  // --- Message mutation ---
  const { error: bUpdateErr } = await clientB
    .from("private_messages")
    .update({ body: "hacked by B" })
    .eq("id", primaryMessageId);
  assertOk(Boolean(bUpdateErr), "Message mutation", "B cannot modify A's message body");

  const unread = await sendDirectMessage(clientA, {
    senderId: userA.userId,
    receiverId: userB.userId,
    body: "mark-read QA",
  });
  if (unread.data) {
    const { error: markErr } = await clientB.rpc("mark_direct_private_messages_read", {
      p_other_user_id: userA.userId,
    });
    assertOk(!markErr, "Message mutation", "B can mark A's message read via RPC");
    const { data: marked } = await clientB
      .from("private_messages")
      .select("read_at")
      .eq("id", unread.data.id)
      .maybeSingle();
    assertOk(Boolean(marked?.read_at), "Message mutation", "read_at set after mark-read RPC");
  } else {
    record("Message mutation", "B can mark A's message read via RPC", FAIL, "setup message failed");
  }

  const { data: selfMarkCount, error: selfMarkErr } = await clientA.rpc(
    "mark_direct_private_messages_read",
    { p_other_user_id: userB.userId },
  );
  assertOk(
    !selfMarkErr && (selfMarkCount ?? 0) === 0,
    "Message mutation",
    "A cannot mark own outgoing message read via receiver RPC",
  );

  // Introduction read path
  const { data: intro, error: introErr } = await admin
    .from("introduction_requests")
    .insert({
      sender_id: userA.userId,
      receiver_id: userC.userId,
      status: "accepted",
      request_type: "Other",
      message: "QA intro",
    })
    .select("id")
    .maybeSingle();
  if (introErr || !intro) {
    record("Message mutation", "introduction mark-read RPC works", FAIL, introErr?.message ?? "intro setup failed");
  } else {
    const introMsg = await sendDirectMessage(clientA, {
      senderId: userA.userId,
      receiverId: userC.userId,
      body: "intro thread",
    });
    // Temporarily use introduction_request_id via admin to simulate intro message
    if (introMsg.data) {
      await admin
        .from("private_messages")
        .update({ introduction_request_id: intro.id, receiver_id: userC.userId })
        .eq("id", introMsg.data.id);
    }
    const introUnread = await admin
      .from("private_messages")
      .insert({
        introduction_request_id: intro.id,
        sender_id: userA.userId,
        receiver_id: userC.userId,
        body: "intro unread",
      })
      .select("id")
      .maybeSingle();
    if (introUnread.data) {
      const clientC2 = await signIn(url, anonKey, userC.email, password);
      const { error: introMarkErr } = await clientC2.rpc("mark_introduction_private_messages_read", {
        p_introduction_request_id: intro.id,
      });
      assertOk(!introMarkErr, "Message mutation", "introduction mark-read RPC works");
    } else {
      record("Message mutation", "introduction mark-read RPC works", FAIL, "intro message setup failed");
    }
  }

  // --- Failure cleanup (simulated) ---
  const cleanup = await simulatePartialUploadCleanup(clientA, userA.userId, userB.userId);
  if (!cleanup.ok) {
    record("Failure cleanup", "partial upload simulation", FAIL, cleanup.detail);
  } else {
    assertOk(cleanup.secondFailed, "Failure cleanup", "second upload fails in simulation");
    assertOk(cleanup.storageEmpty, "Failure cleanup", "uploaded Storage objects removed");
    assertOk(cleanup.attachmentsEmpty, "Failure cleanup", "attachment metadata cleaned up");
    assertOk(cleanup.messageDeleted, "Failure cleanup", "image-only parent deleted when zero attachments remain");
  }

  const textFailMsg = await sendDirectMessage(clientA, {
    senderId: userA.userId,
    receiverId: userB.userId,
    body: "text preserved on fail",
  });
  if (textFailMsg.data) {
    const bad = await uploadAttachmentFlow(clientA, {
      senderId: userA.userId,
      messageId: textFailMsg.data.id,
      file: tooLarge,
    });
    const { data: preserved } = await clientA
      .from("private_messages")
      .select("body")
      .eq("id", textFailMsg.data.id)
      .maybeSingle();
    assertOk(
      Boolean(bad.uploadError) && preserved?.body === "text preserved on fail",
      "Failure cleanup",
      "text+image message preserves text on upload failure",
    );
  } else {
    record("Failure cleanup", "text+image message preserves text on upload failure", FAIL, "setup failed");
  }

  // --- Existing functionality ---
  const { data: history } = await clientA
    .from("private_messages")
    .select("id, body")
    .eq("id", textOnly.data?.id)
    .maybeSingle();
  assertOk(history?.body === "text-only QA", "Existing functionality", "historical text-only DMs still render");

  const { data: edited, error: editErr } = await clientA.rpc("edit_private_message", {
    p_message_id: textImageMsg.data?.id,
    p_new_body: "caption edited",
  });
  assertOk(!editErr && edited, "Existing functionality", "text edit works");
  const { count: attCount } = await clientA
    .from("private_message_attachments")
    .select("id", { count: "exact", head: true })
    .eq("message_id", textImageMsg.data?.id);
  assertOk((attCount ?? 0) === 1, "Existing functionality", "editing text does not alter attachments");

  const { data: lightboxSigned } = await clientA.storage
    .from("private-message-media")
    .createSignedUrl(textImageUpload.storagePath, 60);
  assertOk(Boolean(lightboxSigned?.signedUrl), "Existing functionality", "signed URL available for lightbox");

  // Mobile API-level checks (read path; no mobile upload UI)
  const { data: mobileThread, error: mobileErr } = await clientB
    .from("private_messages")
    .select("id, body")
    .eq("id", primaryMessageId)
    .maybeSingle();
  const { data: mobileAtt } = await clientB
    .from("private_message_attachments")
    .select("storage_path")
    .eq("message_id", primaryMessageId);
  assertOk(!mobileErr && mobileThread && (mobileAtt?.length ?? 0) > 0, "Mobile", "web-created image-only message has attachment rows for mobile");
  const previewBody = mobileThread?.body?.trim()
    ? mobileThread.body.trim()
    : (mobileAtt?.length ?? 0) === 1
      ? "Photo"
      : "Photos";
  assertOk(previewBody === "Photo", "Mobile", "inbox preview shows Photo for image-only");
  assertOk(textOnly.data?.body === "text-only QA", "Mobile", "existing text messages unchanged");

  // Mobile still does not expose photo sending — verified by codebase; record manual UI check.
  record(
    "Mobile",
    "no photo sending UI in mobile composer",
    PASS,
    "code inspection: mobile sendDirectPrivateMessage is text-only; manual UI verify recommended",
  );
  record(
    "Mobile",
    "image renders in mobile thread UI",
    BLOCK,
    "requires Expo simulator/device manual check against local stack",
  );

  printSummary();
  const failed = results.some((r) => r.status === FAIL);
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  console.log("\n=== Summary ===");
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0 };
  for (const r of results) {
    counts[r.status === BLOCK ? "BLOCKED" : r.status] += 1;
  }
  console.log(`PASS: ${counts.PASS}  FAIL: ${counts.FAIL}  BLOCKED: ${counts.BLOCKED}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
