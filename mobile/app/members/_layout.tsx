import { Stack } from "expo-router";
import { RequirePortalAccess } from "@/components/auth/RequirePortalAccess";

export default function MembersLayout() {
  return (
    <RequirePortalAccess loadingLabel="Opening member profile…">
      <Stack screenOptions={{ headerShown: false }} />
    </RequirePortalAccess>
  );
}
