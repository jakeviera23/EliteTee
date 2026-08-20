import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { formatMobileError, isAuthError } from "@/lib/errors";
import { useAuth } from "@/hooks/AuthProvider";

const wordmarkSource = require("../../assets/elitetee-logo.png");

export default function SignInScreen() {
  const { isConfigured, loading, session, hasPortalAccess, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session && hasPortalAccess) {
    return <Redirect href="/(app)" />;
  }

  if (!loading && session && !hasPortalAccess) {
    return <Redirect href="/(auth)/portal-pending" />;
  }

  async function handleSignIn() {
    setSubmitting(true);
    setError(null);

    const result = await signIn(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(
        isAuthError(result.error)
          ? "Email or password is incorrect."
          : formatMobileError(result.error),
      );
    }
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <View style={styles.hero}>
          <Image source={wordmarkSource} style={styles.wordmark} resizeMode="contain" />
          <EliteTeeMark size={56} />
          <Text style={styles.tagline}>Private member access for discerning golfers.</Text>
        </View>

        {!isConfigured ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Configuration required</Text>
            <Text style={styles.noticeBody}>
              Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env.local
              using the same production project as the web portal.
            </Text>
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
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label="Sign in"
              onPress={handleSignIn}
              loading={submitting}
              disabled={!email.trim() || !password}
            />
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
  },
  wordmark: {
    width: 280,
    height: 54,
    tintColor: colors.forest,
  },
  tagline: {
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
  },
  notice: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.errorSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  noticeTitle: {
    fontFamily: typography.sansSemibold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  noticeBody: {
    fontFamily: typography.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
});
