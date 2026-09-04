import { Stack } from "expo-router";
import { RequirePortalAccess } from "@/components/auth/RequirePortalAccess";

export default function NotificationsLayout() {
  return (
    <RequirePortalAccess loadingLabel="Opening alerts…">
      <Stack screenOptions={{ headerShown: false }} />
    </RequirePortalAccess>
  );
}
