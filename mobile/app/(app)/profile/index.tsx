import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { InviteGolfer } from "@/components/referrals/InviteGolfer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  formatPrimaryClubLine,
  isMeaningfulDisplayValue,
} from "@/lib/display";
import { getMemberDisplayName } from "@/lib/memberInitials";
import { formatProfileIndustryForDisplay } from "@/lib/portalProfileDisplay";
import { computeProfileCompleteness } from "@/lib/profileCompleteness";
import { useAuth } from "@/hooks/AuthProvider";

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const displayName = getMemberDisplayName(profile?.full_name);
  const locationLine = isMeaningfulDisplayValue(profile?.based_in)
    ? profile!.based_in.trim()
    : "";
  const homeClub = formatPrimaryClubLine(profile?.primary_club);
  const industry = formatProfileIndustryForDisplay(profile?.industry || "");
  const completeness = computeProfileCompleteness(profile);
  const showCompleteness = Boolean(profile) && !completeness.isComplete;

  return (
    <Screen title="Profile" subtitle="Your member identity in EliteTee." branded compactHeader>
      <Card>
        <View style={styles.identityRow}>
          <MemberAvatar
            name={displayName || "You"}
            imageUrl={profile?.club_logo_url}
            size={72}
          />
          <View style={styles.identityCopy}>
            <Text style={styles.eyebrow}>Member profile</Text>
            {displayName ? (
              <Text style={styles.name} numberOfLines={2}>
                {displayName}
              </Text>
            ) : null}
            {profile?.is_verified ? <Text style={styles.verified}>Verified golfer</Text> : null}
            {industry ? (
              <Text style={styles.detail} numberOfLines={1}>
                {industry}
              </Text>
            ) : null}
            {locationLine ? (
              <Text style={styles.meta} numberOfLines={1}>
                {locationLine}
              </Text>
            ) : null}
            {homeClub ? (
              <Text style={styles.meta} numberOfLines={1}>
                Home club · {homeClub}
              </Text>
            ) : null}
            {profile?.founding_member_number ? (
              <Text style={styles.founding}>
                Founding Member · #{profile.founding_member_number}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>

      <InviteGolfer />

      {showCompleteness ? (
        <Pressable
          onPress={() => router.push("/(app)/profile/edit")}
          style={({ pressed }) => [styles.completenessCard, pressed ? styles.pressed : null]}
        >
          <Text style={styles.completenessTitle}>Finish your profile</Text>
          <Text style={styles.completenessBody}>
            Add {completeness.missingLabels.slice(0, 2).join(" and ")}
            {completeness.missingLabels.length > 2 ? " to help members know you." : "."}
          </Text>
        </Pressable>
      ) : null}

      {user?.id ? (
        <Button label="View full profile" onPress={() => router.push(`/members/${user.id}`)} />
      ) : null}

      <View style={styles.linkList}>
        <Pressable onPress={() => router.push("/(app)/profile/edit")} style={styles.linkRow}>
          <Text style={styles.linkLabel}>Edit profile</Text>
          <Text style={styles.linkChevron}>›</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/courses")} style={styles.linkRow}>
          <Text style={styles.linkLabel}>Courses</Text>
          <Text style={styles.linkChevron}>›</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/introductions")} style={[styles.linkRow, styles.linkRowLast]}>
          <Text style={styles.linkLabel}>Introductions</Text>
          <Text style={styles.linkChevron}>›</Text>
        </Pressable>
      </View>

      <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identityRow: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: typography.sansMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.gold,
  },
  name: {
    fontFamily: typography.serifSemibold,
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  verified: {
    fontFamily: typography.sansMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.forest,
  },
  meta: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textSecondary,
  },
  detail: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textPrimary,
  },
  founding: {
    marginTop: spacing.xs,
    fontFamily: typography.sansMedium,
    fontSize: typography.caption,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.gold,
  },
  completenessCard: {
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.forestBorder,
    backgroundColor: colors.forestSoft,
    gap: spacing.xs,
  },
  completenessTitle: {
    fontFamily: typography.sansSemibold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  completenessBody: {
    fontFamily: typography.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.92,
  },
  linkList: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgSurface,
    overflow: "hidden",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHairline,
  },
  linkRowLast: {
    borderBottomWidth: 0,
  },
  linkLabel: {
    fontFamily: typography.sansMedium,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  linkChevron: {
    fontFamily: typography.sans,
    fontSize: 22,
    lineHeight: 22,
    color: colors.textTertiary,
  },
});
