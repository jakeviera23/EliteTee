import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FeedCourseLink } from "@/components/feed/FeedCourseLink";
import { FeedPhotoGallery } from "@/components/feed/FeedPhotoGallery";
import { FeedPostActions } from "@/components/feed/FeedPostActions";
import {
  buildMemberIdentitySubtitle,
  MemberIdentityLink,
} from "@/components/member/MemberIdentityLink";
import { LoadingState } from "@/components/ui/LoadingState";
import { colors, layout, radii, spacing, typography } from "@/constants/theme";
import { fetchFeedPostById } from "@/lib/api/feed";
import { buildFeedMetaChips } from "@/lib/feedCardMeta";
import { formatCourseRatingDisplay } from "@/lib/courseRating";
import {
  createFeedPostComment,
  fetchFeedPostComments,
  formatFeedEngagementError,
  isPersistedFeedPostId,
} from "@/lib/feedPostEngagement";
import { cacheFeedPostSnapshot, findCachedFeedPost } from "@/lib/feedPostCache";
import { formatMobileError } from "@/lib/errors";
import type { MobileFeedComment, MobileFeedPost } from "@/types/feed";

export default function FeedPostDetailScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const normalizedPostId = typeof postId === "string" ? postId.trim() : "";

  const seededPost = useMemo(
    () => (normalizedPostId ? findCachedFeedPost(normalizedPostId) : null),
    [normalizedPostId],
  );

  const [post, setPost] = useState<MobileFeedPost | null>(seededPost);
  const [comments, setComments] = useState<MobileFeedComment[]>([]);
  const [loading, setLoading] = useState(() => !seededPost);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!normalizedPostId) return;

    const seeded = findCachedFeedPost(normalizedPostId);
    if (seeded) {
      setPost(seeded);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await fetchFeedPostById(normalizedPostId);

    if (data) {
      cacheFeedPostSnapshot(data);
      setPost(data);
      setError(null);
    } else if (!seeded) {
      setPost(null);
      setError(fetchError ? formatMobileError(fetchError.message) : "Post unavailable.");
    } else if (fetchError) {
      console.warn("[feed-detail] background refresh failed", fetchError.message);
    }

    setLoading(false);
    setRefreshing(false);
  }, [normalizedPostId]);

  const loadComments = useCallback(async () => {
    if (!normalizedPostId || !isPersistedFeedPostId(normalizedPostId)) return;
    setCommentsLoading(true);
    const { data, error: fetchError } = await fetchFeedPostComments(normalizedPostId);
    setComments(data);
    if (fetchError) {
      setCommentError(formatFeedEngagementError(fetchError));
    }
    setCommentsLoading(false);
  }, [normalizedPostId]);

  useEffect(() => {
    if (!normalizedPostId) return;
    void loadPost();
    void loadComments();
  }, [normalizedPostId, loadPost, loadComments]);

  async function handleSubmitComment() {
    if (!post || !commentDraft.trim() || submittingComment) return;

    setSubmittingComment(true);
    setCommentError(null);

    const { data, error: submitError } = await createFeedPostComment(post.id, commentDraft);
    setSubmittingComment(false);

    if (submitError || !data) {
      setCommentError(formatFeedEngagementError(submitError ?? new Error("Comment failed.")));
      return;
    }

    setComments((current) => [...current, data]);
    setPost((current) => {
      if (!current) return current;
      const next = { ...current, commentCount: current.commentCount + 1 };
      cacheFeedPostSnapshot(next);
      return next;
    });
    setCommentDraft("");
  }

  if (loading && !post) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState label="Loading post…" fullScreen />
      </SafeAreaView>
    );
  }

  if ((error && !post) || !post) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.toolbar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.forest} />
          </Pressable>
        </View>
        <Text style={styles.errorText}>{error ?? "Post unavailable."}</Text>
      </SafeAreaView>
    );
  }

  const identitySubtitle = buildMemberIdentitySubtitle(post.authorClub, post.authorLocation);
  const chips = buildFeedMetaChips(post);
  const ratingDisplay = formatCourseRatingDisplay(post.rating ?? null);
  const showPlayedWithInline =
    Boolean(post.playedWith?.trim()) &&
    !chips.some(
      (chip) => chip.label.toLowerCase() === "with" || chip.label.toLowerCase() === "played with",
    );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.toolbar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.forest} />
          </Pressable>
          <Text style={styles.toolbarTitle}>Post</Text>
          <View style={styles.toolbarSpacer} />
        </View>

        {refreshing ? <Text style={styles.refreshHint}>Updating…</Text> : null}

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <MemberIdentityLink
              userId={post.authorUserId}
              name={post.authorName}
              avatarUrl={post.authorAvatarUrl}
              subtitle={identitySubtitle}
              size={52}
            />
            <Text style={styles.timestamp}>{post.timestamp}</Text>
          </View>

          <Text style={styles.badge}>{post.badge}</Text>
          {post.headline && post.headline !== post.badge ? (
            <FeedCourseLink
              courseSlug={post.courseSlug}
              courseName={post.headline}
              highlightRoundId={post.memberCourseRoundId}
              style="headline"
            />
          ) : null}

          {chips.length > 0 ? (
            <View style={styles.chipRow}>
              {chips.map((chip) => (
                <View key={chip.key} style={styles.chip}>
                  <Text style={styles.chipLabel}>{chip.label}</Text>
                  <Text style={styles.chipValue}>{chip.value}</Text>
                </View>
              ))}
            </View>
          ) : ratingDisplay ? (
            <Text style={styles.rating}>Member rating {ratingDisplay}/10</Text>
          ) : null}

          <FeedPhotoGallery imageUrls={post.imageUrls} rating={post.rating} />

          <Text style={styles.message}>{post.message}</Text>
          {showPlayedWithInline ? (
            <Text style={styles.playedWith}>Played with {post.playedWith}</Text>
          ) : null}

          <FeedPostActions
            post={post}
            onEngagementChange={(patch) =>
              setPost((current) => {
                if (!current) return current;
                const next = { ...current, ...patch };
                cacheFeedPostSnapshot(next);
                return next;
              })
            }
            onCommentPress={() => undefined}
          />

          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Comments{post.commentCount > 0 ? ` · ${post.commentCount}` : ""}
            </Text>

            {commentsLoading ? (
              <Text style={styles.commentsStatus}>Loading comments…</Text>
            ) : null}

            {!commentsLoading && comments.length === 0 ? (
              <Text style={styles.commentsStatus}>No comments yet. Start the conversation.</Text>
            ) : null}

            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentRow}>
                <MemberIdentityLink
                  userId={comment.userId}
                  name={comment.authorName}
                  avatarUrl={comment.authorAvatarUrl}
                  size={36}
                  avatarOnly
                />
                <View style={styles.commentBody}>
                  <View style={styles.commentMeta}>
                    {comment.userId ? (
                      <Pressable onPress={() => router.push(`/members/${comment.userId}`)}>
                        <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                    )}
                    {comment.displayTimestamp ? (
                      <Text style={styles.commentTime}>{comment.displayTimestamp}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.commentText}>{comment.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.composer}>
          {commentError ? <Text style={styles.commentError}>{commentError}</Text> : null}
          <View style={styles.composerRow}>
            <TextInput
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textTertiary}
              style={styles.composerInput}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={() => void handleSubmitComment()}
              disabled={submittingComment || !commentDraft.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                pressed ? styles.pressed : null,
                submittingComment || !commentDraft.trim() ? styles.sendDisabled : null,
              ]}
            >
              <Text style={styles.sendLabel}>{submittingComment ? "…" : "Post"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  fill: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.pagePadding,
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
  toolbarTitle: {
    flex: 1,
    fontFamily: typography.serifSemibold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: "center",
  },
  toolbarSpacer: {
    width: 36,
  },
  refreshHint: {
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.xs,
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  content: {
    paddingHorizontal: layout.pagePadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
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
  },
  rating: {
    fontFamily: typography.sansMedium,
    fontSize: typography.bodySm,
    color: colors.gold,
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
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgInset,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 1,
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
    lineHeight: 24,
    color: colors.textSecondary,
  },
  playedWith: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textTertiary,
  },
  commentsSection: {
    marginTop: spacing.md,
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
  },
  commentsTitle: {
    fontFamily: typography.sansSemibold,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  commentsStatus: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    color: colors.textTertiary,
  },
  commentRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  commentAuthor: {
    fontFamily: typography.sansSemibold,
    fontSize: typography.bodySm,
    color: colors.textPrimary,
  },
  commentTime: {
    fontFamily: typography.sans,
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  commentText: {
    fontFamily: typography.sans,
    fontSize: typography.bodySm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: layout.pagePadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.sans,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sendButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.forest,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendLabel: {
    fontFamily: typography.sansSemibold,
    fontSize: 14,
    color: colors.ivory,
  },
  commentError: {
    fontFamily: typography.sans,
    fontSize: 13,
    color: colors.error,
  },
  errorText: {
    paddingHorizontal: layout.pagePadding,
    fontFamily: typography.sans,
    fontSize: typography.body,
    color: colors.error,
  },
  pressed: {
    opacity: 0.9,
  },
});
