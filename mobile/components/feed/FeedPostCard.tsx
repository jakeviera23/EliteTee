import { useState } from "react";
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
import { colors, spacing, typography } from "@/constants/theme";
import type { MobileFeedPost } from "@/types/feed";

type FeedPostCardProps = {
  post: MobileFeedPost;
  onPostChange?: (post: MobileFeedPost) => void;
  onToast?: (message: string) => void;
  showActions?: boolean;
};

export function FeedPostCard({
  post: initialPost,
  onPostChange,
  onToast,
  showActions = true,
}: FeedPostCardProps) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);

  function updatePost(patch: Partial<MobileFeedPost>) {
    setPost((current) => {
      const next = { ...current, ...patch };
      onPostChange?.(next);
      return next;
    });
  }

  function openDetail() {
    router.push(`/feed/${post.id}`);
  }

  const identitySubtitle = buildMemberIdentitySubtitle(post.authorClub, post.authorLocation);
  const showHeadline = post.headline && post.headline !== post.badge;

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

      <Text style={styles.badge}>{post.badge}</Text>
      {showHeadline ? (
        <FeedCourseLink
          courseSlug={post.courseSlug}
          courseName={post.headline}
          style="headline"
        />
      ) : null}

      <Pressable onPress={openDetail} style={({ pressed }) => [pressed ? styles.pressed : null]}>
        <FeedPhotoGallery imageUrls={post.imageUrls} rating={post.rating} />

        <Text style={styles.message} numberOfLines={6}>
          {post.message}
        </Text>
        {post.playedWith ? (
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
    gap: spacing.md,
    alignItems: "flex-start",
  },
  timestamp: {
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
