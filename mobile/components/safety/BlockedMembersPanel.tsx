import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  listMyBlockedMembers,
  unblockMember,
  type BlockedMemberRow,
} from "@/lib/memberBlocks";

type BlockedMembersPanelProps = {
  onChanged?: () => void;
};

export function BlockedMembersPanel({ onChanged }: BlockedMembersPanelProps) {
  const [rows, setRows] = useState<BlockedMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listMyBlockedMembers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load blocked members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function performUnblock(row: BlockedMemberRow) {
    setPendingId(row.blocked_user_id);
    setError(null);
    try {
      await unblockMember(row.blocked_user_id);
      setRows((current) => current.filter((item) => item.block_id !== row.block_id));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unblock that member.");
    } finally {
      setPendingId(null);
    }
  }

  function confirmUnblock(row: BlockedMemberRow) {
    const name = row.full_name?.trim() || "this member";
    Alert.alert(`Unblock ${name}?`, "Their posts and profile will be visible to you again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Unblock", onPress: () => void performUnblock(row) },
    ]);
  }

  return (
    <View style={styles.root}>
      <Text style={styles.intro}>
        Members you block are hidden from your feed, comments, Discover, and messages.
      </Text>

      {loading ? <Text style={styles.status}>Loading blocked members…</Text> : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          <Button label="Try again" variant="ghost" onPress={() => void load()} />
        </View>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <Text style={styles.status}>You have not blocked anyone.</Text>
      ) : null}

      {rows.map((row) => {
        const name = row.full_name?.trim() || "Member";
        const meta = [row.primary_club, row.based_in]
          .map((value) => value?.trim())
          .filter(Boolean)
          .join(" · ");
        return (
          <View key={row.block_id} style={styles.row}>
            <MemberAvatar name={name} imageUrl={row.club_logo_url} size={44} />
            <View style={styles.rowCopy}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {meta ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {meta}
                </Text>
              ) : null}
            </View>
            <Button
              label={pendingId === row.blocked_user_id ? "Unblocking…" : "Unblock"}
              variant="secondary"
              compact
              disabled={pendingId === row.blocked_user_id}
              onPress={() => confirmUnblock(row)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  intro: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  status: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textTertiary,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.errorSoft,
    gap: spacing.xs,
  },
  error: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.error,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgSurface,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontFamily: typography.sansSemibold,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  meta: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textTertiary,
  },
});
