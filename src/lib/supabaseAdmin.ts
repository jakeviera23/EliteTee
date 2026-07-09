import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const serviceRoleKey = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

let adminClient: SupabaseClient | null = null;

export function isSupabaseAdminConfigured() {
  return Boolean(supabaseUrl && serviceRoleKey.length >= 20);
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

export type AuthInviteResult = {
  userId: string | null;
  invitationLink: string | null;
  error: Error | null;
  usedServiceRole: boolean;
};

/**
 * Creates a Supabase Auth user and generates an invite link without sending email.
 * Requires VITE_SUPABASE_SERVICE_ROLE_KEY (admin-only; never expose in public builds).
 */
export async function createAuthInviteForEmail(email: string): Promise<AuthInviteResult> {
  const admin = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  if (!admin) {
    return {
      userId: null,
      invitationLink: null,
      error: new Error(
        "Service role key not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to enable automatic auth account creation.",
      ),
      usedServiceRole: false,
    };
  }

  const redirectTo = `${window.location.origin}/login`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: normalizedEmail,
    options: { redirectTo },
  });

  if (error) {
    return {
      userId: null,
      invitationLink: null,
      error: new Error(error.message),
      usedServiceRole: true,
    };
  }

  return {
    userId: data.user?.id ?? null,
    invitationLink: data.properties?.action_link ?? null,
    error: null,
    usedServiceRole: true,
  };
}
