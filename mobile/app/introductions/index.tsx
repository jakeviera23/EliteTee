import { Redirect, useLocalSearchParams } from "expo-router";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

/**
 * Introductions UI retired. Keep the route so old deep links / notifications
 * do not crash — send members to Messages (or a specific thread when targeted).
 */
export default function IntroductionsScreen() {
  const params = useLocalSearchParams<{
    targetUserId?: string | string[];
    targetMemberName?: string | string[];
  }>();
  const targetUserId = firstParam(params.targetUserId);
  const targetMemberName = firstParam(params.targetMemberName);

  if (targetUserId) {
    return (
      <Redirect
        href={{
          pathname: "/(app)/messages/[userId]",
          params: {
            userId: targetUserId,
            memberName: targetMemberName || "Member",
          },
        }}
      />
    );
  }

  return <Redirect href="/(app)/messages" />;
}
