import { Stack } from "expo-router";
import { RequirePortalAccess } from "@/components/auth/RequirePortalAccess";

export default function IntroductionsLayout() {
  return (
    <RequirePortalAccess loadingLabel="Opening introductions…">
      <Stack screenOptions={{ headerShown: false }} />
    </RequirePortalAccess>
  );
}
