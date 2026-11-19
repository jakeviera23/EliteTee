import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { blockMember, formatMemberBlockError } from "@/lib/memberBlocks";
import { createSubmissionLock } from "@/lib/reportSubmissionLock";

type BlockMemberModalProps = {
  visible: boolean;
  memberUserId: string;
  memberName?: string;
  onClose: () => void;
  onBlocked?: () => void;
};

export function BlockMemberModal({
  visible,
  memberUserId,
  memberName = "this member",
  onClose,
  onBlocked,
}: BlockMemberModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitLockRef = useRef(createSubmissionLock());

  useEffect(() => {
    if (!visible) return;
    setSubmitting(false);
    setError(null);
    submitLockRef.current = createSubmissionLock();
  }, [visible, memberUserId]);

  async function handleBlock() {
    if (!memberUserId) return;

    const outcome = await submitLockRef.current.run(async () => {
      setSubmitting(true);
      setError(null);
      try {
        await blockMember(memberUserId);
        return { ok: true as const };
      } catch (err) {
        return { ok: false as const, err };
      } finally {
        setSubmitting(false);
      }
    });

    if (outcome.status === "ignored") return;

    if (outcome.result.ok) {
      onClose();
      onBlocked?.();
      return;
    }

    setError(formatMemberBlockError(outcome.result.err));
  }

  function handleRequestClose() {
    if (submitting || submitLockRef.current.isInFlight) return;
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleRequestClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleRequestClose}
          disabled={submitting}
          accessibilityLabel="Dismiss"
        />
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title}>Block {memberName}?</Text>
          <Text style={styles.body}>
            Their posts, comments, and profile will be hidden from you. Direct messaging will be
            blocked in both directions. You can unblock them later from Blocked Members.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" onPress={onClose} disabled={submitting} />
            <Button
              label={submitting ? "Blocking…" : "Block member"}
              variant="destructive"
              onPress={() => void handleBlock()}
              loading={submitting}
              disabled={!memberUserId || submitting}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(28, 33, 29, 0.55)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  dialog: {
    borderRadius: radii.lg,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.serifSemibold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  error: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.error,
  },
  actions: {
    gap: spacing.sm,
  },
});
