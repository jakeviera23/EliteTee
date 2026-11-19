import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/hooks/AuthProvider";
import { logAuthError } from "@/lib/auth/authErrors";
import { describeSiteHost } from "@/lib/auth/deepLinks";
import { openEliteTeeInAppBrowser } from "@/lib/auth/inAppBrowser";
import { getInviteUrl, getLoginUrl } from "@/lib/auth/siteUrls";

export default function PortalPendingScreen() {
  const { loading, status, pendingInviteToken, signOut, refreshPortalAccess } = useAuth();
  const [opening, setOpening] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || status === "booting") {
    return <LoadingState label="Checking membership access…" fullScreen />;
  }

  if (status === "signed_out") {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (status === "terms_required") {
    return <Redirect href="/(auth)/terms-required" />;
  }

  if (status === "ready") {
    return <Redirect href="/(app)" />;
  }

  const accessCheckFailed = status === "access_check_failed";
  const setupUrl = pendingInviteToken ? getInviteUrl(pendingInviteToken) : getLoginUrl();

  async function handleOpenWeb() {
    setOpening(true);
    setError(null);
    try {
      await openEliteTeeInAppBrowser(setupUrl);
    } catch (openError) {
      logAuthError("open membership setup", openError);
      setError(`Unable to open ${describeSiteHost()}. Check your connection and try again.`);
      setOpening(false);
      return;
    }
    setOpening(false);
    // The sheet resolves when the member taps Done; pick up any activation they just finished.
    await handleRefresh();
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await refreshPortalAccess();
    } catch (refreshError) {
      logAuthError("refresh portal access", refreshError);
      setError("Unable to refresh membership status. Check your connection and try again.");
    } finally {
      setRefreshing(false);
    }
  }

  if (accessCheckFailed) {
    return (
      <Screen scroll={false} contentStyle={styles.screen}>
        <View style={styles.hero}>
          <EliteTeeMark size={56} />
          <Text style={styles.title}>Couldn’t verify access</Text>
          <Text style={styles.subtitle}>
            We couldn’t confirm your membership right now. This is usually a temporary network
            issue — your account was not marked as pending.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Try again"
          onPress={() => void handleRefresh()}
          loading={refreshing}
        />
        <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <View style={styles.hero}>
        <EliteTeeMark size={56} />
        <Text style={styles.title}>Finish membership setup</Text>
        <Text style={styles.subtitle}>
          Complete your EliteTee membership setup on a secure EliteTee page.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.body}>
          {pendingInviteToken
            ? "We found your invitation. Open EliteTee to finish account activation with the same invite link, then tap Done to return here."
            : "Your login is active, but portal access is not enabled yet. If you were recently approved, open EliteTee to finish setup, then tap Done to return here."}
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Open EliteTee" onPress={() => void handleOpenWeb()} loading={opening} />
      <Button
        label="I've finished setup"
        variant="secondary"
        onPress={() => void handleRefresh()}
        loading={refreshing}
      />
      <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
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
