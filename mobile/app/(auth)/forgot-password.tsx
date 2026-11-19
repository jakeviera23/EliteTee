import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/hooks/AuthProvider";
import { describeSiteHost } from "@/lib/auth/deepLinks";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const { loading, status, requestPasswordReset } = useAuth();
  const initialEmail = useMemo(() => {
    return typeof emailParam === "string" ? emailParam : "";
  }, [emailParam]);
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (loading || status === "booting") {
    return <LoadingState label="Restoring your session…" fullScreen />;
  }

  if (status === "ready") {
    return <Redirect href="/(app)" />;
  }

  if (status === "portal_pending") {
    return <Redirect href="/(auth)/portal-pending" />;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const result = await requestPasswordReset(email);
    setSubmitting(false);

    if (result.error) {
      if (result.error.kind === "network") {
        setError(result.error.message);
      } else if (result.error.kind === "rate_limited") {
        setError(result.error.message);
      } else {
        setError("We couldn't send a recovery email right now. Please try again shortly.");
      }
      return;
    }

    setSent(true);
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <View style={styles.hero}>
          <EliteTeeMark size={56} />
          <Text style={styles.title}>{sent ? "Check your email" : "Reset password"}</Text>
          <Text style={styles.subtitle}>
            {sent
              ? "If an EliteTee account exists for that email, a secure recovery link is on its way. Complete the reset on the web, then return here to sign in."
              : "Enter your member email and we'll send a secure recovery link. Password updates finish on the EliteTee website."}
          </Text>
        </View>

        {sent ? (
          <View style={styles.form}>
            <View style={styles.successCard}>
              <Text style={styles.successBody}>
                Open the email on this device, finish setting your new password on {describeSiteHost()},
                then sign in to the app.
              </Text>
            </View>
            <Button label="Back to sign in" onPress={() => router.replace("/(auth)/sign-in")} />
            <Button
              label="Send another link"
              variant="secondary"
              onPress={() => {
                setSent(false);
                setError(null);
              }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              editable={!submitting}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label="Send recovery link"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!email.trim()}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={8}
              style={styles.backWrap}
            >
              <Text style={styles.back}>Back to sign in</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.xxxl,
  },
  fill: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.xxxl,
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
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
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  form: {
    gap: spacing.md,
  },
  label: {
    fontFamily: typography.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.sans,
    fontSize: 16,
  },
  error: {
    color: colors.error,
    fontFamily: typography.sans,
    fontSize: 14,
    lineHeight: 20,
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
  backWrap: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
  },
  back: {
    fontFamily: typography.sansMedium,
    fontSize: 14,
    color: colors.forest,
  },
});
