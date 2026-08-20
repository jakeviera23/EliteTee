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
import { clearCurrentUserIdCache, fetchOwnProfile, fetchPortalAccess } from "@/lib/api/members";
import { classifyAuthError, logAuthError, type MobileAuthError } from "@/lib/auth/authErrors";
import { openExternalEliteTeeUrl, resolveMobileDeepLink } from "@/lib/auth/deepLinks";
import {
  clearPendingInviteToken,
  readPendingInviteToken,
  storePendingInviteToken,
  tryCompleteAuthenticatedInviteRedemption,
} from "@/lib/auth/inviteRedemption";
import { getAuthCallbackUrl } from "@/lib/auth/siteUrls";
import { clearSessionCaches } from "@/lib/sessionCache";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { MobileMemberProfile } from "@/types/member";

export type AuthStatus = "booting" | "signed_out" | "portal_pending" | "ready";

type AuthContextValue = {
  isConfigured: boolean;
  /** True until first session bootstrap finishes. */
  loading: boolean;
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: MobileMemberProfile | null;
  hasPortalAccess: boolean;
  pendingInviteToken: string | null;
  refreshProfile: () => Promise<void>;
  refreshPortalAccess: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: MobileAuthError | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: MobileAuthError | null }>;
  signOut: () => Promise<void>;
  captureInviteToken: (token: string) => Promise<void>;
  clearInviteToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function clearLocalAuthState(
  setSession: (session: Session | null) => void,
  setProfile: (profile: MobileMemberProfile | null) => void,
  setHasPortalAccess: (value: boolean) => void,
) {
  setSession(null);
  setProfile(null);
  setHasPortalAccess(false);
  clearCurrentUserIdCache();
  clearSessionCaches();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MobileMemberProfile | null>(null);
  const [hasPortalAccess, setHasPortalAccess] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const bootstrapGeneration = useRef(0);

  const refreshProfile = useCallback(async () => {
    const { data } = await fetchOwnProfile();
    setProfile(data);
  }, []);

  const refreshPortalAccess = useCallback(async () => {
    if (!session) {
      setHasPortalAccess(false);
      return;
    }

    let { data: access } = await fetchPortalAccess();
    if (!access?.hasAccess) {
      const redemption = await tryCompleteAuthenticatedInviteRedemption();
      if (redemption.completed) {
        const retry = await fetchPortalAccess();
        access = retry.data;
        setPendingInviteToken(await readPendingInviteToken());
      }
    }

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
      clearCurrentUserIdCache();
      clearSessionCaches();
      return;
    }

    try {
      let { data: access, error: accessError } = await fetchPortalAccess();
      if (generation !== bootstrapGeneration.current) return;

      if (accessError) {
        logAuthError("portal access lookup failed", accessError);
      }

      if (!access?.hasAccess) {
        const redemption = await tryCompleteAuthenticatedInviteRedemption();
        if (generation !== bootstrapGeneration.current) return;

        if (redemption.completed) {
          const retry = await fetchPortalAccess();
          if (generation !== bootstrapGeneration.current) return;
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
      setHasPortalAccess(false);
      setProfile(null);
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
        clearLocalAuthState(setSession, setProfile, setHasPortalAccess);
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
          try {
            await openExternalEliteTeeUrl(getAuthCallbackUrl());
          } catch (error) {
            logAuthError("failed to open web recovery", error);
          }
          await client.auth.signOut();
          clearLocalAuthState(setSession, setProfile, setHasPortalAccess);
        })();
        return;
      }

      if (event === "SIGNED_OUT") {
        bootstrapGeneration.current += 1;
        clearLocalAuthState(setSession, setProfile, setHasPortalAccess);
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

      const action = resolveMobileDeepLink(url);
      if (action.kind === "invite") {
        await captureInviteToken(action.token);
        return;
      }

      if (action.kind === "recovery" || action.kind === "auth_callback") {
        try {
          await openExternalEliteTeeUrl(action.openUrl);
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

      await tryCompleteAuthenticatedInviteRedemption();
      const remaining = await readPendingInviteToken();
      setPendingInviteToken(remaining);
      return { error: null };
    } catch (error) {
      logAuthError("signIn unexpected", error);
      return { error: classifyAuthError(error) };
    }
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
    clearLocalAuthState(setSession, setProfile, setHasPortalAccess);

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

  const status: AuthStatus = booting
    ? "booting"
    : !session
      ? "signed_out"
      : hasPortalAccess
        ? "ready"
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
      pendingInviteToken,
      refreshProfile,
      refreshPortalAccess,
      signIn,
      requestPasswordReset,
      signOut,
      captureInviteToken,
      clearInviteToken,
    }),
    [
      booting,
      status,
      session,
      profile,
      hasPortalAccess,
      pendingInviteToken,
      refreshProfile,
      refreshPortalAccess,
      signIn,
      requestPasswordReset,
      signOut,
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
