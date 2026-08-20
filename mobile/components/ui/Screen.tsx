import { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandedHeader } from "@/components/ui/BrandedHeader";
import { colors, layout, radii, spacing, typography } from "@/constants/theme";

type ScreenProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  headerRight?: ReactNode;
  contentStyle?: ViewStyle;
  chromeHeader?: boolean;
  branded?: boolean;
  compactHeader?: boolean;
};

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  headerRight,
  contentStyle,
  chromeHeader = false,
  branded = false,
  compactHeader = false,
}: ScreenProps) {
  const content = (
    <>
      {title ? (
        branded ? (
          <BrandedHeader
            title={title}
            subtitle={subtitle}
            right={headerRight}
            compact={compactHeader}
          />
        ) : (
          <View style={[styles.headerRow, chromeHeader ? styles.chromeHeader : null]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, chromeHeader ? styles.chromeTitle : null]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, chromeHeader ? styles.chromeSubtitle : null]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {headerRight}
          </View>
        )
      ) : null}
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
};

export function TextField({ label, hint, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, style]}
        {...props}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  content: {
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  fill: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chromeHeader: {
    backgroundColor: colors.chromeBg,
    marginHorizontal: -layout.pagePadding,
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.chromeBorder,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: typography.serifSemibold,
    fontSize: typography.h1,
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  chromeTitle: {
    color: colors.chromeText,
  },
  subtitle: {
    fontFamily: typography.sans,
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  chromeSubtitle: {
    color: colors.chromeMuted,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: typography.sansMedium,
    fontSize: typography.label,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  fieldHint: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  input: {
    minHeight: layout.inputMinHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: typography.sans,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
});
