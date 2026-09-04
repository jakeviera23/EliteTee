import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { InviteGolfer } from "@/components/referrals/InviteGolfer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { formatMemberContextLine, formatPrimaryClubLine, isMeaningfulDisplayValue } from "@/lib/display";
import { getMemberDisplayName } from "@/lib/memberInitials";
import { computeProfileCompleteness } from "@/lib/profileCompleteness";
import { useAuth } from "@/hooks/AuthProvider";

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const displayName = getMemberDisplayName(profile?.full_name);
  const memberMeta = formatMemberContextLine([
    formatPrimaryClubLine(profile?.primary_club),
    profile?.based_in,
  ]);
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
            {displayName ? <Text style={styles.name}>{displayName}</Text> : null}
            {memberMeta ? <Text style={styles.meta}>{memberMeta}</Text> : null}
            {isMeaningfulDisplayValue(profile?.industry) ? (
              <Text style={styles.detail}>{profile!.industry}</Text>
            ) : null}
            {profile?.founding_member_number ? (
              <Text style={styles.founding}>Founding Member #{profile.founding_member_number}</Text>
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
          <Text style={styles.completenessTitle}>
            Profile {completeness.percent}% complete
          </Text>
          <Text style={styles.completenessBody}>
            Add {completeness.missingLabels.slice(0, 2).join(" and ")}
            {completeness.missingLabels.length > 2 ? " to strengthen your profile." : "."}
          </Text>
        </Pressable>
      ) : null}

      {user?.id ? (
        <Button
          label="View full profile"
          onPress={() => router.push(`/members/${user.id}`)}
        />
      ) : null}

      <Pressable onPress={() => router.push("/(app)/profile/edit")} style={styles.linkRow}>
        <Text style={styles.linkLabel}>Edit profile</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/courses")} style={styles.linkRow}>
        <Text style={styles.linkLabel}>Courses</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/introductions")} style={styles.linkRow}>
        <Text style={styles.linkLabel}>Introductions</Text>
      </Pressable>

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
  name: {
    fontFamily: typography.serifSemibold,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  meta: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textSecondary,
  },
  detail: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textTertiary,
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
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
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
  linkRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHairline,
  },
  linkLabel: {
    fontFamily: typography.sansMedium,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
});
