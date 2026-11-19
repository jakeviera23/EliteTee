import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { fetchMemberReferralInvite, fetchMemberReferralStats } from "@/lib/api/referrals";
import { formatMobileError } from "@/lib/errors";

type InviteGolferProps = {
  /** Compact layout for Discover; full layout for Profile. */
  variant?: "compact" | "full";
};

export function InviteGolfer({ variant = "full" }: InviteGolferProps) {
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const loadReferral = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [inviteResult, statsResult] = await Promise.all([
      fetchMemberReferralInvite(),
      fetchMemberReferralStats(),
    ]);

    if (inviteResult.error) {
      setError(formatMobileError(inviteResult.error.message));
      setReferralUrl(null);
    } else {
      setReferralUrl(inviteResult.data?.referralUrl ?? null);
    }

    if (!statsResult.error && statsResult.data) {
      setPendingCount(statsResult.data.pendingCount);
      setJoinedCount(statsResult.data.joinedCount);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  async function handleCopyLink() {
    if (!referralUrl) return;
    await Clipboard.setStringAsync(referralUrl);
    setCopyMessage("Link copied");
    setTimeout(() => setCopyMessage(null), 2000);
  }

  async function handleShare() {
    if (!referralUrl) return;
    setSharing(true);
    try {
      await Share.share({
        message: `Join me on EliteTee — a curated golf community for serious golfers.\n\n${referralUrl}`,
        url: referralUrl,
      });
    } finally {
      setSharing(false);
    }
  }

  if (loading) {
    return (
      <Card style={variant === "compact" ? styles.compactCard : undefined}>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.forest} />
          <Text style={styles.loadingLabel}>Loading invite link…</Text>
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={variant === "compact" ? styles.compactCard : undefined}>
        <Text style={styles.title}>Invite a Golfer</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button label="Try again" variant="secondary" compact onPress={() => void loadReferral()} />
      </Card>
    );
  }

  return (
    <Card style={variant === "compact" ? styles.compactCard : undefined}>
      <Text style={styles.title}>Invite a Golfer</Text>
      <Text style={styles.body}>
        EliteTee grows through golfers you trust. Invite someone you{"'"}d genuinely want to meet, play
        with, or have in the network.
      </Text>

      {referralUrl ? (
        <Pressable
          onPress={() => void handleCopyLink()}
          style={({ pressed }) => [styles.urlBox, pressed ? styles.pressed : null]}
        >
          <Text style={styles.urlLabel}>Your invite link</Text>
          <Text style={styles.urlText} selectable>
            {referralUrl}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={copyMessage ?? "Copy Link"}
          variant="secondary"
          compact
          disabled={!referralUrl}
          onPress={() => void handleCopyLink()}
        />
        <Button
          label="Share"
          compact
          disabled={!referralUrl}
          loading={sharing}
          onPress={() => void handleShare()}
        />
      </View>

      <Text style={styles.stats}>
        {pendingCount} Pending · {joinedCount} Joined
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    marginBottom: spacing.md,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingLabel: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textSecondary,
  },
  title: {
    fontFamily: typography.serifSemibold,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    lineHeight: 21,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  urlBox: {
    borderWidth: 1,
    borderColor: colors.borderHairline,
    borderRadius: radii.md,
    backgroundColor: colors.bgInset,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  urlLabel: {
    fontFamily: typography.sansMedium,
    fontSize: typography.caption,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textTertiary,
  },
  urlText: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.forest,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stats: {
    fontFamily: typography.sansMedium,
    fontSize: typography.bodySm,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.error,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
});
