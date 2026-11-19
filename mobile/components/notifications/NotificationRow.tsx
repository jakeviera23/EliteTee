import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { colors, radii, spacing, typography } from "@/constants/theme";
import type { PortalNotificationItem } from "@/lib/portalNotificationCenter";

const KIND_ICONS: Partial<
  Record<PortalNotificationItem["kind"], keyof typeof Ionicons.glyphMap>
> = {
  unread_message: "mail-outline",
  introduction_pending: "hand-left-outline",
  introduction_accepted: "checkmark-circle-outline",
  introduction_declined: "close-circle-outline",
  comment: "chatbubble-outline",
  like: "heart-outline",
  game_request: "flag-outline",
  travel_match: "airplane-outline",
  course_activity: "flag-outline",
};

type NotificationRowProps = {
  item: PortalNotificationItem;
  onPress: () => void;
  onMemberPress?: (userId: string) => void;
};

export function NotificationRow({ item, onPress, onMemberPress }: NotificationRowProps) {
  const isUnread = item.countsTowardBadge;
  const iconName = KIND_ICONS[item.kind] ?? "notifications-outline";
  const showAvatar = Boolean(item.memberName?.trim());
  const memberUserId = item.memberTarget?.userId ?? item.actorUserId ?? "";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isUnread ? styles.rowUnread : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {showAvatar ? (
        memberUserId && onMemberPress ? (
          <Pressable
            onPress={() => onMemberPress(memberUserId)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.memberName}'s profile`}
          >
            <MemberAvatar
              name={item.memberName}
              imageUrl={item.avatarImageUrl}
              size={40}
            />
          </Pressable>
        ) : (
          <MemberAvatar
            name={item.memberName}
            imageUrl={item.avatarImageUrl}
            size={40}
          />
        )
      ) : (
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={18} color={colors.forest} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.typeLabel, isUnread ? styles.typeLabelUnread : null]}>
            {item.typeLabel}
          </Text>
          {item.timestampLabel ? (
            <Text style={styles.timestamp}>{item.timestampLabel}</Text>
          ) : null}
        </View>
        <Text style={[styles.description, isUnread ? styles.descriptionUnread : null]} numberOfLines={2}>
          {item.description}
        </Text>
      </View>

      {isUnread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  rowUnread: {
    backgroundColor: colors.forestSoft,
    borderColor: colors.forestBorder,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.forestSoft,
    borderWidth: 1,
    borderColor: colors.forestBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  typeLabel: {
    flex: 1,
    fontFamily: typography.sansMedium,
    fontSize: typography.caption,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textTertiary,
  },
  typeLabelUnread: {
    color: colors.gold,
  },
  timestamp: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  description: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  descriptionUnread: {
    fontFamily: typography.sansMedium,
    color: colors.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.forest,
    marginTop: 6,
  },
});
