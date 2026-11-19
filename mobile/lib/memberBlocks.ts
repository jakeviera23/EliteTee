import {
  SESSION_CACHE_KEYS,
  invalidateSessionCache,
  invalidateSessionCachePrefix,
} from "@/lib/sessionCache";
import { requireSupabase } from "@/lib/supabase";

export type BlockedMemberRow = {
  block_id: string;
  blocked_user_id: string;
  full_name: string | null;
  primary_club: string | null;
  based_in: string | null;
  club_logo_url: string | null;
  created_at: string;
};

export function formatMemberBlockError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : "Something went wrong.";

  const lower = message.toLowerCase();
  if (lower.includes("cannot block yourself")) {
    return "You cannot block yourself.";
  }
  if (lower.includes("could not be found")) {
    return "That member could not be found.";
  }
  if (lower.includes("portal access")) {
    return "Portal access is required to block a member.";
  }
  return "That member could not be blocked. Please try again.";
}

/** Drop locally cached content that may include blocked/unblocked members. */
export function invalidateBlockSensitiveCaches() {
  invalidateSessionCache(SESSION_CACHE_KEYS.homeFeed);
  invalidateSessionCache(SESSION_CACHE_KEYS.discoverMembers);
  invalidateSessionCache(SESSION_CACHE_KEYS.conversations);
  invalidateSessionCachePrefix("feed:post:");
  invalidateSessionCachePrefix("profile:");
}

export async function blockMember(blockedUserId: string): Promise<void> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("block_member", {
    p_blocked_user_id: blockedUserId,
  });

  if (error) {
    throw new Error(error.message);
  }

  invalidateBlockSensitiveCaches();

  const blockId =
    data && typeof data === "object" && "id" in data
      ? String((data as { id: string }).id)
      : null;

  if (blockId) {
    try {
      await client.functions.invoke("notify-admin-safety", {
        body: { type: "member_block", id: blockId },
      });
    } catch {
      // Database alert still recorded.
    }
  }
}

export async function unblockMember(blockedUserId: string): Promise<boolean> {
  const { data, error } = await requireSupabase().rpc("unblock_member", {
    p_blocked_user_id: blockedUserId,
  });

  if (error) {
    throw new Error(error.message);
  }

  invalidateBlockSensitiveCaches();
  return Boolean(data);
}

export async function listMyBlockedMembers(): Promise<BlockedMemberRow[]> {
  const { data, error } = await requireSupabase().rpc("list_my_blocked_members");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BlockedMemberRow[];
}

export async function membersAreBlocked(userA: string, userB: string): Promise<boolean> {
  if (!userA || !userB || userA === userB) return false;

  const { data, error } = await requireSupabase().rpc("members_are_blocked", {
    p_user_a: userA,
    p_user_b: userB,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

/** Best-effort set of user ids I have blocked, for client-side filtering. Empty on failure. */
export async function fetchBlockedUserIdSet(): Promise<Set<string>> {
  try {
    const rows = await listMyBlockedMembers();
    return new Set(rows.map((row) => row.blocked_user_id));
  } catch {
    return new Set();
  }
}
