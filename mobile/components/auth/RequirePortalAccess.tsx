import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/AuthProvider";

/**
 * Gates stack routes outside the (app) tabs shell.
 * Signed-out / unverified members never load protected screens.
 */
export function RequirePortalAccess({
  children,
  loadingLabel = "Opening EliteTee…",
}: {
  children: ReactNode;
  loadingLabel?: string;
}) {
  const { loading, status } = useAuth();

  if (loading || status === "booting") {
    return <LoadingState label={loadingLabel} fullScreen />;
  }

  if (status === "signed_out") {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (status === "portal_pending" || status === "access_check_failed") {
    return <Redirect href="/(auth)/portal-pending" />;
  }

  return <>{children}</>;
}
