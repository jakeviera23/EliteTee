import { Pressable, StyleSheet, Text, View } from "react-native";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  formatMemberContextLine,
  formatPrimaryClubLine,
  isMeaningfulDisplayValue,
} from "@/lib/display";
import { selectInterestChips, truncateDiscoverText } from "@/lib/discoverDirectory";
import { getMemberDisplayName } from "@/lib/memberInitials";
import { formatProfileIndustryForDisplay } from "@/lib/portalProfileDisplay";
import type { MobileMemberProfile } from "@/types/member";

type MemberCardProps = {
  member: MobileMemberProfile;
  onPress?: () => void;
  /** Deterministic match reason for Suggested rails only. */
  matchReason?: string | null;
};

export function MemberCard({ member, onPress, matchReason }: MemberCardProps) {
  const memberName = getMemberDisplayName(member.full_name);
  const clubLine = formatPrimaryClubLine(member.primary_club);
  const context = formatMemberContextLine([clubLine, member.based_in]);
  const lookingFor = isMeaningfulDisplayValue(member.current_request)
    ? truncateDiscoverText(member.current_request, 88)
    : "";
  const travel = isMeaningfulDisplayValue(member.traveling_to)
    ? member.traveling_to.trim()
    : "";
  const interests = selectInterestChips(member, 3);
  const industry = formatProfileIndustryForDisplay(member.industry || "");
  const founding = isMeaningfulDisplayValue(member.founding_member_number)
    ? member.founding_member_number!.trim()
    : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.row}>
        <MemberAvatar name={memberName || "E"} imageUrl={member.club_logo_url} size={52} />
        <View style={styles.body}>
          <View style={styles.nameRow}>
            {memberName ? (
              <Text style={styles.name} numberOfLines={1}>
                {memberName}
              </Text>
            ) : null}
            {member.is_verified ? <Text style={styles.badge}>Verified</Text> : null}
            {founding ? <Text style={styles.founding}>#{founding}</Text> : null}
          </View>
          {context ? (
            <Text style={styles.meta} numberOfLines={2}>
              {context}
            </Text>
          ) : null}
          {lookingFor ? (
            <Text style={styles.lookingFor} numberOfLines={1}>
              Looking for · {lookingFor}
            </Text>
          ) : null}
          {travel ? (
            <Text style={styles.travel} numberOfLines={1}>
              Traveling to {travel}
            </Text>
          ) : null}
          {interests.length > 0 ? (
            <View style={styles.chipRow}>
              {interests.map((interest) => (
                <View key={interest} style={styles.chip}>
                  <Text style={styles.chipLabel} numberOfLines={1}>
                    {interest}
                  </Text>
                </View>
              ))}
            </View>
          ) : industry ? (
            <Text style={styles.detail} numberOfLines={1}>
              {industry}
            </Text>
          ) : null}
          {matchReason ? (
            <View style={styles.reasonChip}>
              <Text style={styles.reasonLabel} numberOfLines={1}>
                {matchReason}
              </Text>
            </View>
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
    alignItems: "flex-start",
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  name: {
    fontFamily: typography.sansSemibold,
    fontSize: 16,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  badge: {
    fontFamily: typography.sansMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.forest,
  },
  founding: {
    fontFamily: typography.sansMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.gold,
  },
  meta: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textSecondary,
  },
  lookingFor: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textSecondary,
  },
  travel: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
  },
  detail: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textTertiary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 2,
  },
  chip: {
    maxWidth: "100%",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgInset,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  chipLabel: {
    fontFamily: typography.sans,
    fontSize: 11,
    color: colors.textSecondary,
  },
  reasonChip: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.forestBorder,
    backgroundColor: colors.forestSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  reasonLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 11,
    color: colors.forest,
  },
});
