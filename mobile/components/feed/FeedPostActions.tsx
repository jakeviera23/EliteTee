import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FeedPostLikersModal } from "@/components/feed/FeedPostLikersModal";
import { colors, spacing, typography } from "@/constants/theme";
import {
  applyLikeToggle,
  applySaveToggle,
  fetchFeedPostLikers,
  formatFeedEngagementError,
  isPersistedFeedPostId,
  toggleFeedPostLike,
  toggleFeedPostSave,
  type MobileFeedPostLiker,
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
  const [likersOpen, setLikersOpen] = useState(false);
  const [likersLoading, setLikersLoading] = useState(false);
  const [likersError, setLikersError] = useState<string | null>(null);
  const [likers, setLikers] = useState<MobileFeedPostLiker[]>([]);

  async function handleLike() {
    if (!engagementEnabled) return;

    const previous = { liked: post.isLiked, likeCount: post.likeCount };
    const optimistic = applyLikeToggle({ liked: post.isLiked, likeCount: post.likeCount });
    // Patch only — parent merges onto latest list state (avoids stale post snapshots).
    onEngagementChange?.({ isLiked: optimistic.liked, likeCount: optimistic.likeCount });

    const { liked, error } = await toggleFeedPostLike(post.id, previous.liked);
    if (error) {
      onEngagementChange?.({ isLiked: previous.liked, likeCount: previous.likeCount });
      onToast?.(formatFeedEngagementError(error));
      return;
    }

    // Avoid a second engagement write when the server agrees with optimistic UI.
    // Only correct if the persisted liked flag diverges.
    if (liked !== optimistic.liked) {
      onEngagementChange?.({
        isLiked: liked,
        likeCount: Math.max(0, previous.likeCount + (liked ? 1 : -1)),
      });
    }
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
    if (saved !== optimisticSaved) {
      onEngagementChange?.({ isSaved: saved });
    }
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

  async function loadLikers() {
    if (!engagementEnabled) return;
    setLikersLoading(true);
    setLikersError(null);
    const { data, error } = await fetchFeedPostLikers(post.id);
    if (error) {
      setLikers([]);
      setLikersError(formatFeedEngagementError(error));
      setLikersLoading(false);
      return;
    }
    setLikers(data);
    setLikersLoading(false);
  }

  function openLikers() {
    if (!engagementEnabled || post.likeCount <= 0) return;
    setLikersOpen(true);
    void loadLikers();
  }

  return (
    <View style={[styles.row, compact ? styles.rowCompact : null]}>
      <View style={[styles.action, post.isLiked ? styles.actionActive : null]}>
        <Pressable
          onPress={() => void handleLike()}
          disabled={!engagementEnabled}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={post.isLiked ? "Remove appreciation" : "Appreciate"}
          style={({ pressed }) => [
            styles.actionHit,
            pressed ? styles.pressed : null,
            !engagementEnabled ? styles.disabled : null,
          ]}
        >
          <Ionicons
            name={post.isLiked ? "heart" : "heart-outline"}
            size={18}
            color={post.isLiked ? colors.forest : colors.textSecondary}
          />
          {post.likeCount <= 0 ? (
            <Text style={[styles.actionLabel, post.isLiked ? styles.actionLabelActive : null]}>
              Appreciate
            </Text>
          ) : null}
        </Pressable>
        {post.likeCount > 0 ? (
          <Pressable
            onPress={openLikers}
            disabled={!engagementEnabled}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${post.likeCount} like${post.likeCount === 1 ? "" : "s"}. View who liked this post.`}
            style={({ pressed }) => [
              styles.actionHit,
              pressed ? styles.pressed : null,
              !engagementEnabled ? styles.disabled : null,
            ]}
          >
            <Text style={[styles.actionLabel, post.isLiked ? styles.actionLabelActive : null]}>
              {String(post.likeCount)}
            </Text>
          </Pressable>
        ) : null}
      </View>
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

      <FeedPostLikersModal
        visible={likersOpen}
        loading={likersLoading}
        errorMessage={likersError}
        likers={likers}
        onClose={() => setLikersOpen(false)}
        onRetry={() => void loadLikers()}
      />
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
    alignItems: "center",
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
  actionHit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 28,
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
