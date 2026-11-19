import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { colors, spacing, typography } from "@/constants/theme";

type LoadingStateProps = {
  label?: string;
  fullScreen?: boolean;
};

export function LoadingState({ label = "Loading…", fullScreen = false }: LoadingStateProps) {
  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : null]}>
      <EliteTeeMark size={104} />
      <ActivityIndicator color={colors.forest} size="small" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  label: {
    fontFamily: typography.sans,
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
