import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { isAdminEmail } from "../lib/admin";
import { INVITE_ACTIVATION_RECOVERY_MESSAGE } from "../lib/inviteCompletion";
import { fetchMemberPortalAccess } from "../lib/memberProfiles";
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
          <h1>Finish your invitation</h1>
          <p>{INVITE_ACTIVATION_RECOVERY_MESSAGE}</p>
          <div className="portal-access-pending-actions">
            <Link to="/login" className="portal-btn portal-btn--gold">
              Return to sign in
            </Link>
            <a href="mailto:membership@elitetee.club" className="portal-btn portal-btn--outline">
              Contact membership
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
