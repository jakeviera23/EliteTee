import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAdminEmail } from "../lib/admin";
import { fetchMemberPortalAccess } from "../lib/memberProfiles";
import { completePendingMembershipInviteForUser } from "../lib/membershipInvites";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { RouteLoading } from "./RouteLoading";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [portalChecked, setPortalChecked] = useState(false);
  const [hasPortalAccess, setHasPortalAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured || !supabase) {
      setHasSession(false);
      setSessionChecked(true);
      setPortalChecked(true);
      return;
    }

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!active) return;

        const signedIn = !!session;
        setHasSession(signedIn);
        setSessionChecked(true);

        if (!signedIn) {
          setPortalChecked(true);
          return;
        }

        const email = session?.user?.email;
        const admin = isAdminEmail(email);
        setIsAdmin(admin);

        if (admin) {
          setHasPortalAccess(true);
          setPortalChecked(true);
          return;
        }

        const { hasAccess } = await fetchMemberPortalAccess();
        if (!active) return;

        if (!hasAccess) {
          const { data: completionResult, error: completionError } =
            await completePendingMembershipInviteForUser();

          if (completionError) {
            console.warn("Pending membership invite completion failed:", completionError);
          } else if (
            completionResult &&
            typeof completionResult === "object" &&
            Boolean((completionResult as Record<string, unknown>).completed)
          ) {
            const retry = await fetchMemberPortalAccess();
            if (!active) return;
            setHasPortalAccess(retry.hasAccess);
            setPortalChecked(true);
            return;
          }
        }

        setHasPortalAccess(hasAccess);
        setPortalChecked(true);
      })
      .catch((error) => {
        console.warn("Session check failed:", error);
        if (!active) return;
        setHasSession(false);
        setSessionChecked(true);
        setPortalChecked(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!sessionChecked || !portalChecked) {
    return <RouteLoading label="Checking member session" />;
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPortalAccess && !isAdmin) {
    return (
      <div className="portal-access-pending">
        <div className="portal-access-pending-card">
          <h1>Portal access pending</h1>
          <p>
            Your login is active, but portal access has not been enabled yet. If you were recently
            approved, sign out and back in, or open your private invitation link to finish setup.
          </p>
          <a href="/login" className="portal-btn portal-btn--gold">
            Return to sign in
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
