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
