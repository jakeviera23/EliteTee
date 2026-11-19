import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AccountDeletionOutcome } from "@/lib/accountDeletion";
import { requestAccountDeletion } from "@/lib/api/account";
import { clearCurrentUserIdCache, fetchOwnProfile, fetchPortalAccess } from "@/lib/api/members";
import { classifyAuthError, logAuthError, type MobileAuthError } from "@/lib/auth/authErrors";
import { resolveMobileDeepLink } from "@/lib/auth/deepLinks";
import { dismissInAppBrowser, openEliteTeeInAppBrowser } from "@/lib/auth/inAppBrowser";
import {
  clearPendingInviteToken,
  readPendingInviteToken,
  storePendingInviteToken,
  tryCompleteAuthenticatedInviteRedemption,
} from "@/lib/auth/inviteRedemption";
import { getAuthCallbackUrl } from "@/lib/auth/siteUrls";
import { clearPortalNotificationStorage } from "@/lib/portalNotificationsStorage";
import { clearSessionCaches } from "@/lib/sessionCache";
import { acceptCurrentTerms, hasAcceptedCurrentTerms } from "@/lib/termsAcceptance";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { MobileMemberProfile } from "@/types/member";

export type AuthStatus =
  | "booting"
  | "signed_out"
  | "terms_required"
  | "portal_pending"
  | "access_check_failed"
  | "ready";

type AuthContextValue = {
  isConfigured: boolean;
  /** True until first session bootstrap finishes. */
  loading: boolean;
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: MobileMemberProfile | null;
  hasPortalAccess: boolean;
  hasAcceptedTerms: boolean;
  pendingInviteToken: string | null;
  refreshProfile: () => Promise<void>;
  refreshPortalAccess: () => Promise<void>;
  refreshTermsAcceptance: () => Promise<void>;
  acceptTerms: () => Promise<{ error: MobileAuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: MobileAuthError | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: MobileAuthError | null }>;
  signOut: () => Promise<void>;
  /** Permanently delete the signed-in account, then sign out locally on success. */
  deleteAccount: () => Promise<AccountDeletionOutcome>;
  /** True after a successful in-app deletion until the next sign-in or dismissal. */
  accountDeleted: boolean;
  dismissAccountDeletedNotice: () => void;
  captureInviteToken: (token: string) => Promise<void>;
  clearInviteToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function clearLocalAuthState(
  setSession: (session: Session | null) => void,
  setProfile: (profile: MobileMemberProfile | null) => void,
  setHasPortalAccess: (value: boolean) => void,
  setPortalAccessCheckFailed: (value: boolean) => void,
  setHasAcceptedTerms: (value: boolean) => void,
) {
  setSession(null);
  setProfile(null);
  setHasPortalAccess(false);
  setPortalAccessCheckFailed(false);
  setHasAcceptedTerms(false);
  clearCurrentUserIdCache();
  clearSessionCaches();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MobileMemberProfile | null>(null);
  const [hasPortalAccess, setHasPortalAccess] = useState(false);
  const [portalAccessCheckFailed, setPortalAccessCheckFailed] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const bootstrapGeneration = useRef(0);

  const refreshProfile = useCallback(async () => {
    const { data } = await fetchOwnProfile();
    setProfile(data);
  }, []);

  const refreshPortalAccess = useCallback(async () => {
    if (!session) {
      setHasPortalAccess(false);
      setPortalAccessCheckFailed(false);
      return;
    }

    let { data: access, error: accessError } = await fetchPortalAccess();
    if (accessError || !access?.verified) {
      logAuthError("portal access refresh failed", accessError ?? new Error("Unverified"));
      // Preserve last known valid access — do not flip a member to portal_pending.
      setPortalAccessCheckFailed(true);
      return;
    }

    if (!access.hasAccess) {
      const redemption = await tryCompleteAuthenticatedInviteRedemption();
      if (redemption.completed) {
        const retry = await fetchPortalAccess();
        if (retry.error || !retry.data?.verified) {
          logAuthError("portal access retry failed", retry.error ?? new Error("Unverified"));
          setPortalAccessCheckFailed(true);
          setPendingInviteToken(await readPendingInviteToken());
          return;
        }
        access = retry.data;
        setPendingInviteToken(await readPendingInviteToken());
      }
    }

    setPortalAccessCheckFailed(false);
    setHasPortalAccess(Boolean(access?.hasAccess));
    if (access?.hasAccess) {
      const { data } = await fetchOwnProfile();
      setProfile(data);
      await clearPendingInviteToken();
      setPendingInviteToken(null);
    }
  }, [session]);

  const captureInviteToken = useCallback(async (token: string) => {
    const normalized = token.trim();
    if (!normalized) return;
    await storePendingInviteToken(normalized);
    setPendingInviteToken(normalized);
  }, []);

  const clearInviteToken = useCallback(async () => {
    await clearPendingInviteToken();
    setPendingInviteToken(null);
  }, []);

  const bootstrapSession = useCallback(async (nextSession: Session | null) => {
    const generation = ++bootstrapGeneration.current;
    setSession(nextSession);

    if (!nextSession) {
      setProfile(null);
      setHasPortalAccess(false);
      setPortalAccessCheckFailed(false);
      setHasAcceptedTerms(false);
      clearCurrentUserIdCache();
      clearSessionCaches();
      return;
    }

    try {
      const terms = await hasAcceptedCurrentTerms();
      if (generation !== bootstrapGeneration.current) return;
      setHasAcceptedTerms(terms.accepted);

      let { data: access, error: accessError } = await fetchPortalAccess();
      if (generation !== bootstrapGeneration.current) return;

      if (accessError || !access?.verified) {
        logAuthError("portal access lookup failed", accessError ?? new Error("Unverified"));
        // Soft-fail: keep prior access if we already knew the member was valid.
        // On cold boot prior is false → access_check_failed (retry), not portal_pending.
        setPortalAccessCheckFailed(true);
        return;
      }

      if (!access.hasAccess) {
        const redemption = await tryCompleteAuthenticatedInviteRedemption();
        if (generation !== bootstrapGeneration.current) return;

        if (redemption.completed) {
          const retry = await fetchPortalAccess();
          if (generation !== bootstrapGeneration.current) return;
          if (retry.error || !retry.data?.verified) {
            logAuthError("portal access retry failed", retry.error ?? new Error("Unverified"));
            setPortalAccessCheckFailed(true);
            const remaining = await readPendingInviteToken();
            setPendingInviteToken(remaining);
            return;
          }
          access = retry.data;
          const remaining = await readPendingInviteToken();
          setPendingInviteToken(remaining);
        } else if (redemption.error) {
          logAuthError("invite redemption failed", redemption.error);
        }
      } else {
        await clearPendingInviteToken();
        if (generation === bootstrapGeneration.current) {
          setPendingInviteToken(null);
        }
      }

      if (generation !== bootstrapGeneration.current) return;

      setPortalAccessCheckFailed(false);
      setHasPortalAccess(Boolean(access?.hasAccess));

      if (access?.hasAccess) {
        const { data } = await fetchOwnProfile();
        if (generation !== bootstrapGeneration.current) return;
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      logAuthError("session bootstrap failed", error);
      if (generation !== bootstrapGeneration.current) return;
      // Soft-fail: do not claim the member lacks portal access.
      setPortalAccessCheckFailed(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void readPendingInviteToken().then((token) => {
      if (active) setPendingInviteToken(token);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setBooting(false);
      return;
    }

    let active = true;
    const client = supabase;

    void client.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;

      if (error) {
        logAuthError("getSession failed", error);
        clearLocalAuthState(
          setSession,
          setProfile,
          setHasPortalAccess,
          setPortalAccessCheckFailed,
          setHasAcceptedTerms,
        );
        setBooting(false);
        return;
      }

      try {
        await bootstrapSession(data.session);
      } finally {
        if (active) setBooting(false);
      }
    });

    const { data: subscription } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY") {
        // Recovery completion lives on web; do not treat this as a portal session.
        void (async () => {
          await client.auth.signOut();
          clearLocalAuthState(
            setSession,
            setProfile,
            setHasPortalAccess,
            setPortalAccessCheckFailed,
            setHasAcceptedTerms,
          );
          try {
            await openEliteTeeInAppBrowser(getAuthCallbackUrl());
          } catch (error) {
            logAuthError("failed to open web recovery", error);
          }
        })();
        return;
      }

      if (event === "SIGNED_OUT") {
        bootstrapGeneration.current += 1;
        clearLocalAuthState(
          setSession,
          setProfile,
          setHasPortalAccess,
          setPortalAccessCheckFailed,
          setHasAcceptedTerms,
        );
        return;
      }

      void bootstrapSession(nextSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [bootstrapSession]);

  useEffect(() => {
    let active = true;

    async function handleUrl(url: string | null) {
      if (!active || !url) return;

      // A deep link back into the app means the web step is done; close the sheet first.
      await dismissInAppBrowser();

      const action = resolveMobileDeepLink(url);
      if (action.kind === "invite") {
        await captureInviteToken(action.token);
        return;
      }

      if (action.kind === "recovery" || action.kind === "auth_callback") {
        try {
          await openEliteTeeInAppBrowser(action.openUrl);
        } catch (error) {
          logAuthError("failed to hand off auth link to web", error);
        }
      }
    }

    void Linking.getInitialURL().then((url) => {
      void handleUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [captureInviteToken]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return {
        error: {
          kind: "unknown" as const,
          message: "Supabase is not configured for this build.",
        },
      };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        logAuthError("signInWithPassword", error);
        return { error: classifyAuthError(error) };
      }

      setAccountDeleted(false);
      await tryCompleteAuthenticatedInviteRedemption();
      const remaining = await readPendingInviteToken();
      setPendingInviteToken(remaining);
      const terms = await hasAcceptedCurrentTerms();
      setHasAcceptedTerms(terms.accepted);
      return { error: null };
    } catch (error) {
      logAuthError("signIn unexpected", error);
      return { error: classifyAuthError(error) };
    }
  }, []);

  const refreshTermsAcceptance = useCallback(async () => {
    if (!session) {
      setHasAcceptedTerms(false);
      return;
    }
    const terms = await hasAcceptedCurrentTerms();
    setHasAcceptedTerms(terms.accepted);
  }, [session]);

  const acceptTerms = useCallback(async () => {
    const result = await acceptCurrentTerms("ios");
    if (!result.ok) {
      logAuthError("acceptCurrentTerms", result.error);
      return {
        error: {
          kind: "unknown" as const,
          message: "We could not save your Terms agreement. Please try again.",
        },
      };
    }
    setHasAcceptedTerms(true);
    return { error: null };
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) {
      return {
        error: {
          kind: "unknown" as const,
          message: "Password recovery is temporarily unavailable.",
        },
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: getAuthCallbackUrl(),
      });

      if (error) {
        logAuthError("resetPasswordForEmail", error);
        return { error: classifyAuthError(error) };
      }

      return { error: null };
    } catch (error) {
      logAuthError("resetPassword unexpected", error);
      return { error: classifyAuthError(error) };
    }
  }, []);

  const signOut = useCallback(async () => {
    bootstrapGeneration.current += 1;
    clearLocalAuthState(
      setSession,
      setProfile,
      setHasPortalAccess,
      setPortalAccessCheckFailed,
      setHasAcceptedTerms,
    );

    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logAuthError("signOut", error);
      }
    } catch (error) {
      logAuthError("signOut unexpected", error);
    }
  }, []);

  const deleteAccount = useCallback(async (): Promise<AccountDeletionOutcome> => {
    const userId = session?.user.id ?? null;
    const outcome = await requestAccountDeletion();
    if (outcome.kind !== "deleted") return outcome;

    setAccountDeleted(true);
    bootstrapGeneration.current += 1;
    clearLocalAuthState(
      setSession,
      setProfile,
      setHasPortalAccess,
      setPortalAccessCheckFailed,
      setHasAcceptedTerms,
    );

    try {
      if (userId) await clearPortalNotificationStorage(userId);
      await clearPendingInviteToken();
    } catch (error) {
      logAuthError("clear local data after account deletion", error);
    }
    setPendingInviteToken(null);

    if (supabase) {
      try {
        // The auth user no longer exists, so only the on-device session needs clearing.
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) logAuthError("local signOut after account deletion", error);
      } catch (error) {
        logAuthError("local signOut after account deletion", error);
      }
    }

    return outcome;
  }, [session]);

  const dismissAccountDeletedNotice = useCallback(() => {
    setAccountDeleted(false);
  }, []);

  const status: AuthStatus = booting
    ? "booting"
    : !session
      ? "signed_out"
      : !hasAcceptedTerms
        ? "terms_required"
        : hasPortalAccess
          ? "ready"
          : portalAccessCheckFailed
            ? "access_check_failed"
            : "portal_pending";

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      loading: booting,
      status,
      session,
      user: session?.user ?? null,
      profile,
      hasPortalAccess,
      hasAcceptedTerms,
      pendingInviteToken,
      refreshProfile,
      refreshPortalAccess,
      refreshTermsAcceptance,
      acceptTerms,
      signIn,
      requestPasswordReset,
      signOut,
      deleteAccount,
      accountDeleted,
      dismissAccountDeletedNotice,
      captureInviteToken,
      clearInviteToken,
    }),
    [
      booting,
      status,
      session,
      profile,
      hasPortalAccess,
      hasAcceptedTerms,
      pendingInviteToken,
      refreshProfile,
      refreshPortalAccess,
      refreshTermsAcceptance,
      acceptTerms,
      signIn,
      requestPasswordReset,
      signOut,
      deleteAccount,
      accountDeleted,
      dismissAccountDeletedNotice,
      captureInviteToken,
      clearInviteToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
