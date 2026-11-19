import { Stack } from "expo-router";
import { RequirePortalAccess } from "@/components/auth/RequirePortalAccess";

export default function FeedLayout() {
  return (
    <RequirePortalAccess loadingLabel="Opening post…">
      <Stack screenOptions={{ headerShown: false }} />
    </RequirePortalAccess>
  );
}
