import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CREATE_OPTIONS } from "@/constants/createOptions";
import { Screen } from "@/components/ui/Screen";
import { colors, radii, spacing, typography } from "@/constants/theme";

const OPTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "post-update": "create-outline",
  "share-round": "flag-outline",
  "looking-for-game": "people-outline",
  "golf-travel": "airplane-outline",
  "request-intro": "hand-left-outline",
  "ask-community": "chatbubbles-outline",
};

export default function CreateScreen() {
  const router = useRouter();

  return (
    <Screen title="Create" subtitle="Share with the member network." branded compactHeader>
      {CREATE_OPTIONS.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => {
            if (option.route) {
              router.push(option.route as never);
            }
          }}
          style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name={OPTION_ICONS[option.id] ?? "add-outline"}
              size={20}
              color={colors.forest}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{option.title}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {option.description}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.forestSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontFamily: typography.sansSemibold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: typography.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
