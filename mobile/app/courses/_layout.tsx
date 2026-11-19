import { Stack } from "expo-router";
import { RequirePortalAccess } from "@/components/auth/RequirePortalAccess";

export default function CoursesLayout() {
  return (
    <RequirePortalAccess loadingLabel="Opening courses…">
      <Stack screenOptions={{ headerShown: false }} />
    </RequirePortalAccess>
  );
}
