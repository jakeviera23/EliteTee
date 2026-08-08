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
  const canNavigate = Boolean(normalizedUserId);

  const navigateToProfile = () => {
    if (canNavigate) {
      router.push(`/members/${normalizedUserId}`);
    }
  };

  if (avatarOnly) {
    const avatar = <MemberAvatar name={name} imageUrl={avatarUrl} size={size} />;
    if (!canNavigate) return avatar;
    return (
      <Pressable
        onPress={navigateToProfile}
        style={({ pressed }) => [style, pressed ? styles.pressed : null]}
        accessibilityRole="button"
        accessibilityLabel={`View ${name}'s profile`}
      >
        {avatar}
      </Pressable>
    );
  }

  const content = (
    <View style={[styles.row, style]}>
      <MemberAvatar name={name} imageUrl={avatarUrl} size={size} />
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!canNavigate) {
    return content;
  }

  return (
    <Pressable
      onPress={navigateToProfile}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
      accessibilityRole="button"
      accessibilityLabel={`View ${name}'s profile`}
    >
      {content}
    </Pressable>
  );
}

export function buildMemberIdentitySubtitle(club: string, location: string) {
  return formatMemberContextLine([club, location]) || null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    fontFamily: typography.sansSemibold,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  pressed: {
    opacity: 0.88,
  },
});
