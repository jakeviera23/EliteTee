import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { TermsAcceptanceCheckbox } from "@/components/auth/TermsAcceptanceCheckbox";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/hooks/AuthProvider";
import { TERMS_GATE_LEAD, TERMS_GATE_TITLE } from "@/lib/termsOfUse";

export default function TermsRequiredScreen() {
  const { loading, status, acceptTerms, signOut } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || status === "booting") {
    return <LoadingState label="Checking membership terms…" fullScreen />;
  }

  if (status === "signed_out") {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (status !== "terms_required") {
    if (status === "ready") return <Redirect href="/(app)" />;
    if (status === "portal_pending") return <Redirect href="/(auth)/portal-pending" />;
    return <Redirect href="/(auth)/sign-in" />;
  }

  async function handleContinue() {
    if (!agreed) {
      setShowError(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await acceptTerms();
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message);
    }
  }

  return (
    <Screen scroll contentStyle={styles.screen}>
      <View style={styles.hero}>
        <EliteTeeMark size={56} />
        <Text style={styles.title}>{TERMS_GATE_TITLE}</Text>
        <Text style={styles.lead}>{TERMS_GATE_LEAD}</Text>
      </View>

      <View style={styles.card}>
        <TermsAcceptanceCheckbox
          checked={agreed}
          disabled={submitting}
          showError={showError && !agreed}
          onChange={(next) => {
            setAgreed(next);
            if (next) setShowError(false);
          }}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={submitting ? "Saving…" : "Agree and continue"}
          onPress={() => void handleContinue()}
          loading={submitting}
          disabled={submitting}
        />
        <Button
          label="Sign out"
          variant="secondary"
          onPress={() => void signOut()}
          disabled={submitting}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.xl,
    justifyContent: "center",
  },
  hero: {
    gap: spacing.sm,
    alignItems: "center",
  },
  title: {
    fontFamily: typography.serif,
    fontSize: typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
  },
  lead: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  error: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.error,
  },
});
