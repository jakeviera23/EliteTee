import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  fetchPortalNotificationFeed,
  type PortalNotificationItem,
} from "@/lib/portalNotificationCenter";
import {
  markIntroductionRequestsSeen,
  markNetworkActivitySeen,
} from "@/lib/portalNotificationsStorage";
import { formatMobileError } from "@/lib/errors";
import { useAuth } from "@/hooks/AuthProvider";

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<PortalNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { notifications, error: fetchError } = await fetchPortalNotificationFeed();
    setItems(notifications);
    setError(fetchError ? formatMobileError(fetchError) : null);
    setLoading(false);

    if (user?.id) {
      await markNetworkActivitySeen(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function handlePress(item: PortalNotificationItem) {
    if (user?.id && item.acknowledgeIntroductionRequestId) {
      await markIntroductionRequestsSeen(user.id, [item.acknowledgeIntroductionRequestId]);
    }

    if (item.messageTarget) {
      router.push({
        pathname: "/(app)/messages/[userId]",
        params: {
          userId: item.messageTarget.otherUserId,
          memberName: item.messageTarget.otherUserName,
        },
      });
      return;
    }

    if (item.introductionTarget) {
      router.push("/introductions");
      return;
    }

    if (item.courseTarget) {
      router.push(`/courses/${item.courseTarget.slug}`);
      return;
    }

    if (item.memberTarget) {
      router.push(`/members/${item.memberTarget.userId}`);
      return;
    }

    if (item.feedTarget) {
      router.push(`/feed/${item.feedTarget.postId}`);
      return;
    }
  }

  return (
    <Screen title="Notifications" subtitle="Messages, introductions, and network activity." branded compactHeader>
      <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={colors.forest} />
      </Pressable>

      {loading ? <LoadingState label="Loading notifications…" /> : null}

      {!loading && error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadNotifications()}>
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="You're all caught up" body="New messages and member activity will appear here." />
      ) : null}

      {!loading && !error ? (
        <View style={styles.list}>
          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onPress={() => void handlePress(item)}
              onMemberPress={(memberId) => router.push(`/members/${memberId}`)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginTop: -spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  errorBox: {
    padding: spacing.lg,
    backgroundColor: colors.errorSoft,
    borderRadius: radii.lg,
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.error,
  },
  retryLabel: {
    fontFamily: typography.sansMedium,
    fontSize: typography.bodySm,
    color: colors.forest,
  },
});
