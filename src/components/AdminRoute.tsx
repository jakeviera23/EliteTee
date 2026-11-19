import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAdminEmail } from "../lib/admin";
import { hasAcceptedCurrentTerms } from "../lib/termsAcceptance";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { RouteLoading } from "./RouteLoading";
import { TermsAcceptanceGate } from "./TermsAcceptanceGate";

export function AdminRoute({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured || !supabase) {
      setIsAllowed(false);
      setChecked(true);
      setTermsChecked(true);
      return;
    }

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!active) return;

        const email = session?.user.email;
        const allowed = !!session && isAdminEmail(email);
        setIsAllowed(allowed);
        setChecked(true);

        if (!allowed) {
          setTermsChecked(true);
          return;
        }

        const terms = await hasAcceptedCurrentTerms();
        if (!active) return;
        setHasAcceptedTerms(terms.accepted);
        setTermsChecked(true);
      })
      .catch((error) => {
        console.warn("Admin session check failed:", error);
        if (!active) return;
        setIsAllowed(false);
        setChecked(true);
        setTermsChecked(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!checked || !termsChecked) {
    return <RouteLoading label="Checking admin access" />;
  }

  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAcceptedTerms) {
    return (
      <TermsAcceptanceGate
        onAccepted={() => setHasAcceptedTerms(true)}
        onSignOut={async () => {
          if (supabase) await supabase.auth.signOut();
          setIsAllowed(false);
          setHasAcceptedTerms(false);
        }}
      />
    );
  }

  return <>{children}</>;
}
