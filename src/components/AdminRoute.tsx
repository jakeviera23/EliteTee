import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAdminEmail } from "../lib/admin";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function AdminRoute({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured || !supabase) {
      setIsAllowed(false);
      setChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;

      const email = session?.user.email;
      setIsAllowed(!!session && isAdminEmail(email));
      setChecked(true);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!checked) {
    return null;
  }

  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
