import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/ui/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  CONTENT_REPORT_REASONS,
  formatContentReportError,
  submitContentReport,
  type ContentReportReason,
  type ContentReportTargetType,
} from "@/lib/contentReports";

type ReportContentModalProps = {
  visible: boolean;
  targetType: ContentReportTargetType;
  targetId: string;
  targetLabel?: string;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function ReportContentModal({
  visible,
  targetType,
  targetId,
  targetLabel = "this content",
  onClose,
  onSubmitted,
}: ReportContentModalProps) {
  const [reason, setReason] = useState<ContentReportReason>("harassment");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason("harassment");
      setDetails("");
      setError(null);
      setSuccess(false);
      setSubmitting(false);
    }
  }, [visible, targetId]);

  async function handleSubmit() {
    if (submitting || !targetId) return;
    setSubmitting(true);
    setError(null);

    try {
      await submitContentReport({ targetType, targetId, reason, details });
      setSuccess(true);
      onSubmitted?.();
    } catch (err) {
      setError(formatContentReportError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View style={styles.dialog} accessibilityViewIsModal>
          {success ? (
            <>
              <Text style={styles.title}>Report submitted</Text>
              <Text style={styles.body}>
                Thank you. EliteTee administrators have been notified and will review this report.
                We aim to review reports promptly; response timing depends on operator
                availability.
              </Text>
              <View style={styles.actions}>
                <Button label="Close" onPress={onClose} />
              </View>
            </>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.form}
            >
              <Text style={styles.title}>Report {targetLabel}</Text>
              <Text style={styles.body}>
                Reports help keep EliteTee safe. Choose a reason and optionally add context for
                moderators.
              </Text>

              <View style={styles.reasons} accessibilityRole="radiogroup">
                {CONTENT_REPORT_REASONS.map((option) => {
                  const selected = reason === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setReason(option.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={styles.reasonRow}
                    >
                      <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text style={styles.reasonLabel}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Additional details (optional)</Text>
              <TextInput
                value={details}
                onChangeText={setDetails}
                multiline
                maxLength={2000}
                placeholder="Add context for moderators"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
                textAlignVertical="top"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.actions}>
                <Button label="Cancel" variant="secondary" onPress={onClose} disabled={submitting} />
                <Button
                  label={submitting ? "Submitting…" : "Submit report"}
                  onPress={() => void handleSubmit()}
                  loading={submitting}
                  disabled={!targetId}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: "90%",
    borderRadius: radii.lg,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    padding: spacing.lg,
    gap: spacing.md,
  },
  form: {
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
  reasons: {
    gap: spacing.xs,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: colors.forest,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.forest,
  },
  reasonLabel: {
    flex: 1,
    fontFamily: typography.sans,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontFamily: typography.sansMedium,
    fontSize: typography.label,
    color: colors.textSecondary,
  },
  input: {
    minHeight: 96,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.sans,
    fontSize: 15,
    color: colors.textPrimary,
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
