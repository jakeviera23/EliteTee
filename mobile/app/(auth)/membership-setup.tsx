import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/hooks/AuthProvider";
import { logAuthError } from "@/lib/auth/authErrors";
import { describeSiteHost, openExternalEliteTeeUrl } from "@/lib/auth/deepLinks";
import { getInviteUrl, getPublicSiteUrl } from "@/lib/auth/siteUrls";

export default function MembershipSetupScreen() {
  const router = useRouter();
  const { loading, status, pendingInviteToken, clearInviteToken } = useAuth();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || status === "booting") {
    return <LoadingState label="Preparing membership setup…" fullScreen />;
  }

  if (status === "ready") {
    return <Redirect href="/(app)" />;
  }

  if (status === "portal_pending") {
    return <Redirect href="/(auth)/portal-pending" />;
  }

  if (!pendingInviteToken) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const inviteUrl = getInviteUrl(pendingInviteToken);

  async function handleOpenWeb() {
    setOpening(true);
    setError(null);
    try {
      await openExternalEliteTeeUrl(inviteUrl);
    } catch (openError) {
      logAuthError("open invite setup", openError);
      setError(`Unable to open ${describeSiteHost()}. Visit ${getPublicSiteUrl()} in your browser.`);
    } finally {
      setOpening(false);
    }
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <View style={styles.hero}>
        <EliteTeeMark size={56} />
        <Text style={styles.title}>Welcome to EliteTee</Text>
        <Text style={styles.subtitle}>
          Complete your EliteTee membership setup securely on the web.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.body}>
          Invitation signup, email confirmation, and first-time activation use the same secure web
          flow as the member portal. Open your invite, finish setup, then return to the app to sign
          in.
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Open EliteTee" onPress={() => void handleOpenWeb()} loading={opening} />
      <Button
        label="I already have an account"
        variant="secondary"
        onPress={() => router.replace("/(auth)/sign-in")}
      />
      <Button
        label="Clear invite and dismiss"
        variant="ghost"
        onPress={() => {
          void clearInviteToken().then(() => router.replace("/(auth)/sign-in"));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
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
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  body: {
    fontFamily: typography.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  error: {
    color: colors.error,
    fontFamily: typography.sans,
    fontSize: 14,
    lineHeight: 20,
  },
});
