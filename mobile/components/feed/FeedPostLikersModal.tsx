import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { colors, radii, spacing, typography } from "@/constants/theme";
import type { MobileFeedPostLiker } from "@/lib/feedPostEngagement";

type FeedPostLikersModalProps = {
  visible: boolean;
  loading: boolean;
  errorMessage: string | null;
  likers: MobileFeedPostLiker[];
  onClose: () => void;
  onRetry: () => void;
};

export function FeedPostLikersModal({
  visible,
  loading,
  errorMessage,
  likers,
  onClose,
  onRetry,
}: FeedPostLikersModalProps) {
  const router = useRouter();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Liked by</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.status}>
              <ActivityIndicator color={colors.forest} />
              <Text style={styles.statusText}>Loading likes…</Text>
            </View>
          ) : null}

          {!loading && errorMessage ? (
            <View style={styles.status}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable onPress={onRetry} style={styles.retryButton}>
                <Text style={styles.retryLabel}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {!loading && !errorMessage && likers.length === 0 ? (
            <Text style={styles.statusText}>No likes yet.</Text>
          ) : null}

          {!loading && !errorMessage && likers.length > 0 ? (
            <FlatList
              data={likers}
              keyExtractor={(item) => item.userId}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
                  onPress={() => {
                    onClose();
                    router.push(`/members/${item.userId}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.name}`}
                >
                  <MemberAvatar name={item.name} imageUrl={item.avatarUrl} size={40} />
                  <View style={styles.rowText}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.displayTimestamp ? (
                      <Text style={styles.time}>{item.displayTimestamp}</Text>
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    maxHeight: "70%",
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderHairline,
  },
  title: {
    fontFamily: typography.sansMedium,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  close: {
    fontFamily: typography.sansMedium,
    fontSize: typography.caption,
    color: colors.forest,
  },
  status: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  statusText: {
    fontFamily: typography.sans,
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    padding: spacing.xl,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: typography.body,
    color: colors.textPrimary,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.forestSoft,
  },
  retryLabel: {
    fontFamily: typography.sansMedium,
    fontSize: typography.caption,
    color: colors.forest,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontFamily: typography.sansMedium,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  time: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  pressed: {
    opacity: 0.85,
  },
});
