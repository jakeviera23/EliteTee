import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { FeedCourseLink } from "@/components/feed/FeedCourseLink";
import { FeedPhotoGallery } from "@/components/feed/FeedPhotoGallery";
import { FeedPostActions } from "@/components/feed/FeedPostActions";
import {
  buildMemberIdentitySubtitle,
  MemberIdentityLink,
} from "@/components/member/MemberIdentityLink";
import { Card } from "@/components/ui/Card";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { buildFeedMetaChips, type FeedMetaChip } from "@/lib/feedCardMeta";
import { cacheFeedPostSnapshot } from "@/lib/feedPostCache";
import type { MobileFeedPost } from "@/types/feed";

type FeedPostCardProps = {
  post: MobileFeedPost;
  onPostChange?: (post: MobileFeedPost) => void;
  onToast?: (message: string) => void;
  showActions?: boolean;
};

function chipToneStyle(tone: FeedMetaChip["tone"]) {
  switch (tone) {
    case "location":
      return styles.chipLocation;
    case "date":
      return styles.chipDate;
    case "rating":
      return styles.chipRating;
    case "positive":
      return styles.chipPositive;
    case "emphasis":
      return styles.chipEmphasis;
    default:
      return styles.chipNeutral;
  }
}

export function FeedPostCard({
  post,
  onPostChange,
  onToast,
  showActions = true,
}: FeedPostCardProps) {
  const router = useRouter();
  const chips = buildFeedMetaChips(post);
  const identitySubtitle = buildMemberIdentitySubtitle(post.authorClub, post.authorLocation);
  const showHeadline = post.headline && post.headline !== post.badge;
  const showPlayedWithInline =
    Boolean(post.playedWith?.trim()) &&
    !chips.some(
      (chip) => chip.label.toLowerCase() === "with" || chip.label.toLowerCase() === "played with",
    );

  function updatePost(patch: Partial<MobileFeedPost>) {
    const next = { ...post, ...patch };
    cacheFeedPostSnapshot(next);
    onPostChange?.(next);
  }

  function openDetail() {
    cacheFeedPostSnapshot(post);
    router.push(`/feed/${post.id}`);
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <MemberIdentityLink
          userId={post.authorUserId}
          name={post.authorName}
          avatarUrl={post.authorAvatarUrl}
          subtitle={identitySubtitle}
          size={44}
        />
        <Text style={styles.timestamp}>{post.timestamp}</Text>
      </View>

      <Pressable
        onPress={openDetail}
        accessibilityRole="button"
        accessibilityLabel="Open post"
        style={({ pressed }) => [pressed ? styles.pressed : null]}
      >
        <Text style={styles.badge}>{post.badge}</Text>
      </Pressable>

      {showHeadline ? (
        <FeedCourseLink
          courseSlug={post.courseSlug}
          courseName={post.headline}
          highlightRoundId={post.memberCourseRoundId}
          style="headline"
        />
      ) : null}

      {chips.length > 0 ? (
        <Pressable
          onPress={openDetail}
          accessibilityRole="button"
          accessibilityLabel="Open post details"
          style={({ pressed }) => [styles.chipRow, pressed ? styles.pressed : null]}
        >
          {chips.map((chip) => (
            <View key={chip.key} style={[styles.chip, chipToneStyle(chip.tone)]}>
              <Text style={styles.chipLabel}>{chip.label}</Text>
              <Text style={styles.chipValue}>{chip.value}</Text>
            </View>
          ))}
        </Pressable>
      ) : null}

      {/* Gallery stays outside the post-body press target so lightbox/swipe stay independent. */}
      <FeedPhotoGallery imageUrls={post.imageUrls} rating={post.rating} />

      <Pressable
        onPress={openDetail}
        accessibilityRole="button"
        accessibilityLabel="Open post"
        style={({ pressed }) => [pressed ? styles.pressed : null]}
      >
        <Text style={styles.message} numberOfLines={6}>
          {post.message}
        </Text>
        {showPlayedWithInline ? (
          <Text style={styles.playedWith}>Played with {post.playedWith}</Text>
        ) : null}
      </Pressable>

      {showActions ? (
        <FeedPostActions
          post={post}
          onEngagementChange={updatePost}
          onCommentPress={openDetail}
          onToast={onToast}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  timestamp: {
    flexShrink: 0,
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
    paddingTop: 2,
  },
  badge: {
    alignSelf: "flex-start",
    fontFamily: typography.sansMedium,
    fontSize: typography.caption,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    maxWidth: "100%",
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 1,
  },
  chipNeutral: {
    backgroundColor: colors.bgInset,
    borderColor: colors.borderHairline,
  },
  chipLocation: {
    backgroundColor: colors.forestSoft,
    borderColor: colors.forestBorder,
  },
  chipDate: {
    backgroundColor: colors.goldSofter,
    borderColor: colors.borderAccent,
  },
  chipRating: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.borderAccent,
  },
  chipPositive: {
    backgroundColor: colors.forestSoft,
    borderColor: colors.forestBorder,
  },
  chipEmphasis: {
    backgroundColor: colors.bgInset,
    borderColor: colors.borderSubtle,
  },
  chipLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textTertiary,
  },
  chipValue: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.textPrimary,
  },
  message: {
    fontFamily: typography.sans,
    fontSize: typography.body,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  playedWith: {
    marginTop: spacing.sm,
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textTertiary,
  },
  pressed: {
    opacity: 0.96,
  },
});
