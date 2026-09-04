import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/constants/theme";
import {
  applyLikeToggle,
  applySaveToggle,
  formatFeedEngagementError,
  isPersistedFeedPostId,
  toggleFeedPostLike,
  toggleFeedPostSave,
} from "@/lib/feedPostEngagement";
import { buildFeedPostDeepLink, buildFeedPostShareText } from "@/lib/feedPostShare";
import type { MobileFeedPost } from "@/types/feed";

type FeedPostActionsProps = {
  post: MobileFeedPost;
  onEngagementChange?: (patch: Partial<MobileFeedPost>) => void;
  onCommentPress?: () => void;
  onToast?: (message: string) => void;
  compact?: boolean;
};

export function FeedPostActions({
  post,
  onEngagementChange,
  onCommentPress,
  onToast,
  compact = false,
}: FeedPostActionsProps) {
  const engagementEnabled = isPersistedFeedPostId(post.id);

  async function handleLike() {
    if (!engagementEnabled) return;

    const previous = { liked: post.isLiked, likeCount: post.likeCount };
    const optimistic = applyLikeToggle({ liked: post.isLiked, likeCount: post.likeCount });
    onEngagementChange?.({ isLiked: optimistic.liked, likeCount: optimistic.likeCount });

    const { liked, error } = await toggleFeedPostLike(post.id, previous.liked);
    if (error) {
      onEngagementChange?.({ isLiked: previous.liked, likeCount: previous.likeCount });
      onToast?.(formatFeedEngagementError(error));
      return;
    }
    onEngagementChange?.({ isLiked: liked });
  }

  async function handleSave() {
    if (!engagementEnabled) return;

    const previousSaved = post.isSaved;
    const optimisticSaved = applySaveToggle(post.isSaved);
    onEngagementChange?.({ isSaved: optimisticSaved });

    const { saved, error } = await toggleFeedPostSave(post.id, previousSaved);
    if (error) {
      onEngagementChange?.({ isSaved: previousSaved });
      onToast?.(formatFeedEngagementError(error));
      return;
    }
    onEngagementChange?.({ isSaved: saved });
    onToast?.(saved ? "Saved to your posts" : "Removed from saved");
  }

  async function handleShare() {
    const shareText = buildFeedPostShareText({
      authorName: post.authorName,
      courseName: post.headline,
      caption: post.message,
    });
    const shareUrl = buildFeedPostDeepLink(post.id);

    try {
      await Share.share({
        message: shareUrl ? `${shareText}\n${shareUrl}` : shareText,
        url: shareUrl ?? undefined,
      });
    } catch {
      // User dismissed share sheet.
    }
  }

  return (
    <View style={[styles.row, compact ? styles.rowCompact : null]}>
      <ActionButton
        icon={post.isLiked ? "heart" : "heart-outline"}
        label={post.likeCount > 0 ? String(post.likeCount) : "Appreciate"}
        active={post.isLiked}
        onPress={() => void handleLike()}
        disabled={!engagementEnabled}
      />
      <ActionButton
        icon="chatbubble-outline"
        label={post.commentCount > 0 ? String(post.commentCount) : "Comment"}
        onPress={onCommentPress}
        disabled={!engagementEnabled}
      />
      <ActionButton
        icon={post.isSaved ? "bookmark" : "bookmark-outline"}
        label={post.isSaved ? "Saved" : "Save"}
        active={post.isSaved}
        onPress={() => void handleSave()}
        disabled={!engagementEnabled}
      />
      <ActionButton icon="share-outline" label="Share" onPress={() => void handleShare()} />
    </View>
  );
}

function ActionButton({
  icon,
  label,
  active = false,
  disabled = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.action,
        active ? styles.actionActive : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
      hitSlop={6}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? colors.forest : colors.textSecondary}
      />
      <Text style={[styles.actionLabel, active ? styles.actionLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  rowCompact: {
    paddingTop: 0,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.bgInset,
  },
  actionActive: {
    backgroundColor: colors.forestSoft,
  },
  actionLabel: {
    fontFamily: typography.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionLabelActive: {
    color: colors.forest,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
});
