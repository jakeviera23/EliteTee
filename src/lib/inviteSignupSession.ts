export function normalizeAuthEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export function inviteSignupSessionConflict(
  sessionEmail: string | null | undefined,
  inviteEmail: string | null | undefined,
): { signedInEmail: string; inviteEmail: string } | null {
  const signedIn = normalizeAuthEmail(sessionEmail);
  const invited = normalizeAuthEmail(inviteEmail);

  if (!signedIn || !invited || signedIn === invited) {
    return null;
  }

  return { signedInEmail: signedIn, inviteEmail: invited };
}

export function inviteSignupSessionConflictMessage(
  signedInEmail: string,
  inviteEmail: string,
): string {
  return `You're currently signed in as ${signedInEmail}. Sign out before creating the account for ${inviteEmail}.`;
}
