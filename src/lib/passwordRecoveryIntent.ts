const RECOVERY_PENDING_KEY = "elitetee:password-recovery-pending";

function getSessionStorage(): Storage | null {
  try {
    const storage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    if (!storage) return null;
    const probe = "__elitetee_recovery_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** Mark that a recovery callback was verified and set-password must complete. */
export function markPasswordRecoveryPending() {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(RECOVERY_PENDING_KEY, "1");
  } catch {
    // Ignore quota / private-mode failures; router state remains the primary signal.
  }
}

export function clearPasswordRecoveryPending() {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(RECOVERY_PENDING_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function isPasswordRecoveryPending(): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;
  try {
    return storage.getItem(RECOVERY_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

/** Router state or durable sessionStorage flag — either is enough for set-password. */
export function hasPasswordRecoveryVerifiedIntent(recoveryVerifiedFromRouter?: boolean): boolean {
  return Boolean(recoveryVerifiedFromRouter) || isPasswordRecoveryPending();
}

/**
 * While recovery is pending, an authenticated session must not auto-enter the portal.
 * Normal sign-in still portals when none of these signals are set.
 */
export function shouldAutoRedirectAuthenticatedSessionToPortal(input: {
  expectsRecoveryQuery?: boolean;
  recoveryVerifiedFromRouter?: boolean;
}): boolean {
  if (input.expectsRecoveryQuery) return false;
  if (hasPasswordRecoveryVerifiedIntent(input.recoveryVerifiedFromRouter)) return false;
  return true;
}

/** AuthCallback fallback when capture is already consumed. */
export function resolveAuthCallbackLoginNavigation(): {
  path: "/login";
  state?: { recoveryVerified: true };
} {
  if (isPasswordRecoveryPending()) {
    return { path: "/login", state: { recoveryVerified: true } };
  }
  return { path: "/login" };
}

export const PASSWORD_RECOVERY_PENDING_STORAGE_KEY = RECOVERY_PENDING_KEY;
