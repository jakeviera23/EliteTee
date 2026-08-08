import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComposerPostType, FeedPost } from "../../data/portalSocial";
import { getFounderWelcomePost } from "../../data/feedMockData";
import {
  dedupeFeedPosts,
  fetchMemberFeedPostById,
  fetchMemberFeedPage,
  type MemberFeedCursor,
} from "../../lib/memberFeedPosts";
import { mergeFeedPostAfterEdit } from "../../lib/feedPostEditing";
import {
  fetchDiscoverablePortalMembers,
  fetchOwnMemberProfile,
} from "../../lib/memberProfiles";
import { getCurrentAuthUserId } from "../../lib/authUserLinking";
import { isAdminEmail } from "../../lib/admin";
import { buildComposerAuthor } from "../../lib/portalProfileDisplay";
import { resolveMemberProfileMedia } from "../../lib/memberProfileMedia";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import {
  EMPTY_MEMBER_HOME_EXPOSURE,
  readMemberHomeLastVisit,
  readMemberHomeExposure,
  recordMemberHomeExposure,
  type MemberHomeExposure,
  writeMemberHomeLastVisit,
} from "../../lib/memberHome";
import { FeedCard } from "./FeedCard";
import { FeedComposer } from "./FeedComposer";
import { FeedPostDetailModal } from "./FeedPostDetailModal";
import { MemberHomeBriefing } from "./MemberHomeBriefing";
import { MemberOnboardingChecklist } from "./MemberOnboardingChecklist";
import { usePortalToast } from "./PortalToastProvider";
import type { ContributionResponseAction } from "../../lib/contributionResponse";
import { shouldRefreshMemberExperience } from "../../lib/foregroundRefresh";

type PortalFeedProps = {
  showComposer?: boolean;
  composerId?: string;
  isActive?: boolean;
  onViewMemberProfile?: ViewMemberProfileHandler;
  onNavigate?: (tab: "discover" | "courses" | "profile" | "introductions") => void;
  onMessageMember?: (
    userId: string,
    memberName: string,
    response?: ContributionResponseAction,
  ) => void;
  focusPostId?: string | null;
  onFocusPostConsumed?: () => void;
  onMeaningfulAction?: () => void;
};

const FEED_PREVIEW_PAGE_SIZE = 8;

export function PortalFeed({
  showComposer = true,
  composerId = "feed-composer",
  isActive = true,
  onViewMemberProfile,
  onNavigate,
  onMessageMember,
  focusPostId = null,
  onFocusPostConsumed,
  onMeaningfulAction,
}: PortalFeedProps) {
  const { showToast } = usePortalToast();
  const [composerAuthor, setComposerAuthor] = useState(() => buildComposerAuthor(null));
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [viewerProfile, setViewerProfile] = useState<MemberProfileRecord | null>(null);
  const [discoverableMembers, setDiscoverableMembers] = useState<MemberProfileRecord[]>([]);
  const [previousVisitAt, setPreviousVisitAt] = useState<string | null>(null);
  const [homeExposure, setHomeExposure] = useState<MemberHomeExposure>(EMPTY_MEMBER_HOME_EXPOSURE);
  const [isAuthorLoaded, setIsAuthorLoaded] = useState(false);
  const [isVisitContextReady, setIsVisitContextReady] = useState(false);
  const [composerIntent, setComposerIntent] = useState<{
    postType: ComposerPostType;
    initialMessage: string;
    revision: number;
  }>({ postType: "introduction", initialMessage: "", revision: 0 });
  const [memberPosts, setMemberPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<MemberFeedCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [activityFocusedPostId, setActivityFocusedPostId] = useState<string | null>(null);
  const [detailPost, setDetailPost] = useState<FeedPost | null>(null);
  const hasLoadedInitialRef = useRef(false);
  const recordedVisitForRef = useRef<string | null>(null);
  const revealingActivityPostRef = useRef<string | null>(null);
  const lastHomeRefreshAtRef = useRef(0);

  const loadAuthor = useCallback(async () => {
    const [{ data }, { userId }, directoryResult] = await Promise.all([
      fetchOwnMemberProfile(),
      getCurrentAuthUserId(),
      fetchDiscoverablePortalMembers(),
    ]);
    setCurrentUserId(userId ?? null);
    if (userId) {
      try {
        setHomeExposure(readMemberHomeExposure(userId, window.localStorage));
      } catch {
        setHomeExposure(EMPTY_MEMBER_HOME_EXPOSURE);
      }
    }
    setViewerProfile(data ?? null);
    setDiscoverableMembers(directoryResult.error ? [] : directoryResult.data);

    if (isSupabaseConfigured && supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      setViewerIsAdmin(isAdminEmail(sessionData.session?.user.email));
    } else {
      setViewerIsAdmin(false);
    }

    const media = await resolveMemberProfileMedia(data);
    setComposerAuthor(buildComposerAuthor(data, undefined, media));
    setIsAuthorLoaded(true);
  }, []);

  const loadInitialPage = useCallback(async () => {
    lastHomeRefreshAtRef.current = Date.now();
    setIsLoadingPosts(true);
    setPostsError(null);
    setLoadMoreError(null);

    const { data, nextCursor: cursor, hasMore: moreAvailable, error } =
      await fetchMemberFeedPage({ limit: FEED_PREVIEW_PAGE_SIZE });

    if (error) {
      console.error("[PortalFeed] failed to load posts", error.message);
      setPostsError("Member posts could not be loaded right now.");
      setMemberPosts([]);
      setNextCursor(null);
      setHasMore(false);
      setIsLoadingPosts(false);
      return;
    }

    setMemberPosts(data);
    setNextCursor(cursor);
    setHasMore(moreAvailable);
    setIsLoadingPosts(false);
  }, []);

  useEffect(() => {
    void loadAuthor();
  }, [loadAuthor]);

  useEffect(() => {
    if (!isActive) return;
    if (hasLoadedInitialRef.current) return;

    hasLoadedInitialRef.current = true;
    void loadInitialPage();
  }, [isActive, loadInitialPage]);

  useEffect(() => {
    if (!isActive) return;

    function refreshIfStale() {
      if (document.visibilityState !== "visible") return;
      if (!shouldRefreshMemberExperience(lastHomeRefreshAtRef.current)) return;
      void Promise.all([loadInitialPage(), loadAuthor()]);
    }

    window.addEventListener("focus", refreshIfStale);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.removeEventListener("focus", refreshIfStale);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [isActive, loadAuthor, loadInitialPage]);

  useEffect(() => {
    if (!isAuthorLoaded || isLoadingPosts || postsError) return;
    if (!currentUserId) {
      setIsVisitContextReady(true);
      return;
    }
    if (recordedVisitForRef.current === currentUserId) return;

    recordedVisitForRef.current = currentUserId;
    try {
      setPreviousVisitAt(readMemberHomeLastVisit(currentUserId, window.localStorage));
      writeMemberHomeLastVisit(currentUserId, new Date().toISOString(), window.localStorage);
    } catch {
      setPreviousVisitAt(null);
    }
    setIsVisitContextReady(true);
  }, [currentUserId, isAuthorLoaded, isLoadingPosts, postsError]);

  useEffect(() => {
    if (!isActive) return;
    if (!focusPostId) {
      revealingActivityPostRef.current = null;
      return;
    }
    if (
      isLoadingPosts ||
      postsError ||
      revealingActivityPostRef.current === focusPostId
    ) return;
    revealingActivityPostRef.current = focusPostId;
    const activityPostId = focusPostId;
    let active = true;

    async function revealActivityPost() {
      let targetPostId = activityPostId;
      if (!memberPosts.some((post) => post.id === activityPostId)) {
        const result = await fetchMemberFeedPostById(activityPostId);
        if (!active) return;
        if (result.error || !result.data) {
          showToast("That activity is no longer available.");
          onFocusPostConsumed?.();
          return;
        }
        targetPostId = result.data.id;
        setMemberPosts((current) => dedupeFeedPosts([...current, result.data!]));
      }

      setActivityFocusedPostId(targetPostId);

      window.setTimeout(() => {
        const target = document.getElementById(`feed-post-${targetPostId}`);
        if (!target) {
          showToast("The post could not be displayed. Home has been opened instead.");
          onFocusPostConsumed?.();
          return;
        }
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(
          () => setActivityFocusedPostId((current) => current === targetPostId ? null : current),
          5000,
        );
        onFocusPostConsumed?.();
      }, 120);
    }

    void revealActivityPost();
    return () => {
      active = false;
    };
  }, [focusPostId, isActive, isLoadingPosts, memberPosts, onFocusPostConsumed, postsError, showToast]);

  async function loadMorePosts() {
    if (!hasMore || isLoadingMore || !nextCursor) return;

    setIsLoadingMore(true);
    setLoadMoreError(null);

    const { data, nextCursor: cursor, hasMore: moreAvailable, error } =
      await fetchMemberFeedPage({ cursor: nextCursor, limit: FEED_PREVIEW_PAGE_SIZE });

    if (error) {
      console.error("[PortalFeed] failed to load more posts", error.message);
      setLoadMoreError("Older posts could not be loaded. Try again.");
      setIsLoadingMore(false);
      return;
    }

    setMemberPosts((current) => dedupeFeedPosts([...current, ...data]));
    setNextCursor(cursor);
    setHasMore(moreAvailable);
    setIsLoadingMore(false);
  }

  function handlePosted(newPost?: FeedPost) {
    showToast("Post shared");
    onMeaningfulAction?.();

    if (newPost) {
      setMemberPosts((current) => dedupeFeedPosts([newPost, ...current]));
      return;
    }

    void loadInitialPage();
  }

  function handlePostUpdated(updatedPost: FeedPost) {
    setMemberPosts((current) =>
      current.map((post) =>
        post.id === updatedPost.id ? mergeFeedPostAfterEdit(post, updatedPost) : post,
      ),
    );
  }

  function openComposer(postType: ComposerPostType, initialMessage = "") {
    setComposerIntent((current) => ({ postType, initialMessage, revision: current.revision + 1 }));
    window.requestAnimationFrame(() => {
      document.getElementById(composerId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function openPost(postId: string) {
    const post = memberPosts.find((entry) => entry.id === postId);
    if (post) {
      setDetailPost(post);
      return;
    }
    document.getElementById(`feed-post-${postId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function handlePostDetailUpdated(updatedPost: FeedPost) {
    handlePostUpdated(updatedPost);
    setDetailPost((current) => (current?.id === updatedPost.id ? updatedPost : current));
  }

  const recordHomeExposure = useCallback(
    (exposure: { postId?: string; memberId?: string }) => {
      if (!currentUserId) return;
      try {
        recordMemberHomeExposure(currentUserId, exposure, window.localStorage);
      } catch {
        // Rotation is optional when browser storage is unavailable.
      }
    },
    [currentUserId],
  );

  const founderWelcome = useMemo(() => getFounderWelcomePost(), []);
  const hasMemberPosts = memberPosts.length > 0;

  return (
    <section className="et-feed et-feed-card-scope" aria-labelledby="feed-heading">
      <header className="et-feed-hero et-animate-fade-up">
        <p className="et-eyebrow et-eyebrow--line et-eyebrow--accent">Member Society</p>
        <h2 id="feed-heading" className="et-h2 et-feed-title">
          Home
        </h2>
        <p className="et-body et-feed-lead">
          What’s new, who is worth meeting, and where you can contribute.
        </p>
      </header>

      <MemberOnboardingChecklist
        isActive={isActive}
        onNavigate={(tab) => onNavigate?.(tab)}
        onCompose={(postType) => openComposer(postType)}
      />

      <MemberHomeBriefing
        posts={memberPosts}
        members={discoverableMembers}
        viewer={viewerProfile}
        viewerUserId={currentUserId}
        previousVisitAt={previousVisitAt}
        exposure={homeExposure}
        isLoading={isLoadingPosts || !isVisitContextReady}
        onCompose={openComposer}
        onOpenPost={openPost}
        onNavigateDiscover={() => onNavigate?.("discover")}
        onViewMemberProfile={onViewMemberProfile}
        onRecordExposure={recordHomeExposure}
        onRespondToPost={(post, response) => {
          const authorUserId = post.authorUserId?.trim() || post.author.id?.trim();
          if (authorUserId) onMessageMember?.(authorUserId, post.author.name, response);
        }}
      />

      {showComposer ? (
        <div className="et-feed-composer-wrap et-animate-fade-up et-animate-delay-1">
          <FeedComposer
            key={composerIntent.revision}
            id={composerId}
            author={composerAuthor}
            initialPostType={composerIntent.postType}
            initialMessage={composerIntent.initialMessage}
            startExpanded={composerIntent.revision > 0}
            onPosted={handlePosted}
          />
        </div>
      ) : null}

      <section className="et-feed-stream" aria-labelledby="latest-activity-heading">
        <div className="et-feed-stream-head">
          <h3 id="latest-activity-heading" className="et-h3">
            From the network
          </h3>
          <p>Newest first · {FEED_PREVIEW_PAGE_SIZE} at a time</p>
        </div>

        {isLoadingPosts ? (
          <div className="et-loading et-feed-loading" aria-live="polite" aria-busy="true">
            <div className="et-loading__mark" aria-hidden="true" />
            <p className="et-loading__text">Loading member posts</p>
          </div>
        ) : null}

        {postsError ? (
          <div className="et-feed-error">
            <div className="et-alert et-alert--error" role="alert">
              <div>
                <p className="et-alert__title">Posts unavailable</p>
                <p className="et-alert__body">{postsError}</p>
              </div>
            </div>
            <button
              type="button"
              className="et-btn et-btn--secondary"
              onClick={() => void loadInitialPage()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoadingPosts && hasMemberPosts ? (
          <div className="et-feed-list">
            {memberPosts.map((post, index) => (
              <FeedCard
                key={post.id}
                post={post}
                index={index + 1}
                currentUserId={currentUserId}
                viewerIsAdmin={viewerIsAdmin}
                onToast={showToast}
                onViewAuthor={onViewMemberProfile}
                onRespondPrivately={onMessageMember}
                onPostUpdated={handlePostUpdated}
                onOpenDetail={() => setDetailPost(post)}
                isActivityFocus={activityFocusedPostId === post.id}
              />
            ))}
          </div>
        ) : null}

        {!isLoadingPosts && !hasMemberPosts && !postsError ? (
          <div className="et-feed-empty">
            <p className="et-feed-empty-title">Be the first signal in the network</p>
            <p className="et-feed-empty-lead">
              Share a recent round, ask members for advice, or explore golfers worth meeting.
            </p>
            <div className="et-feed-empty-actions">
              <button type="button" className="et-btn et-btn--forest" onClick={() => openComposer("round-review")}>
                Share a round
              </button>
              <button type="button" className="et-btn et-btn--secondary" onClick={() => openComposer("general")}>
                Ask the community
              </button>
              {onNavigate ? (
                <button type="button" className="et-btn et-btn--ghost" onClick={() => onNavigate("discover")}>
                  Discover members
                </button>
              ) : null}
            </div>
            <div className="et-feed-list et-feed-list--founder">
              <p className="et-label et-feed-founder-label">A note from the founder</p>
              <FeedCard post={founderWelcome} index={0} variant="founder" onToast={showToast} />
            </div>
          </div>
        ) : null}

        {loadMoreError ? (
          <div className="et-feed-error">
            <div className="et-alert et-alert--warning" role="alert">
              <div>
                <p className="et-alert__title">Could not load older posts</p>
                <p className="et-alert__body">{loadMoreError}</p>
              </div>
            </div>
            <button
              type="button"
              className="et-btn et-btn--secondary"
              onClick={() => void loadMorePosts()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoadingPosts && hasMore ? (
          <button
            type="button"
            className="et-feed-load-more"
            onClick={() => void loadMorePosts()}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading older posts…" : "Load more posts"}
          </button>
        ) : null}
      </section>

      {detailPost ? (
        <FeedPostDetailModal
          post={detailPost}
          currentUserId={currentUserId}
          viewerIsAdmin={viewerIsAdmin}
          onClose={() => setDetailPost(null)}
          onToast={showToast}
          onViewAuthor={onViewMemberProfile}
          onRespondPrivately={onMessageMember}
          onPostUpdated={handlePostDetailUpdated}
        />
      ) : null}
    </section>
  );
}
