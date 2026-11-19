/**
 * Client-side admin UI gate (AdminRoute).
 * Must stay aligned with:
 * - public.admin_email_allowlist / current_user_is_admin() (RLS + moderation RPCs)
 * - ADMIN_NOTIFY_EMAILS on the notify-admin-safety Edge Function
 */
export function getAdminEmails(): string[] {
  const raw = import.meta.env.VITE_ADMIN_EMAILS;
  if (!raw?.trim()) return [];

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;

  const admins = getAdminEmails();
  if (admins.length === 0) return false;

  return admins.includes(email.trim().toLowerCase());
}
