import { isSupabaseConfigured, supabase } from "./supabase";

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

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

export async function blockMember(blockedUserId: string): Promise<void> {
  const client = requireClient();
  const { data, error } = await client.rpc("block_member", {
    p_blocked_user_id: blockedUserId,
  });

  if (error) {
    throw new Error(error.message);
  }

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
  const client = requireClient();
  const { data, error } = await client.rpc("unblock_member", {
    p_blocked_user_id: blockedUserId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function listMyBlockedMembers(): Promise<BlockedMemberRow[]> {
  const client = requireClient();
  const { data, error } = await client.rpc("list_my_blocked_members");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BlockedMemberRow[];
}

export async function membersAreBlocked(
  userA: string,
  userB: string,
): Promise<boolean> {
  if (!userA || !userB || userA === userB) return false;

  const client = requireClient();
  const { data, error } = await client.rpc("members_are_blocked", {
    p_user_a: userA,
    p_user_b: userB,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}
