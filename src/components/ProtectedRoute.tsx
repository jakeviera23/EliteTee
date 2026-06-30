import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setHasSession(!!session);
      setSessionChecked(true);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!sessionChecked) {
    return null;
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
