import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { colors, spacing, typography } from "@/constants/theme";
import { formatMemberContextLine } from "@/lib/display";

type MemberIdentityLinkProps = {
  userId?: string | null;
  name: string;
  avatarUrl?: string | null;
  subtitle?: string | null;
  size?: number;
  style?: ViewStyle;
  avatarOnly?: boolean;
};

export function MemberIdentityLink({
  userId,
  name,
  avatarUrl,
  subtitle,
  size = 44,
  style,
  avatarOnly = false,
}: MemberIdentityLinkProps) {
  const router = useRouter();
  const normalizedUserId = userId?.trim() ?? "";
  const displayName = name.trim() || "Member";
  const canNavigate = Boolean(normalizedUserId);

  const navigateToProfile = () => {
    if (canNavigate) {
      router.push(`/members/${normalizedUserId}`);
    }
  };

  if (avatarOnly) {
    const avatar = <MemberAvatar name={displayName} imageUrl={avatarUrl} size={size} />;
    if (!canNavigate) return avatar;
    return (
      <Pressable
        onPress={navigateToProfile}
        style={({ pressed }) => [style, pressed ? styles.pressed : null]}
        accessibilityRole="button"
        accessibilityLabel={`View ${displayName}'s profile`}
        hitSlop={6}
      >
        {avatar}
      </Pressable>
    );
  }

  const content = (
    <View style={styles.row}>
      <MemberAvatar name={displayName} imageUrl={avatarUrl} size={size} />
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {displayName}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!canNavigate) {
    return <View style={[styles.pressable, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={navigateToProfile}
      style={({ pressed }) => [styles.pressable, style, pressed ? styles.pressed : null]}
      accessibilityRole="button"
      accessibilityLabel={`View ${displayName}'s profile`}
      hitSlop={6}
    >
      {content}
    </Pressable>
  );
}

export function buildMemberIdentitySubtitle(club: string, location: string) {
  return formatMemberContextLine([club, location]) || null;
}

const styles = StyleSheet.create({
  /** Required so name text isn't crushed to 0 width beside the timestamp. */
  pressable: {
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minWidth: 0,
    width: "100%",
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
    fontFamily: typography.sansSemibold,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  subtitle: {
    flexShrink: 1,
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  pressed: {
    opacity: 0.88,
  },
});
