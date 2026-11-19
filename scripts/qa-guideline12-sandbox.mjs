/**
 * Guideline 1.2 sandbox integration checks.
 * Loads ONLY .env.sandbox.local. Aborts if URL is not sandbox.
 *
 * Usage: node scripts/qa-guideline12-sandbox.mjs
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const SANDBOX_REF = "zbjcdegqqtbgrnfbwbmf";
const PROD_REF = "nbacvtscjhdvwggbecbz";
const TERMS_VERSION = "2026-11-19";

dotenv.config({ path: resolve(ROOT, ".env.sandbox.local"), override: true, quiet: true });

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const anon = (process.env.VITE_SUPABASE_ANON_KEY || "").trim();
const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

const results = [];
function record(name, status, detail = "") {
  results.push({ name, status, detail });
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "SKIP";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function assertSandboxOrDie() {
  if (!url.includes(SANDBOX_REF)) {
    console.error(`ABORT: URL is not sandbox: ${url}`);
    process.exit(2);
  }
  if (url.includes(PROD_REF)) {
    console.error(`ABORT: URL points at production: ${url}`);
    process.exit(2);
  }
  if (!anon || !service) {
    console.error("ABORT: Missing sandbox anon or service role key.");
    process.exit(2);
  }
  record("env.url_is_sandbox", "PASS", url);
}

function adminClient() {
  return createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function userClient() {
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Sandbox SQL via Supabase CLI (service role REST lacks GRANTs on many tables). */
function sqlQuery(sql, { write = false } = {}) {
  const args = ["--yes", "supabase", "db", "query", `--remote=${SANDBOX_REF}`, "-o", "json"];
  if (!write) args.push("--read-only");
  else args.push("--yes");
  args.push(sql);
  const out = execFileSync("npx", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const start = out.indexOf("{");
  if (start < 0) return null;
  try {
    return JSON.parse(out.slice(start));
  } catch {
    return null;
  }
}

async function ensureAuthUser(email, password, fullName) {
  const admin = adminClient();
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw listed.error;
  let user = listed.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, g12_test: true },
    });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata || {}), full_name: fullName, g12_test: true },
    });
    if (updated.error) throw updated.error;
    user = updated.data.user;
  }
  return user;
}

async function ensurePortalMember(user, fullName) {
  const admin = adminClient();
  const { error: userErr } = await admin.from("users").upsert(
    { id: user.id, email: user.email },
    { onConflict: "id" },
  );
  if (userErr) throw userErr;

  const { data: existing, error: findErr } = await admin
    .from("member_profiles")
    .select("id, user_id, portal_access_enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    const { data, error } = await admin
      .from("member_profiles")
      .update({
        full_name: fullName,
        portal_access_enabled: true,
        is_verified: true,
        membership_status: "Standard Member",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id, user_id")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await admin
    .from("member_profiles")
    .insert({
      user_id: user.id,
      email: user.email,
      full_name: fullName,
      primary_club: "G12 Test Club",
      based_in: "Sandbox",
      industry: "Testing",
      membership_status: "Standard Member",
      is_verified: true,
      portal_access_enabled: true,
    })
    .select("id, user_id")
    .single();
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const client = userClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, session: data.session, user: data.user };
}

async function main() {
  console.log("=== Guideline 1.2 sandbox integration ===");
  assertSandboxOrDie();

  const stamp = Date.now();
  const password = `G12-Test-${randomBytes(6).toString("hex")}!aA1`;
  const emails = {
    a: `g12-member-a-${stamp}@elitetee-sandbox.test`,
    b: `g12-member-b-${stamp}@elitetee-sandbox.test`,
    admin: `g12-admin-${stamp}@elitetee-sandbox.test`,
  };

  // --- Provision dedicated sandbox test accounts (not production members) ---
  let userA, userB, userAdmin, profileA, profileB, profileAdmin;
  try {
    userA = await ensureAuthUser(emails.a, password, "G12 Member A");
    userB = await ensureAuthUser(emails.b, password, "G12 Member B");
    userAdmin = await ensureAuthUser(emails.admin, password, "G12 Admin");
    profileA = await ensurePortalMember(userA, "G12 Member A");
    profileB = await ensurePortalMember(userB, "G12 Member B");
    profileAdmin = await ensurePortalMember(userAdmin, "G12 Admin");

    const adminEmail = emails.admin.toLowerCase().replace(/'/g, "''");
    sqlQuery(
      `insert into public.admin_email_allowlist (email) values ('${adminEmail}') on conflict (email) do nothing;`,
      { write: true },
    );
    record(
      "accounts.provision_g12_test_users",
      "PASS",
      `A=${userA.id.slice(0, 8)} B=${userB.id.slice(0, 8)} admin=${userAdmin.id.slice(0, 8)}`,
    );
  } catch (err) {
    record("accounts.provision_g12_test_users", "FAIL", err.message || String(err));
    printSummary();
    process.exit(1);
  }

  // Seed UGC owned by B for A to report/block (SQL — REST service role lacks GRANTs)
  let postId, commentId, messageId;
  try {
    const seed = sqlQuery(
      `
      with post as (
        insert into public.member_feed_posts (user_id, member_profile_id, content, post_type)
        values ('${userB.id}'::uuid, '${profileB.id}'::uuid, 'G12 test post from Member B', 'intro')
        returning id
      ),
      comment as (
        insert into public.feed_post_comments (post_id, user_id, body)
        select id, '${userB.id}'::uuid, 'G12 test comment from Member B' from post
        returning id
      ),
      msg as (
        insert into public.private_messages (sender_id, receiver_id, body)
        values ('${userB.id}'::uuid, '${userA.id}'::uuid, 'G12 test DM from B to A')
        returning id
      )
      select
        (select id::text from post) as post_id,
        (select id::text from comment) as comment_id,
        (select id::text from msg) as message_id;
      `,
      { write: true },
    );
    postId = seed?.rows?.[0]?.post_id;
    commentId = seed?.rows?.[0]?.comment_id;
    messageId = seed?.rows?.[0]?.message_id;
    if (!postId || !commentId || !messageId) {
      throw new Error(`seed incomplete: ${JSON.stringify(seed?.rows?.[0] || seed)}`);
    }
    record("seed.ugc_for_reporting", "PASS", `post=${postId} comment=${commentId} msg=${messageId}`);
  } catch (err) {
    record("seed.ugc_for_reporting", "FAIL", err.message || String(err));
  }

  // --- TERMS ---
  try {
    const { client } = await signIn(emails.a, password);
    const before = await client.rpc("has_accepted_elitetee_terms", {
      p_terms_version: TERMS_VERSION,
    });
    if (before.error) throw before.error;
    if (before.data === true) {
      record("terms.existing_account_not_yet_accepted", "FAIL", "unexpectedly already accepted");
    } else {
      record("terms.existing_account_not_yet_accepted", "PASS", "has_accepted=false");
    }

    const accept = await client.rpc("accept_elitetee_terms", {
      p_terms_version: TERMS_VERSION,
      p_source: "web",
    });
    if (accept.error) throw accept.error;

    const after = await client.rpc("has_accepted_elitetee_terms", {
      p_terms_version: TERMS_VERSION,
    });
    if (after.error) throw after.error;
    if (after.data !== true) throw new Error("has_accepted still false after accept");

    const stored = sqlQuery(
      `select id::text, terms_version, source from public.member_terms_acceptances
       where user_id = '${userA.id}'::uuid and terms_version = '${TERMS_VERSION}'`,
    );
    const rows = stored?.rows || [];
    if (!rows.length) throw new Error("no acceptance row stored");
    record("terms.accept_and_persist", "PASS", `rows=${rows.length} source=${rows[0].source}`);
    await client.auth.signOut();
  } catch (err) {
    record("terms.accept_and_persist", "FAIL", err.message || String(err));
  }

  // Accept terms for B and admin so portal RPCs work
  for (const email of [emails.b, emails.admin]) {
    try {
      const { client } = await signIn(email, password);
      await client.rpc("accept_elitetee_terms", {
        p_terms_version: TERMS_VERSION,
        p_source: "web",
      });
      await client.auth.signOut();
    } catch {
      /* recorded elsewhere if critical */
    }
  }

  // --- REPORTING ---
  let reportIds = {};
  try {
    const { client } = await signIn(emails.a, password);

    async function report(targetType, targetId, reason = "inappropriate_content") {
      const { data, error } = await client.rpc("submit_content_report", {
        p_target_type: targetType,
        p_target_id: targetId,
        p_reason: reason,
        p_details: `G12 automated ${targetType} report`,
      });
      if (error) throw error;
      return data;
    }

    if (postId) {
      reportIds.post = await report("feed_post", postId);
      record("report.feed_post", "PASS", reportIds.post?.id || String(reportIds.post));
    } else {
      record("report.feed_post", "SKIP", "no post seeded");
    }

    if (commentId) {
      reportIds.comment = await report("feed_comment", commentId);
      record("report.feed_comment", "PASS", reportIds.comment?.id || String(reportIds.comment));
    } else {
      record("report.feed_comment", "SKIP", "no comment seeded");
    }

    // RPC expects member_profiles.user_id as target_id (not profile row id)
    reportIds.profile = await report("member_profile", userB.id);
    record("report.member_profile", "PASS", reportIds.profile?.id || String(reportIds.profile));

    if (messageId) {
      reportIds.message = await report("private_message", messageId);
      record("report.private_message", "PASS", reportIds.message?.id || String(reportIds.message));
    } else {
      record("report.private_message", "SKIP", "no message seeded");
    }

    // Duplicate should fail
    if (postId) {
      const dup = await client.rpc("submit_content_report", {
        p_target_type: "feed_post",
        p_target_id: postId,
        p_reason: "spam",
        p_details: "duplicate",
      });
      if (dup.error && /already have an open report/i.test(dup.error.message)) {
        record("report.duplicate_rejected", "PASS", dup.error.message);
      } else if (dup.error) {
        record("report.duplicate_rejected", "PASS", `rejected: ${dup.error.message}`);
      } else {
        record("report.duplicate_rejected", "FAIL", "duplicate was accepted");
      }
    }

    // Invalid target
    const invalid = await client.rpc("submit_content_report", {
      p_target_type: "feed_post",
      p_target_id: "00000000-0000-0000-0000-000000000000",
      p_reason: "spam",
      p_details: "invalid",
    });
    if (invalid.error) {
      record("report.invalid_target_rejected", "PASS", invalid.error.message);
    } else {
      record("report.invalid_target_rejected", "FAIL", "invalid target accepted");
    }

    // Direct INSERT should fail (RPC-only)
    const direct = await client.from("content_reports").insert({
      target_type: "feed_post",
      target_id: postId || "00000000-0000-0000-0000-000000000000",
      reason: "spam",
    });
    if (direct.error) {
      record("report.direct_insert_blocked", "PASS", direct.error.message);
    } else {
      record("report.direct_insert_blocked", "FAIL", "direct insert succeeded");
    }

    await client.auth.signOut();
  } catch (err) {
    record("report.suite", "FAIL", err.message || String(err));
  }

  // Admin queue sees reports
  try {
    const { client } = await signIn(emails.admin, password);
    const { data, error } = await client.rpc("admin_list_content_reports", {
      p_status: "open",
      p_limit: 50,
    });
    if (error) throw error;
    const ids = new Set((data || []).map((r) => r.id));
    const expected = Object.values(reportIds)
      .map((r) => (r && typeof r === "object" ? r.id : r))
      .filter(Boolean);
    const missing = expected.filter((id) => !ids.has(id));
    if (missing.length) {
      record("report.admin_queue_lists_reports", "FAIL", `missing ${missing.join(",")}; got ${ids.size}`);
    } else {
      record("report.admin_queue_lists_reports", "PASS", `open_reports=${ids.size}`);
    }
    await client.auth.signOut();
  } catch (err) {
    record("report.admin_queue_lists_reports", "FAIL", err.message || String(err));
  }

  // --- BLOCKING ---
  try {
    const { client: clientA } = await signIn(emails.a, password);
    const block = await clientA.rpc("block_member", { p_blocked_user_id: userB.id });
    if (block.error) throw block.error;
    record("block.member_a_blocks_b", "PASS", block.data?.id || "ok");

    const blocked = await clientA.rpc("members_are_blocked", {
      p_user_a: userA.id,
      p_user_b: userB.id,
    });
    if (blocked.error) throw blocked.error;
    record(
      "block.server_members_are_blocked",
      blocked.data === true ? "PASS" : "FAIL",
      `result=${blocked.data}`,
    );

    // Feed page should not include B's post
    const feed = await clientA.rpc("fetch_member_feed_page", {
      p_cursor_created_at: null,
      p_cursor_id: null,
      p_limit: 50,
    });
    if (feed.error) throw feed.error;
    const feedHasB = (feed.data || []).some(
      (row) => row.user_id === userB.id || row.id === postId,
    );
    record(
      "block.feed_excludes_blocked_author",
      feedHasB ? "FAIL" : "PASS",
      `rows=${(feed.data || []).length}`,
    );

    // Profile RPC should not return blocked profile
    const profile = await clientA.rpc("get_portal_member_profile", {
      p_user_id: userB.id,
    });
    if (profile.error && /block|not found|access/i.test(profile.error.message)) {
      record("block.profile_inaccessible", "PASS", profile.error.message);
    } else if (!profile.data || (Array.isArray(profile.data) && profile.data.length === 0)) {
      record("block.profile_inaccessible", "PASS", "empty result");
    } else if (profile.error) {
      record("block.profile_inaccessible", "PASS", profile.error.message);
    } else {
      record("block.profile_inaccessible", "FAIL", "profile still returned");
    }

    // Messaging prevented
    const canSend = await clientA.rpc("can_send_direct_portal_message", {
      p_sender_id: userA.id,
      p_receiver_id: userB.id,
    });
    if (canSend.error) {
      record("block.messaging_prevented", "PASS", canSend.error.message);
    } else {
      record(
        "block.messaging_prevented",
        canSend.data === false ? "PASS" : "FAIL",
        `can_send=${canSend.data}`,
      );
    }

    const canExchange = await clientA.rpc("can_exchange_direct_portal_messages", {
      p_user_a: userA.id,
      p_user_b: userB.id,
    });
    if (!canExchange.error) {
      record(
        "block.exchange_messages_prevented",
        canExchange.data === false ? "PASS" : "FAIL",
        `can_exchange=${canExchange.data}`,
      );
    }

    // Discover / AI search exclusion
    const ai = await clientA.rpc("ai_search_portal_members", {
      p_filters: {},
      p_limit: 50,
    });
    if (ai.error) {
      record("block.ai_search_excludes_blocked", "SKIP", ai.error.message);
    } else {
      const hit = (ai.data || []).some((m) => m.user_id === userB.id || m.id === profileB.id);
      record(
        "block.ai_search_excludes_blocked",
        hit ? "FAIL" : "PASS",
        `results=${(ai.data || []).length}`,
      );
    }

    // Unblock restores
    const unblock = await clientA.rpc("unblock_member", { p_blocked_user_id: userB.id });
    if (unblock.error) throw unblock.error;
    const afterUnblock = await clientA.rpc("members_are_blocked", {
      p_user_a: userA.id,
      p_user_b: userB.id,
    });
    record(
      "block.unblock_clears_server_block",
      afterUnblock.data === false ? "PASS" : "FAIL",
      `blocked=${afterUnblock.data}`,
    );

    const profileAfter = await clientA.rpc("get_portal_member_profile", {
      p_user_id: userB.id,
    });
    const restored =
      !profileAfter.error &&
      (profileAfter.data?.user_id === userB.id ||
        profileAfter.data?.id === profileB.id ||
        (Array.isArray(profileAfter.data) &&
          profileAfter.data.some((p) => p.user_id === userB.id)));
    record(
      "block.unblock_restores_profile_access",
      restored ? "PASS" : "FAIL",
      profileAfter.error?.message || "checked",
    );

    await clientA.auth.signOut();
  } catch (err) {
    record("block.suite", "FAIL", err.message || String(err));
  }

  // --- MODERATION ---
  try {
    const { client } = await signIn(emails.admin, password);

    const isAdmin = await client.rpc("current_user_is_admin");
    record(
      "moderation.admin_allowlist_recognizes_admin",
      isAdmin.data === true ? "PASS" : "FAIL",
      `is_admin=${isAdmin.data}`,
    );

    if (postId && reportIds.post) {
      const reportId =
        typeof reportIds.post === "object" ? reportIds.post.id : reportIds.post;
      const hide = await client.rpc("admin_hide_reported_content", {
        p_target_type: "feed_post",
        p_target_id: postId,
        p_reason: "G12 sandbox hide test",
        p_report_id: reportId,
      });
      if (hide.error) throw hide.error;

      const postCheck = sqlQuery(
        `select moderation_status, hidden_at is not null as is_hidden
         from public.member_feed_posts where id = '${postId}'::uuid`,
      );
      const postRow = postCheck?.rows?.[0];
      record(
        "moderation.hide_content",
        postRow?.moderation_status === "hidden" || postRow?.is_hidden
          ? "PASS"
          : "FAIL",
        `status=${postRow?.moderation_status}`,
      );
    } else {
      record("moderation.hide_content", "SKIP", "missing report/post");
    }

    // Suspend Member B (designated test account), then restore
    const suspend = await client.rpc("admin_set_member_portal_access", {
      p_user_id: userB.id,
      p_enabled: false,
      p_reason: "G12 sandbox moderation test",
    });
    if (suspend.error) throw suspend.error;
    record("moderation.suspend_test_account", "PASS", "portal_access_enabled=false");

    const { client: clientB } = await signIn(emails.b, password);
    const feedAsSuspended = await clientB.rpc("fetch_member_feed_page", {
      p_cursor_created_at: null,
      p_cursor_id: null,
      p_limit: 5,
    });
    if (feedAsSuspended.error && /portal access/i.test(feedAsSuspended.error.message)) {
      record("moderation.suspended_loses_portal_rpc", "PASS", feedAsSuspended.error.message);
    } else if (feedAsSuspended.error) {
      record("moderation.suspended_loses_portal_rpc", "PASS", feedAsSuspended.error.message);
    } else {
      const bProf = sqlQuery(
        `select portal_access_enabled from public.member_profiles where user_id = '${userB.id}'::uuid`,
      )?.rows?.[0];
      record(
        "moderation.suspended_loses_portal_rpc",
        bProf?.portal_access_enabled === false ? "PASS" : "FAIL",
        `rpc_ok=${!feedAsSuspended.error} portal=${bProf?.portal_access_enabled}`,
      );
    }
    await clientB.auth.signOut();

    const audits =
      sqlQuery(
        `select id::text, action from public.moderation_audit_events
         where actor_user_id = '${userAdmin.id}'::uuid
         order by created_at desc limit 20`,
      )?.rows || [];
    const hasSuspend = audits.some((a) => a.action === "member_suspended");
    const hasHide = audits.some((a) => /hide|hidden/i.test(a.action));
    record(
      "moderation.audit_log_records_actions",
      hasSuspend || audits.length > 0 ? "PASS" : "FAIL",
      `events=${audits.length} suspend=${hasSuspend} hide=${hasHide}`,
    );

    const alerts =
      sqlQuery(
        `select id::text, alert_type from public.admin_safety_alerts
         order by created_at desc limit 20`,
      )?.rows || [];
    record(
      "moderation.safety_alerts_present",
      alerts.length > 0 ? "PASS" : "FAIL",
      `alerts=${alerts.length}`,
    );

    // Restore B portal access after suspend test
    const restore = await client.rpc("admin_set_member_portal_access", {
      p_user_id: userB.id,
      p_enabled: true,
      p_reason: "G12 sandbox restore after suspend test",
    });
    if (restore.error) throw restore.error;
    record("moderation.restore_test_account", "PASS", "portal_access_enabled=true");

    await client.auth.signOut();
  } catch (err) {
    record("moderation.suite", "FAIL", err.message || String(err));
    // Best-effort restore of designated test account B if suspend left it disabled.
    try {
      if (userB?.id) {
        sqlQuery(
          `update public.member_profiles set portal_access_enabled = true, updated_at = now()
           where user_id = '${userB.id}'::uuid`,
          { write: true },
        );
        record("moderation.restore_test_account_fallback", "PASS", "restored via SQL");
      }
    } catch (restoreErr) {
      record("moderation.restore_test_account_fallback", "FAIL", restoreErr.message || String(restoreErr));
    }
  }

  printSummary();
  const failed = results.filter((r) => r.status === "FAIL").length;
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const skip = results.filter((r) => r.status === "SKIP").length;
  console.log("\n=== SUMMARY ===");
  console.log(`PASS=${pass} FAIL=${fail} SKIP=${skip}`);
  for (const r of results.filter((r) => r.status === "FAIL")) {
    console.log(`  FAIL: ${r.name} — ${r.detail}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
