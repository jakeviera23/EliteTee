import { useRouter } from "expo-router";
import { BlockedMembersPanel } from "@/components/safety/BlockedMembersPanel";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";

export default function BlockedMembersScreen() {
  const router = useRouter();

  return (
    <Screen title="Blocked members" subtitle="Manage members you have blocked.">
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
      <BlockedMembersPanel />
    </Screen>
  );
}
