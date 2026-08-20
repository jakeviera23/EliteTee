import { Pressable, StyleSheet, Text, View } from "react-native";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { formatMemberContextLine, formatPrimaryClubLine, isMeaningfulDisplayValue } from "@/lib/display";
import { getMemberDisplayName } from "@/lib/memberInitials";
import type { MobileMemberProfile } from "@/types/member";

type MemberCardProps = {
  member: MobileMemberProfile;
  onPress?: () => void;
};

export function MemberCard({ member, onPress }: MemberCardProps) {
  const memberName = getMemberDisplayName(member.full_name);
  const clubLine = formatPrimaryClubLine(member.primary_club);
  const context = formatMemberContextLine([clubLine, member.based_in]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.row}>
        <MemberAvatar name={memberName || "E"} imageUrl={member.club_logo_url} size={52} />
        <View style={styles.body}>
          {memberName ? (
            <Text style={styles.name} numberOfLines={1}>
              {memberName}
            </Text>
          ) : null}
          {context ? (
            <Text style={styles.meta} numberOfLines={2}>
              {context}
            </Text>
          ) : null}
          {isMeaningfulDisplayValue(member.industry) ? (
            <Text style={styles.detail} numberOfLines={1}>
              {member.industry}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.92,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  name: {
    fontFamily: typography.sansSemibold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textSecondary,
  },
  detail: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textTertiary,
  },
});
