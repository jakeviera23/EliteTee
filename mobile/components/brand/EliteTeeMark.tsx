import { Image, ImageStyle, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, typography } from "@/constants/theme";

const markSource = require("../../assets/elitetee-logo-mark.png");

/** Source asset is 1024×682; size maps to rendered mark height. */
const MARK_ASPECT_RATIO = 1024 / 682;

type EliteTeeMarkProps = {
  size?: number;
  variant?: "light" | "dark";
  showWordmark?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
};

export function EliteTeeMark({
  size = 24,
  variant = "light",
  showWordmark = false,
  style,
  imageStyle,
}: EliteTeeMarkProps) {
  return (
    <View style={[styles.row, style]}>
      <Image
        source={markSource}
        style={[
          styles.mark,
          {
            width: size * MARK_ASPECT_RATIO,
            height: size,
          },
          variant === "dark" ? styles.markOnDark : null,
          imageStyle,
        ]}
        resizeMode="contain"
        accessibilityLabel="EliteTee"
      />
      {showWordmark ? (
        <Text style={[styles.wordmark, variant === "dark" ? styles.wordmarkOnDark : null]}>
          EliteTee
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mark: {
    tintColor: colors.forest,
  },
  markOnDark: {
    tintColor: colors.gold,
  },
  wordmark: {
    fontFamily: typography.serifSemibold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  wordmarkOnDark: {
    color: colors.chromeText,
  },
});
