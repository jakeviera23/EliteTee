import { StyleSheet, View } from "react-native";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { colors, radii } from "@/constants/theme";

type ProfileCoverFallbackProps = {
  height?: number;
};

export function ProfileCoverFallback({ height = 140 }: ProfileCoverFallbackProps) {
  return (
    <View style={[styles.wrap, { height }]}>
      <View style={styles.overlay} />
      <View style={styles.markWrap}>
        <EliteTeeMark size={28} variant="dark" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.chromeBg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.forestSoft,
    opacity: 0.35,
  },
  markWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
