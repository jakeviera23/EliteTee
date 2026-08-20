import { useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { CourseTypeahead } from "@/components/create/CourseTypeahead";
import { Button } from "@/components/ui/Button";
import { Screen, TextField } from "@/components/ui/Screen";
import { colors, typography } from "@/constants/theme";
import { createComposerFeedPost } from "@/lib/api/feedPosts";
import { getFeedComposerValidation } from "@/lib/feedComposerValidation";
import { formatMobileError } from "@/lib/errors";
import { invalidateSessionCache, SESSION_CACHE_KEYS } from "@/lib/sessionCache";
import { formatGolfCourseLocation, type MobileGolfCourse } from "@/types/course";

export type ComposerConfig = {
  title: string;
  subtitle: string;
  composerPostType: "looking-for-game" | "traveling" | "general";
  internalPostType: "played-today" | "golf-travel";
  badge: string;
  headlineFallback: string;
  primaryKey?: "location" | "destination";
  primaryLabel?: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    optional?: boolean;
    kind?: "text" | "course" | "course-list" | "dates";
  }[];
};

type ComposerFeedScreenProps = {
  config: ComposerConfig;
};

export function ComposerFeedScreen({ config }: ComposerFeedScreenProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [selectedCourse, setSelectedCourse] = useState<MobileGolfCourse | null>(null);
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
    if (!validation.canSubmit || submitting || success) return;

    setSubmitting(true);
    setError(null);

    const details = config.fields
      .map((field) => {
        let value = fieldValues[field.key]?.trim() ?? "";
        if (field.kind === "course" && selectedCourse) {
          const location = formatGolfCourseLocation(selectedCourse);
          value = location ? `${selectedCourse.name} · ${location}` : selectedCourse.name;
        }
        return {
          label: field.label,
          value,
        };
      })
      .filter((detail) => detail.value);

    const headline =
      (config.primaryKey === "location" && selectedCourse
        ? selectedCourse.name
        : primaryValue.trim()) || config.headlineFallback;

    const { error: postError } = await createComposerFeedPost({
      composerPostType: config.composerPostType,
      internalPostType: config.internalPostType,
      message: message.trim(),
      headline,
      badge: config.badge,
      details,
    });

    setSubmitting(false);

    if (postError) {
      setError(formatMobileError(postError.message));
      return;
    }

    invalidateSessionCache(SESSION_CACHE_KEYS.homeFeed);
    setSuccess(true);
    setTimeout(() => router.replace("/(app)"), 600);
  }

  return (
    <Screen title={config.title} subtitle={config.subtitle}>
      <Button label="Back" variant="ghost" onPress={() => router.back()} disabled={submitting} />

      {config.fields.map((field) => {
        if (field.kind === "course") {
          return (
            <CourseTypeahead
              key={field.key}
              label={field.label}
              value={fieldValues[field.key] ?? ""}
              onChangeText={(value) =>
                setFieldValues((current) => ({ ...current, [field.key]: value }))
              }
              selectedCourse={selectedCourse}
              onSelectCourse={setSelectedCourse}
              placeholder={field.placeholder}
            />
          );
        }

        if (field.kind === "course-list") {
          return (
            <CourseTypeahead
              key={field.key}
              label={field.label}
              value={fieldValues[field.key] ?? ""}
              onChangeText={(value) =>
                setFieldValues((current) => ({ ...current, [field.key]: value }))
              }
              selectedCourse={null}
              onSelectCourse={() => undefined}
              placeholder={field.placeholder}
              appendMode
            />
          );
        }

        return (
          <TextField
            key={field.key}
            label={field.label}
            value={fieldValues[field.key] ?? ""}
            onChangeText={(value) =>
              setFieldValues((current) => ({ ...current, [field.key]: value }))
            }
            placeholder={field.placeholder}
            hint={
              field.kind === "dates"
                ? "Free text for now — e.g. Apr 12–14 or next weekend."
                : undefined
            }
          />
        );
      })}

      <TextField
        label="Message"
        value={message}
        onChangeText={setMessage}
        placeholder="Share enough detail for members to respond…"
        multiline
        style={styles.messageInput}
        textAlignVertical="top"
        editable={!submitting && !success}
      />
      <Text style={styles.counter}>{validation.characterCounterLabel}</Text>

      {validation.blockerMessage && message.length > 0 ? (
        <Text style={styles.hint}>{validation.blockerMessage}</Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>Posted to the member feed.</Text> : null}

      <Button
        label={submitting ? "Posting…" : success ? "Posted" : "Post"}
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!validation.canSubmit || success}
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
