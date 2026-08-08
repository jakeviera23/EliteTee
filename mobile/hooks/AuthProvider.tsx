import { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearCurrentUserIdCache, fetchOwnProfile, fetchPortalAccess } from "@/lib/api/members";
import { tryCompleteAuthenticatedInviteRedemption } from "@/lib/auth/inviteRedemption";
import { clearSessionCaches } from "@/lib/sessionCache";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { MobileMemberProfile } from "@/types/member";

type AuthContextValue = {
  isConfigured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: MobileMemberProfile | null;
  hasPortalAccess: boolean;
  refreshProfile: () => Promise<void>;
  refreshPortalAccess: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MobileMemberProfile | null>(null);
  const [hasPortalAccess, setHasPortalAccess] = useState(false);

  const refreshProfile = useCallback(async () => {
    const { data } = await fetchOwnProfile();
    setProfile(data);
  }, []);

  const refreshPortalAccess = useCallback(async () => {
    const { data } = await fetchPortalAccess();
    setHasPortalAccess(Boolean(data?.hasAccess));
  }, []);

  const bootstrapSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession) {
      setProfile(null);
      setHasPortalAccess(false);
      clearCurrentUserIdCache();
      clearSessionCaches();
      return;
    }

    let { data: access } = await fetchPortalAccess();

    if (!access?.hasAccess) {
      const redemption = await tryCompleteAuthenticatedInviteRedemption();
      if (redemption.completed) {
        const retry = await fetchPortalAccess();
        access = retry.data;
      }
    }

    setHasPortalAccess(Boolean(access?.hasAccess));

    if (access?.hasAccess) {
      const { data } = await fetchOwnProfile();
      setProfile(data);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      void bootstrapSession(data.session).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void bootstrapSession(nextSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [bootstrapSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured for this build." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return { error: error.message };
    }

    await tryCompleteAuthenticatedInviteRedemption();
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    clearCurrentUserIdCache();
    clearSessionCaches();
    setSession(null);
    setProfile(null);
    setHasPortalAccess(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      hasPortalAccess,
      refreshProfile,
      refreshPortalAccess,
      signIn,
      signOut,
    }),
    [
      loading,
      session,
      profile,
      hasPortalAccess,
      refreshProfile,
      refreshPortalAccess,
      signIn,
      signOut,
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
