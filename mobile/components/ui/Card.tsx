import { ReactNode } from "react";
import { StyleSheet, Text, View, ViewProps } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";

type CardProps = ViewProps & {
  children: ReactNode;
  padded?: boolean;
  variant?: "surface" | "elevated";
};

export function Card({ children, padded = true, variant = "surface", style, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === "elevated" ? styles.elevated : styles.surface,
        padded ? styles.padded : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  surface: {
    backgroundColor: colors.bgSurface,
  },
  elevated: {
    backgroundColor: colors.bgElevated,
  },
  padded: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.serifSemibold,
    fontSize: typography.h3,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
});
