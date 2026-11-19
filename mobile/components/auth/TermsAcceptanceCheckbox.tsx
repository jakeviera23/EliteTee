import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";
import { openEliteTeeInAppBrowser } from "@/lib/auth/inAppBrowser";
import { getPrivacyPolicyUrl, getTermsOfUseUrl } from "@/lib/termsAcceptance";
import { TERMS_ACCEPTANCE_REQUIRED_MESSAGE } from "@/lib/termsOfUse";

type TermsAcceptanceCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  showError?: boolean;
};

export function TermsAcceptanceCheckbox({
  checked,
  onChange,
  disabled = false,
  showError = false,
}: TermsAcceptanceCheckboxProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={() => onChange(!checked)}
        style={styles.row}
      >
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked ? <Text style={styles.tick}>✓</Text> : null}
        </View>
        <Text style={styles.copy}>
          I agree to the{" "}
          <Text
            style={styles.link}
            onPress={() => {
              void openEliteTeeInAppBrowser(getTermsOfUseUrl());
            }}
          >
            Terms of Use
          </Text>{" "}
          and{" "}
          <Text
            style={styles.link}
            onPress={() => {
              void openEliteTeeInAppBrowser(getPrivacyPolicyUrl());
            }}
          >
            Privacy Policy
          </Text>
          , including rules prohibiting objectionable content and abusive behavior.
        </Text>
      </Pressable>
      {showError ? <Text style={styles.error}>{TERMS_ACCEPTANCE_REQUIRED_MESSAGE}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  box: {
    width: 22,
    height: 22,
    marginTop: 2,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.borderHairline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSurface,
  },
  boxChecked: {
    borderColor: colors.forest,
    backgroundColor: colors.forest,
  },
  tick: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
  copy: {
    flex: 1,
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  link: {
    color: colors.forest,
    textDecorationLine: "underline",
  },
  error: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.error,
  },
});
