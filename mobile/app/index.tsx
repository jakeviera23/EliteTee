import { Redirect } from "expo-router";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/AuthProvider";

export default function IndexRoute() {
  const { loading, session, hasPortalAccess, isConfigured } = useAuth();

  if (!isConfigured) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (loading) {
    return <LoadingState label="Restoring your session…" fullScreen />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!hasPortalAccess) {
    return <Redirect href="/(auth)/portal-pending" />;
  }

  return <Redirect href="/(app)" />;
}
