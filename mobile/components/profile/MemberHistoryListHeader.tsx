import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { EliteTeeMark } from "@/components/brand/EliteTeeMark";
import { colors, layout, radii, spacing, typography } from "@/constants/theme";

type MemberHistoryListHeaderProps = {
  title: string;
  subtitle?: string;
};

export function MemberHistoryListHeader({ title, subtitle }: MemberHistoryListHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.forest} />
        </Pressable>
        <EliteTeeMark size={42} />
        <View style={styles.toolbarSpacer} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  toolbarSpacer: {
    width: 36,
  },
  title: {
    fontFamily: typography.serifSemibold,
    fontSize: 28,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
