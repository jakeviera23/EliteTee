import { Redirect } from "expo-router";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/AuthProvider";

export default function IndexRoute() {
  const { loading, status, isConfigured, pendingInviteToken } = useAuth();

  if (!isConfigured) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (loading || status === "booting") {
    return <LoadingState label="Restoring your session…" fullScreen />;
  }

  if (status === "signed_out") {
    if (pendingInviteToken) {
      return <Redirect href="/(auth)/membership-setup" />;
    }
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (status === "portal_pending") {
    return <Redirect href="/(auth)/portal-pending" />;
  }

  return <Redirect href="/(app)" />;
}
