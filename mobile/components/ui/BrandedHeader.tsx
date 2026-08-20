import { ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { colors, spacing, typography } from "@/constants/theme";

type BrandedHeaderProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  style?: ViewStyle;
  compact?: boolean;
};

export function BrandedHeader({ title, subtitle, right, style, compact = false }: BrandedHeaderProps) {
  return (
    <View style={[styles.row, compact ? styles.compact : null, style]}>
      <EliteTeeMark size={compact ? 38 : 42} />
      <View style={styles.copy}>
        <Text style={[styles.title, compact ? styles.titleCompact : null]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  compact: {
    marginBottom: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontFamily: typography.serifSemibold,
    fontSize: typography.h1,
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  titleCompact: {
    fontSize: typography.h2,
  },
  subtitle: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
