import { supabase } from "./supabase";

/**
 * auth.uid() from Supabase Auth is the source of truth across the member portal.
 * When creating a member login, use the Supabase Auth User UID for:
 * - public.users.id
 * - member_profiles.user_id
 * - introduction_requests.sender_id / receiver_id
 */
export const AUTH_USER_ID_LINKING_NOTE =
  "When creating a member login, copy the Supabase Auth User UID from Authentication > Users and use it as both public.users.id and member_profiles.user_id.";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidAuthUserId(value: string) {
  return UUID_PATTERN.test(value.trim());
}

export async function upsertPublicUser({
  id,
  email,
}: {
  id: string;
  email: string;
}) {
  if (!supabase) {
    return { error: new Error("Supabase is not configured.") };
  }

  const { error } = await supabase.from("users").upsert(
    {
      id: id.trim(),
      email: email.trim().toLowerCase(),
    },
    { onConflict: "id" },
  );

  return { error };
}

export async function getCurrentAuthUserId() {
  if (!supabase) {
    return { userId: null, error: new Error("Supabase is not configured.") };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return { userId: null, error };
  }

  return { userId: user?.id ?? null, error: null };
}
