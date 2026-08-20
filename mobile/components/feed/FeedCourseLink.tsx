import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { colors, typography } from "@/constants/theme";

type FeedCourseLinkProps = {
  courseSlug?: string | null;
  courseName: string;
  highlightRoundId?: string | null;
  style?: "title" | "headline";
};

export function FeedCourseLink({
  courseSlug,
  courseName,
  highlightRoundId,
  style = "headline",
}: FeedCourseLinkProps) {
  const router = useRouter();
  const normalizedSlug = courseSlug?.trim() ?? "";
  const roundId = highlightRoundId?.trim() ?? "";

  if (!courseName) return null;

  if (!normalizedSlug) {
    return (
      <Text style={style === "title" ? styles.title : styles.headline}>{courseName}</Text>
    );
  }

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/courses/[slug]",
          params: roundId
            ? { slug: normalizedSlug, highlightRoundId: roundId }
            : { slug: normalizedSlug },
        })
      }
      accessibilityRole="link"
      accessibilityLabel={`Open ${courseName}`}
    >
      <Text style={style === "title" ? styles.linkTitle : styles.linkHeadline}>{courseName}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: typography.serifSemibold,
    fontSize: typography.h3,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headline: {
    fontFamily: typography.serifSemibold,
    fontSize: typography.h3,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  linkTitle: {
    fontFamily: typography.serifSemibold,
    fontSize: typography.h3,
    color: colors.forest,
    letterSpacing: -0.3,
    textDecorationLine: "underline",
    textDecorationColor: colors.gold,
  },
  linkHeadline: {
    fontFamily: typography.serifSemibold,
    fontSize: typography.h3,
    color: colors.forest,
    letterSpacing: -0.3,
    textDecorationLine: "underline",
    textDecorationColor: colors.gold,
  },
});
