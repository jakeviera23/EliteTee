import { useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen, TextField } from "@/components/ui/Screen";
import { colors, typography } from "@/constants/theme";
import { createComposerFeedPost } from "@/lib/api/feedPosts";
import { getFeedComposerValidation } from "@/lib/feedComposerValidation";
import { formatMobileError } from "@/lib/errors";

export type ComposerConfig = {
  title: string;
  subtitle: string;
  composerPostType: "looking-for-game" | "traveling" | "general";
  internalPostType: "played-today" | "golf-travel";
  badge: string;
  headlineFallback: string;
  primaryKey?: "location" | "destination";
  primaryLabel?: string;
  fields: { key: string; label: string; placeholder: string; optional?: boolean }[];
};

type ComposerFeedScreenProps = {
  config: ComposerConfig;
};

export function ComposerFeedScreen({ config }: ComposerFeedScreenProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const primaryValue = config.primaryKey ? fieldValues[config.primaryKey] ?? "" : "";

  const validation = useMemo(
    () =>
      getFeedComposerValidation({
        message,
        primaryFieldValue: primaryValue,
        primaryFieldLabel: config.primaryLabel,
        requiresPrimaryField: Boolean(config.primaryKey),
        requiresRating: false,
      }),
    [message, primaryValue, config.primaryKey, config.primaryLabel],
  );

  async function handleSubmit() {
    if (!validation.canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);

    const details = config.fields
      .map((field) => ({
        label: field.label,
        value: fieldValues[field.key]?.trim() ?? "",
      }))
      .filter((detail) => detail.value);

    const { error: postError } = await createComposerFeedPost({
      composerPostType: config.composerPostType,
      internalPostType: config.internalPostType,
      message: message.trim(),
      headline: primaryValue.trim() || config.headlineFallback,
      badge: config.badge,
      details,
    });

    setSubmitting(false);

    if (postError) {
      setError(formatMobileError(postError.message));
      return;
    }

    setSuccess(true);
    setTimeout(() => router.replace("/(app)"), 600);
  }

  return (
    <Screen title={config.title} subtitle={config.subtitle}>
      <Button label="Back" variant="ghost" onPress={() => router.back()} />

      {config.fields.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          value={fieldValues[field.key] ?? ""}
          onChangeText={(value) =>
            setFieldValues((current) => ({ ...current, [field.key]: value }))
          }
          placeholder={field.placeholder}
          multiline={field.key === "message"}
          style={field.key === "message" ? styles.messageInput : undefined}
          textAlignVertical={field.key === "message" ? "top" : undefined}
        />
      ))}

      <TextField
        label="Message"
        value={message}
        onChangeText={setMessage}
        placeholder="Share enough detail for members to respond…"
        multiline
        style={styles.messageInput}
        textAlignVertical="top"
      />
      <Text style={styles.counter}>{validation.characterCounterLabel}</Text>

      {validation.blockerMessage && message.length > 0 ? (
        <Text style={styles.hint}>{validation.blockerMessage}</Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>Posted to the member feed.</Text> : null}

      <Button
        label={submitting ? "Posting…" : "Post"}
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!validation.canSubmit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  messageInput: {
    minHeight: 140,
  },
  counter: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
    textAlign: "right",
  },
  hint: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textTertiary,
  },
  errorText: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.error,
  },
  successText: {
    fontFamily: typography.sansMedium,
    fontSize: typography.bodySm,
    color: colors.forest,
  },
});
