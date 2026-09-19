/**
 * Production verification for migration 074 (open direct portal DMs).
 * Creates ephemeral QA users, asserts permission matrix, then cleans up.
 *
 * Usage: node scripts/qa-migration-074-prod.mjs
 * Requires .env.local: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_ANON_KEY
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
dotenv.config({ path: join(root, ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const PASSWORD = `Qa074-${Date.now()}!Aa`;
const RUN_ID = Date.now().toString(36);
const APPLE_REVIEW_EMAIL = "appreview@elitetee.club";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
const createdUserIds = [];
const createdMessageIds = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function createQaUser(label, { portal = true, directoryVisible = true } = {}) {
  const email = `qa-074-${label}-${RUN_ID}@elitetee.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `QA 074 ${label}` },
  });
  if (error) throw new Error(`createUser ${label}: ${error.message}`);
  const user = { id: data.user.id, email, label };
  createdUserIds.push(user.id);

  await admin.from("users").upsert({ id: user.id, email: user.email });

  const { error: profileError } = await admin.from("member_profiles").insert({
    user_id: user.id,
    full_name: `QA 074 ${label.toUpperCase()}`,
    email: user.email,
    primary_club: "QA Club",
    based_in: "QA City",
    industry: "QA",
    membership_status: "Founding Member",
    is_verified: true,
    portal_access_enabled: portal,
    directory_visible: directoryVisible,
    founding_member_number: `QA074-${label.toUpperCase()}-${RUN_ID}`,
  });
  if (profileError) throw new Error(`profile ${label}: ${profileError.message}`);
  return user;
}

async function signIn(user) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: PASSWORD,
  });
  if (error) throw new Error(`signIn ${user.label}: ${error.message}`);
  return client;
}

async function trySendDirect(client, senderId, receiverId, body) {
  const { data, error } = await client
    .from("private_messages")
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      introduction_request_id: null,
      body,
      message: body,
    })
    .select("id")
    .single();
  if (data?.id) createdMessageIds.push(data.id);
  return { data, error };
}

async function cleanup() {
  if (createdMessageIds.length) {
    await admin.from("private_message_attachments").delete().in("message_id", createdMessageIds);
    await admin.from("private_messages").delete().in("id", createdMessageIds);
  }
  for (const userId of createdUserIds) {
    await admin.from("member_profiles").delete().eq("user_id", userId);
    await admin.from("users").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  console.log(`QA 074 prod run ${RUN_ID} against ${SUPABASE_URL}`);

  let userA;
  let userB;
  let userNoPortal;
  let clientA;

  try {
    userA = await createQaUser("a", { portal: true });
    userB = await createQaUser("b", { portal: true });
    userNoPortal = await createQaUser("noportal", { portal: false });

    // No accepted intro between A and B — confirm empty.
    const { data: intros } = await admin
      .from("introduction_requests")
      .select("id")
      .or(
        `and(sender_id.eq.${userA.id},receiver_id.eq.${userB.id}),and(sender_id.eq.${userB.id},receiver_id.eq.${userA.id})`,
      );
    record(
      "no accepted intro between A and B",
      !intros?.length,
      `intro rows=${intros?.length ?? 0}`,
    );

    clientA = await signIn(userA);
    const firstContact = await trySendDirect(
      clientA,
      userA.id,
      userB.id,
      `QA074 first-contact ${RUN_ID}`,
    );
    record(
      "portal A can DM portal B with no intro",
      !firstContact.error && Boolean(firstContact.data?.id),
      firstContact.error?.message ?? firstContact.data?.id,
    );

    // Existing thread still works (second message on same pair).
    const followUp = await trySendDirect(
      clientA,
      userA.id,
      userB.id,
      `QA074 follow-up ${RUN_ID}`,
    );
    record(
      "existing DM thread still works",
      !followUp.error && Boolean(followUp.data?.id),
      followUp.error?.message ?? followUp.data?.id,
    );

    // Image attachment RLS (API level): insert attachment metadata on first message.
    const messageId = firstContact.data?.id;
    if (messageId) {
      const { data: att, error: attError } = await clientA
        .from("private_message_attachments")
        .insert({
          message_id: messageId,
          storage_path: `qa-074/${RUN_ID}/probe.jpg`,
          content_type: "image/jpeg",
          byte_size: 1234,
          width: 100,
          height: 100,
          sort_order: 0,
        })
        .select("id")
        .single();
      record(
        "image attachment insert allowed for first-contact DM (RLS)",
        !attError && Boolean(att?.id),
        attError?.message ?? att?.id,
      );
      if (att?.id) {
        await admin.from("private_message_attachments").delete().eq("id", att.id);
      }
    } else {
      record("image attachment insert allowed for first-contact DM (RLS)", false, "no message id");
    }

    // Non-portal cannot DM a portal member.
    const clientNoPortal = await signIn(userNoPortal);
    const blocked = await trySendDirect(
      clientNoPortal,
      userNoPortal.id,
      userB.id,
      `QA074 blocked ${RUN_ID}`,
    );
    record(
      "non-portal user cannot DM",
      Boolean(blocked.error),
      blocked.error?.message ?? "unexpected success",
    );

    // Directory hide: Apple review account not discoverable by normal member.
    const { data: directoryHits, error: dirError } = await clientA
      .from("member_profiles")
      .select("email, directory_visible")
      .eq("email", APPLE_REVIEW_EMAIL);
    record(
      "Apple review account not discoverable via directory query",
      !dirError && (directoryHits?.length ?? 0) === 0,
      dirError?.message ?? `hits=${directoryHits?.length ?? 0}`,
    );

    // Confirm Apple account still exists and is hidden (service role).
    const { data: apple } = await admin
      .from("member_profiles")
      .select("email, directory_visible, portal_access_enabled")
      .eq("email", APPLE_REVIEW_EMAIL)
      .maybeSingle();
    record(
      "Apple review account still portal-enabled + directory-hidden",
      apple?.directory_visible === false && apple?.portal_access_enabled === true,
      JSON.stringify(apple),
    );

    // B can read the first-contact message.
    const clientB = await signIn(userB);
    const { data: readRows, error: readError } = await clientB
      .from("private_messages")
      .select("id, body")
      .eq("id", messageId)
      .maybeSingle();
    record(
      "receiver can read first-contact DM",
      !readError && readRows?.id === messageId,
      readError?.message ?? readRows?.id,
    );
  } catch (error) {
    record("suite crashed", false, error instanceof Error ? error.message : String(error));
  } finally {
    try {
      await cleanup();
      record("cleanup ephemeral QA users/messages", true);
    } catch (cleanupError) {
      record(
        "cleanup ephemeral QA users/messages",
        false,
        cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      );
    }
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

await main();
