import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";
import {
  AGE_ATTESTATION_REQUIRED_MESSAGE,
  ELITETEE_MIN_MEMBER_AGE,
} from "@/lib/termsOfUse";

type AgeAttestationCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  showError?: boolean;
};

export function AgeAttestationCheckbox({
  checked,
  onChange,
  disabled = false,
  showError = false,
}: AgeAttestationCheckboxProps) {
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
          I confirm that I am at least {ELITETEE_MIN_MEMBER_AGE} years old and eligible for EliteTee
          membership.
        </Text>
      </Pressable>
      {showError ? <Text style={styles.error}>{AGE_ATTESTATION_REQUIRED_MESSAGE}</Text> : null}
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
  error: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.error,
  },
});
