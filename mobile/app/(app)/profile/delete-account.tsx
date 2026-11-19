import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen, TextField } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/hooks/AuthProvider";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  ACCOUNT_DELETION_MESSAGES,
  isDeletionConfirmationValid,
} from "@/lib/accountDeletion";

const DELETED_ITEMS = [
  "Your member profile, photos, and cover image",
  "Feed posts, round reviews, comments, likes, and saves",
  "Course rounds and round photos",
  "Direct messages and photo attachments, including conversations with other members",
  "Introduction requests, referral code, and EliteTee Concierge history",
  "Your sign-in and login credentials",
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, deleteAccount, signOut } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const confirmed = isDeletionConfirmationValid(confirmation);

  async function handleDelete() {
    if (!confirmed || deleting) return;
    setDeleting(true);
    setError(null);

    try {
      const outcome = await deleteAccount();
      if (outcome.kind === "deleted") return;
      setSessionExpired(outcome.kind === "session_expired");
      setError(outcome.message);
    } catch {
      setError(ACCOUNT_DELETION_MESSAGES.unknown);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.fill}
    >
      <Screen title="Delete account" subtitle="Permanently remove your EliteTee membership data.">
        <Button
          label="Back"
          variant="ghost"
          onPress={() => router.back()}
          disabled={deleting}
          style={styles.back}
        />

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>This cannot be undone</Text>
          <Text style={styles.body}>
            Deleting your account permanently removes it from EliteTee
            {user?.email ? ` (${user.email})` : ""}. You will be signed out on this device and
            will not be able to sign in again with this account.
          </Text>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>What gets deleted</Text>
          {DELETED_ITEMS.map((item) => (
            <View key={item} style={styles.listRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listItem}>{item}</Text>
            </View>
          ))}
          <Text style={styles.footnote}>
            Your original membership application is kept only in anonymized form (name, email, and
            answers removed) so our admission records stay consistent. To rejoin later, you would
            need to apply again.
          </Text>
        </View>

        <TextField
          label={`Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm`}
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          editable={!deleting}
          placeholder={ACCOUNT_DELETION_CONFIRMATION}
          accessibilityLabel={`Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm account deletion`}
        />

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {sessionExpired ? (
          <Button label="Sign in again" variant="secondary" onPress={() => void signOut()} />
        ) : (
          <Button
            label="Permanently delete account"
            variant="destructive"
            onPress={() => void handleDelete()}
            loading={deleting}
            disabled={!confirmed}
          />
        )}

        <Button
          label="Cancel"
          variant="secondary"
          onPress={() => router.back()}
          disabled={deleting}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  back: {
    alignSelf: "flex-start",
    paddingHorizontal: 0,
  },
  warningCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  warningTitle: {
    fontFamily: typography.sansSemibold,
    fontSize: 16,
    color: colors.error,
  },
  body: {
    fontFamily: typography.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  listCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgSurface,
  },
  listTitle: {
    fontFamily: typography.sansSemibold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  listRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  bullet: {
    fontFamily: typography.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  listItem: {
    flex: 1,
    fontFamily: typography.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  footnote: {
    marginTop: spacing.xs,
    fontFamily: typography.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  error: {
    color: colors.error,
    fontFamily: typography.sans,
    fontSize: 14,
    lineHeight: 20,
  },
});
