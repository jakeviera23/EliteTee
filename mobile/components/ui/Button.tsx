import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { colors, layout, radii, spacing, typography } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "chrome";

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  compact?: boolean;
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  compact = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : null,
        styles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" || variant === "chrome" ? colors.textInverse : colors.forest}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label` as const]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.buttonMinHeight,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  compact: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.forest,
    borderWidth: 1,
    borderColor: colors.forestBorder,
  },
  secondary: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  chrome: {
    backgroundColor: colors.gold,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: typography.sansMedium,
    fontSize: typography.label,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  primaryLabel: {
    color: colors.textInverse,
  },
  secondaryLabel: {
    color: colors.forest,
  },
  ghostLabel: {
    color: colors.gold,
    textTransform: "none",
    letterSpacing: 0.2,
    fontSize: typography.bodySm,
  },
  chromeLabel: {
    color: colors.chromeBg,
  },
});
