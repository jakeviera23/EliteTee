import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { createGeneralFeedPost } from "@/lib/api/feedPosts";
import { getFeedComposerValidation } from "@/lib/feedComposerValidation";
import { formatMobileError } from "@/lib/errors";
import { invalidateSessionCache, SESSION_CACHE_KEYS } from "@/lib/sessionCache";

export default function PostUpdateScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validation = useMemo(
    () =>
      getFeedComposerValidation({
        message,
        requiresPrimaryField: false,
        requiresRating: false,
      }),
    [message],
  );

  async function handleSubmit() {
    if (!validation.canSubmit || submitting || success) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const { error: postError } = await createGeneralFeedPost(message);
    setSubmitting(false);

    if (postError) {
      setError(formatMobileError(postError.message));
      return;
    }

    invalidateSessionCache(SESSION_CACHE_KEYS.homeFeed);
    setSuccess(true);
    setTimeout(() => {
      router.replace("/(app)");
    }, 600);
  }

  return (
    <Screen title="Post Update" subtitle="Share a note with the member network.">
      <Button label="Back" variant="ghost" onPress={() => router.back()} />

      <View style={styles.field}>
        <Text style={styles.label}>Your update</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Share news, travel plans, or a question for the network…"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={styles.input}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{validation.characterCounterLabel}</Text>
      </View>

      {validation.blockerMessage && message.length > 0 ? (
        <Text style={styles.hint}>{validation.blockerMessage}</Text>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {success ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Posted to the member feed.</Text>
        </View>
      ) : null}

      <Button
        label={submitting ? "Posting…" : success ? "Posted" : "Post Update"}
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!validation.canSubmit || success}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 160,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgElevated,
    padding: spacing.lg,
    fontFamily: typography.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  counter: {
    fontFamily: typography.sans,
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "right",
  },
  hint: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textTertiary,
  },
  errorBox: {
    padding: spacing.lg,
    backgroundColor: colors.errorSoft,
    borderRadius: radii.lg,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: 14,
    color: colors.error,
  },
  successBox: {
    padding: spacing.lg,
    backgroundColor: colors.forestSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.forestBorder,
  },
  successText: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.forest,
  },
});
