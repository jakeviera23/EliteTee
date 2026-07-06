import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { RouteLoading } from "./RouteLoading";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured || !supabase) {
      setHasSession(false);
      setSessionChecked(true);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        setHasSession(!!session);
        setSessionChecked(true);
      })
      .catch((error) => {
        console.warn("Session check failed:", error);
        if (!active) return;
        setHasSession(false);
        setSessionChecked(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!sessionChecked) {
    return <RouteLoading label="Checking member session" />;
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
