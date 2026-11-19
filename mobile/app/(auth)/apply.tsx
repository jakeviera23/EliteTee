import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { AgeAttestationCheckbox } from "@/components/auth/AgeAttestationCheckbox";
import { TermsAcceptanceCheckbox } from "@/components/auth/TermsAcceptanceCheckbox";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen, TextField } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/hooks/AuthProvider";
import { submitMembershipApplication } from "@/lib/api/membershipApplications";
import {
  EMPTY_MEMBERSHIP_APPLICATION,
  hasMembershipApplicationErrors,
  MEMBERSHIP_APPLICATION_ERROR_MESSAGE,
  MEMBERSHIP_APPLICATION_LIMITS,
  MEMBERSHIP_APPLICATION_SUCCESS_MESSAGE,
  type MembershipApplicationErrors,
  type MembershipApplicationField,
  type MembershipApplicationForm,
  validateMembershipApplication,
} from "@/lib/membershipApplication";
import {
  AGE_ATTESTATION_REQUIRED_MESSAGE,
  TERMS_ACCEPTANCE_REQUIRED_MESSAGE,
} from "@/lib/termsOfUse";

export default function ApplyScreen() {
  const router = useRouter();
  const { isConfigured, loading, status } = useAuth();
  const [form, setForm] = useState<MembershipApplicationForm>(EMPTY_MEMBERSHIP_APPLICATION);
  const [errors, setErrors] = useState<MembershipApplicationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);
  const [showAgeError, setShowAgeError] = useState(false);

  if (loading || status === "booting") {
    return <LoadingState label="Loading…" fullScreen />;
  }

  if (status === "terms_required") {
    return <Redirect href="/(auth)/terms-required" />;
  }

  if (status === "ready") {
    return <Redirect href="/(app)" />;
  }

  function updateField(field: MembershipApplicationField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  function goToSignIn() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/sign-in");
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitError(null);

    if (!confirmedAge) {
      setShowAgeError(true);
      setSubmitError(AGE_ATTESTATION_REQUIRED_MESSAGE);
      return;
    }

    if (!agreedToTerms) {
      setShowTermsError(true);
      setSubmitError(TERMS_ACCEPTANCE_REQUIRED_MESSAGE);
      return;
    }

    const nextErrors = validateMembershipApplication(form);
    setErrors(nextErrors);
    if (hasMembershipApplicationErrors(nextErrors)) {
      setSubmitError("Please complete the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await submitMembershipApplication(form);
      if (error) {
        setSubmitError(MEMBERSHIP_APPLICATION_ERROR_MESSAGE);
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError(
        "Unable to send your application. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Screen scroll={false} contentStyle={styles.centered}>
        <View style={styles.hero}>
          <EliteTeeMark size={56} />
          <Text style={styles.title}>Application received</Text>
          <Text style={styles.subtitle}>{MEMBERSHIP_APPLICATION_SUCCESS_MESSAGE}</Text>
        </View>
        <View style={styles.successCard}>
          <Text style={styles.successBody}>
            {`Our membership team reviews every request personally. If you're approved, we'll email ${form.email.trim().toLowerCase()} with a private invitation to set up your account. You can then sign in here.`}
          </Text>
        </View>
        <Button label="Back to sign in" onPress={goToSignIn} />
      </Screen>
    );
  }

  const fieldProps = (field: MembershipApplicationField) => ({
    value: form[field],
    onChangeText: (value: string) => updateField(field, value),
    editable: !submitting,
    maxLength: MEMBERSHIP_APPLICATION_LIMITS[field],
    style: errors[field] ? styles.inputError : undefined,
  });

  const fieldError = (field: MembershipApplicationField) =>
    errors[field] ? <Text style={styles.fieldError}>{errors[field]}</Text> : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.fill}
    >
      <Screen
        title="Request membership"
        subtitle="EliteTee is a curated golf community for serious golfers to share rounds, discover courses, and build trusted relationships through the game."
      >
        <Button
          label="Back to sign in"
          variant="ghost"
          onPress={goToSignIn}
          disabled={submitting}
          style={styles.back}
        />

        {!isConfigured ? (
          <Text style={styles.error}>
            Applications are temporarily unavailable in this build. Please email
            membership@elitetee.club.
          </Text>
        ) : null}

        <View style={styles.form}>
          <View>
            <TextField
              label="Full name"
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
              {...fieldProps("fullName")}
            />
            {fieldError("fullName")}
          </View>

          <View>
            <TextField
              label="Email"
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
              {...fieldProps("email")}
            />
            {fieldError("email")}
          </View>

          <View>
            <TextField
              label="Location"
              placeholder="City, State"
              textContentType="addressCityAndState"
              {...fieldProps("location")}
            />
            {fieldError("location")}
          </View>

          <View>
            <TextField
              label="Home course / where you play most"
              textContentType="organizationName"
              {...fieldProps("homeClub")}
            />
            {fieldError("homeClub")}
          </View>

          <View>
            <TextField
              label="Handicap (optional)"
              keyboardType="numbers-and-punctuation"
              {...fieldProps("handicap")}
            />
            {fieldError("handicap")}
          </View>

          <View>
            <TextField
              label="Instagram (optional)"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="@username"
              {...fieldProps("instagram")}
            />
            {fieldError("instagram")}
          </View>

          <View>
            <TextField
              label="What do you love most about golf?"
              multiline
              textAlignVertical="top"
              {...fieldProps("golfLove")}
              style={[styles.multiline, errors.golfLove ? styles.inputError : null]}
            />
            {fieldError("golfLove")}
          </View>

          <View>
            <TextField
              label="Why do you want to join EliteTee?"
              multiline
              textAlignVertical="top"
              {...fieldProps("whyJoin")}
              style={[styles.multilineTall, errors.whyJoin ? styles.inputError : null]}
            />
            {fieldError("whyJoin")}
          </View>
        </View>

        <AgeAttestationCheckbox
          checked={confirmedAge}
          disabled={submitting}
          showError={showAgeError && !confirmedAge}
          onChange={(next) => {
            setConfirmedAge(next);
            if (next) {
              setShowAgeError(false);
              if (submitError === AGE_ATTESTATION_REQUIRED_MESSAGE) setSubmitError(null);
            }
          }}
        />

        <TermsAcceptanceCheckbox
          checked={agreedToTerms}
          disabled={submitting}
          showError={showTermsError && !agreedToTerms}
          onChange={(next) => {
            setAgreedToTerms(next);
            if (next) {
              setShowTermsError(false);
              if (submitError === TERMS_ACCEPTANCE_REQUIRED_MESSAGE) setSubmitError(null);
            }
          }}
        />

        {submitError ? (
          <Text style={styles.error} accessibilityRole="alert">
            {submitError}
          </Text>
        ) : null}

        <Button
          label="Request membership"
          onPress={() => void handleSubmit()}
          loading={submitting}
          disabled={!isConfigured || !agreedToTerms || !confirmedAge}
        />

        <Text style={styles.footnote}>
          Submitting a request does not create an account. Approved applicants receive a private
          invitation by email.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.lg,
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: typography.serifSemibold,
    fontSize: 28,
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: typography.sans,
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  successCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.forestSoft,
    borderWidth: 1,
    borderColor: colors.forestBorder,
  },
  successBody: {
    fontFamily: typography.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  back: {
    alignSelf: "flex-start",
    paddingHorizontal: 0,
  },
  form: {
    gap: spacing.lg,
  },
  multiline: {
    minHeight: 96,
  },
  multilineTall: {
    minHeight: 128,
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    marginTop: spacing.xs,
    color: colors.error,
    fontFamily: typography.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.error,
    fontFamily: typography.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: typography.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
