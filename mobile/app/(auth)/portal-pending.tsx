import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/hooks/AuthProvider";

export default function PortalPendingScreen() {
  const { loading, session, hasPortalAccess, signOut } = useAuth();

  if (!loading && !session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!loading && session && hasPortalAccess) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <View style={styles.hero}>
        <EliteTeeMark size={56} />
        <Text style={styles.title}>Portal access pending</Text>
        <Text style={styles.subtitle}>
          Your login is active, but member portal access has not been enabled yet.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.body}>
          If you were recently approved, sign out and back in, or open your private invitation link
          on the web to finish setup. Invite redemption is compatible with the same EliteTee member
          accounts used on web.
        </Text>
      </View>

      <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.xl,
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
});
