import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GolferProfilePage } from "../components/member-portal/GolferProfilePage";
import { AskEliteTee } from "../components/member-portal/AskEliteTee";
import { PortalCompose } from "../components/member-portal/PortalCompose";
import { PortalCourses } from "../components/member-portal/PortalCourses";
import { PortalDiscover } from "../components/member-portal/PortalDiscover";
import { PortalFeed } from "../components/member-portal/PortalFeed";
import { PortalIntroductionRequests } from "../components/member-portal/PortalIntroductionRequests";
import { PortalMessages } from "../components/member-portal/PortalMessages";
import { PortalNotificationsPanel } from "../components/member-portal/PortalNotificationsPanel";
import { IntroductionRequestModal } from "../components/member-portal/IntroductionRequestModal";
import { ComingSoonProvider } from "../components/member-portal/ComingSoonProvider";
import { PortalToastProvider, usePortalToast } from "../components/member-portal/PortalToastProvider";
import { privacyCopy } from "../data/memberPortalDirectory";
import { introductionsCopy } from "../data/portalSocial";
import { getCurrentAuthUserId } from "../lib/authUserLinking";
import type { IntroductionTab } from "../lib/introductionBoard";
import { fetchUnreadMessageCount } from "../lib/privateMessages";
import {
  acknowledgePortalNotificationPanel,
  clearPortalNotificationBadgeFlags,
  computePortalNotificationBadgeCountFromSources,
  fetchPortalNotificationBadgeSources,
  fetchPortalNotificationFeed,
  resolvePortalNotificationDestination,
  type FeedPostLikeRow,
  type PortalNotificationItem,
} from "../lib/portalNotificationCenter";
import {
  formatNotificationCount,
  getNotificationBadgeDisplay,
  getSeenFeedLikeKeys,
  getSeenIntroductionRequestIds,
  getSeenMessageNotificationKeys,
  markFeedLikesSeen,
  markIntroductionRequestsSeen,
  markMessageNotificationsSeen,
} from "../lib/portalNotifications";
import type { DirectConversationSummary } from "../types/privateMessage";
import {
  PORTAL_DESKTOP_PRIMARY_TABS,
  PORTAL_MOBILE_BOTTOM_TABS,
  type PortalPrimaryTab,
} from "../lib/portalNavigation";
import { supabase } from "../lib/supabase";
import type { IntroductionRequestRecord } from "../types/introductionRequest";
import type { ProfileReturnContext } from "../types/memberProfileNavigation";
import type { MemberProfileRecord } from "../types/memberProfileRecord";
import {
  fetchMemberRelationshipContext,
  type MemberRelationshipContext,
} from "../lib/memberRelationships";
import "../inside-elitetee.css";
import "../member-portal.css";
import "../member-portal-theme.css";
import "../member-portal-ask.css";
import "../member-portal-feed.css";
import "../member-portal-courses.css";
import "../member-portal-discover.css";
import "../member-portal-profile.css";
import "../member-portal-messages.css";
import "../member-portal-introductions.css";
import "../member-portal-notifications.css";
import "../member-portal-mobile.css";

const INITIAL_LOADER_MS = 1800;
const TAB_TRANSITION_MS = 650;
const FEED_COMPOSER_ID = "feed-composer";

type PortalTab = PortalPrimaryTab;

type PendingConversation = {
  otherUserId: string;
  otherUserName: string;
};

const MOBILE_LAYOUT_QUERY = "(max-width: 767px)";

function bottomNavIcon(tab: PortalTab) {
  switch (tab) {
    case "feed":
      return "⌂";
    case "discover":
      return "◎";
    case "ask":
      return "✦";
    case "courses":
      return "⛳";
    case "introductions":
      return "↔";
    case "profile":
      return "◉";
    default:
      return "•";
  }
}

function PortalTopBarBellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PortalTopBarEnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MemberPortalContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = usePortalToast();
  const isCoursesRoute = location.pathname === "/courses";
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isInitialLoaderVisible, setIsInitialLoaderVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeView, setActiveView] = useState<PortalTab>("feed");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [introductionRequests, setIntroductionRequests] = useState<IntroductionRequestRecord[]>([]);
  const [seenIntroductionRequestIds, setSeenIntroductionRequestIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [seenFeedLikeKeys, setSeenFeedLikeKeys] = useState<Set<string>>(() => new Set());
  const [seenMessageNotificationKeys, setSeenMessageNotificationKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [feedLikeRows, setFeedLikeRows] = useState<FeedPostLikeRow[]>([]);
  const [notificationConversations, setNotificationConversations] = useState<
    DirectConversationSummary[]
  >([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationItems, setNotificationItems] = useState<PortalNotificationItem[]>([]);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    window.matchMedia(MOBILE_LAYOUT_QUERY).matches,
  );
  const [pendingConversation, setPendingConversation] = useState<PendingConversation | null>(null);
  const [pendingIntroductionTab, setPendingIntroductionTab] = useState<IntroductionTab | null>(
    null,
  );
  const [pendingIntroductionRequestId, setPendingIntroductionRequestId] = useState<string | null>(
    null,
  );
  const [relationshipContext, setRelationshipContext] = useState<MemberRelationshipContext | null>(
    null,
  );
  const [introRequestMember, setIntroRequestMember] = useState<MemberProfileRecord | null>(null);
  const [pendingAskQuestion, setPendingAskQuestion] = useState<string | null>(null);
  const [pendingFeedPostId, setPendingFeedPostId] = useState<string | null>(null);
  const scrollAfterTransition = useRef<PortalTab | null>(null);
  const resolvedView: PortalTab = isCoursesRoute ? "courses" : activeView;

  const notificationBadgeCount = useMemo(
    () =>
      computePortalNotificationBadgeCountFromSources({
        unreadMessageCount,
        introductionRequests,
        currentUserId,
        seenIntroductionRequestIds,
        conversations: notificationConversations,
        feedLikes: feedLikeRows,
        seenFeedLikeKeys,
        seenMessageNotificationKeys,
      }),
    [
      currentUserId,
      feedLikeRows,
      introductionRequests,
      notificationConversations,
      seenFeedLikeKeys,
      seenIntroductionRequestIds,
      seenMessageNotificationKeys,
      unreadMessageCount,
    ],
  );

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setIsInitialLoading(false), INITIAL_LOADER_MS);
    const hideTimer = window.setTimeout(
      () => setIsInitialLoaderVisible(false),
      INITIAL_LOADER_MS + 600,
    );

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  const refreshNotificationCounts = useCallback(async () => {
    const [{ count }, badgeSources] = await Promise.all([
      fetchUnreadMessageCount(),
      fetchPortalNotificationBadgeSources(),
    ]);

    setUnreadMessageCount(count);

    if (badgeSources.error) {
      return;
    }

    setNotificationConversations(badgeSources.conversations);
    setIntroductionRequests(badgeSources.introductionRequests);
    setFeedLikeRows(badgeSources.feedLikes);
  }, []);

  const loadNotificationPanel = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);

    const result = await fetchPortalNotificationFeed();

    if (result.error) {
      setNotificationsError(result.error);
      setNotificationItems([]);
      setNotificationsLoading(false);
      return;
    }

    setIntroductionRequests(result.introductionRequests);
    setNotificationConversations(result.conversations);
    setFeedLikeRows(result.feedLikes);

    if (currentUserId) {
      const seenState = acknowledgePortalNotificationPanel(currentUserId, result.notifications);
      setSeenIntroductionRequestIds(seenState.seenIntroductionRequestIds);
      setSeenFeedLikeKeys(seenState.seenFeedLikeKeys);
      setSeenMessageNotificationKeys(seenState.seenMessageNotificationKeys);
    } else {
      const { userId } = await getCurrentAuthUserId();
      if (userId) {
        const seenState = acknowledgePortalNotificationPanel(userId, result.notifications);
        setSeenIntroductionRequestIds(seenState.seenIntroductionRequestIds);
        setSeenFeedLikeKeys(seenState.seenFeedLikeKeys);
        setSeenMessageNotificationKeys(seenState.seenMessageNotificationKeys);
      }
    }

    setNotificationItems(clearPortalNotificationBadgeFlags(result.notifications));

    const unreadFromConversations = result.conversations.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0,
    );
    setUnreadMessageCount(unreadFromConversations);
    setNotificationsLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    void refreshNotificationCounts();
  }, [refreshNotificationCounts]);

  const refreshRelationshipContext = useCallback(async () => {
    const { context } = await fetchMemberRelationshipContext();
    setRelationshipContext(context);
  }, []);

  useEffect(() => {
    void refreshRelationshipContext();
  }, [refreshRelationshipContext]);

  useEffect(() => {
    setRelationshipContext((current) =>
      current ? { ...current, introductionRequests } : current,
    );
  }, [introductionRequests]);

  useEffect(() => {
    void getCurrentAuthUserId().then(({ userId }) => setCurrentUserId(userId ?? null));
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setSeenIntroductionRequestIds(new Set());
      setSeenFeedLikeKeys(new Set());
      setSeenMessageNotificationKeys(new Set());
      return;
    }

    setSeenIntroductionRequestIds(getSeenIntroductionRequestIds(currentUserId));
    setSeenFeedLikeKeys(getSeenFeedLikeKeys(currentUserId));
    setSeenMessageNotificationKeys(getSeenMessageNotificationKeys(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const handleChange = () => setIsMobileLayout(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const state = location.state as
      | {
          openMessagesWith?: { userId: string; memberName: string };
          openAskWith?: { question: string };
          openFeedPostWith?: { postId: string };
          restorePortalTab?: PortalTab;
          focusIntroductionRequestId?: string;
        }
      | null
      | undefined;

    if (state?.openAskWith?.question?.trim()) {
      setPendingAskQuestion(state.openAskWith.question.trim());
      setActiveView("ask");
      navigate("/member-portal", { replace: true, state: null });
      return;
    }

    if (state?.openMessagesWith) {
      setPendingConversation({
        otherUserId: state.openMessagesWith.userId,
        otherUserName: state.openMessagesWith.memberName,
      });
      setActiveView("messages");
      navigate("/member-portal", { replace: true, state: null });
      return;
    }

    if (state?.openFeedPostWith?.postId?.trim()) {
      setPendingFeedPostId(state.openFeedPostWith.postId.trim());
      setActiveView("feed");
      navigate("/member-portal", { replace: true, state: null });
      return;
    }

    if (state?.restorePortalTab) {
      setActiveView(state.restorePortalTab);
      if (state.focusIntroductionRequestId) {
        setPendingIntroductionRequestId(state.focusIntroductionRequestId);
      }
      navigate("/member-portal", { replace: true, state: null });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (isTransitioning || scrollAfterTransition.current !== "feed") return;

    const composer = document.getElementById(FEED_COMPOSER_ID);
    if (composer) {
      composer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    scrollAfterTransition.current = null;
  }, [isTransitioning, activeView]);

  const showLoader = isInitialLoaderVisible || isTransitioning;

  async function handleSignOut() {
    setIsSigningOut(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login", { replace: true });
  }

  function handleOpenFeedPost(postId: string) {
    setPendingFeedPostId(postId);
    transitionTo("feed");
  }

  function getProfileReturnContext(): ProfileReturnContext {
    switch (activeView) {
      case "discover":
        return { type: "portal", tab: "discover", label: "Back to Discover" };
      case "ask":
        return { type: "portal", tab: "ask", label: "Back to Ask EliteTee" };
      case "courses":
        return {
          type: "route",
          path: isCoursesRoute ? `/courses${location.search}` : "/courses",
          label: "Back to Courses",
        };
      case "messages":
        return { type: "portal", tab: "messages", label: "Back to Messages" };
      case "introductions":
        return { type: "portal", tab: "introductions", label: "Back to Introductions" };
      case "profile":
        return { type: "portal", tab: "profile", label: "Back to Profile" };
      default:
        return { type: "portal", tab: "feed", label: "Back to Feed" };
    }
  }

  function handleViewMemberProfile(
    userId: string,
    memberName: string,
    returnTo?: ProfileReturnContext,
  ) {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) return;

    if (currentUserId && normalizedUserId === currentUserId) {
      transitionTo("profile");
      return;
    }

    navigate(`/members/${normalizedUserId}`, {
      state: {
        returnTo: returnTo ?? getProfileReturnContext(),
        memberName,
      },
    });
  }

  function handleMessageMember(userId: string, memberName: string) {
    setPendingConversation({ otherUserId: userId, otherUserName: memberName });
    transitionTo("messages");
  }

  function handleRequestIntroduction(member: MemberProfileRecord) {
    setIntroRequestMember(member);
  }

  function handleRespondToIntroduction(requestId: string) {
    setPendingIntroductionTab("incoming");
    setPendingIntroductionRequestId(requestId);
    transitionTo("introductions");
  }

  function handleIntroductionSubmitted() {
    showToast(introductionsCopy.submitSuccess);
    setIntroRequestMember(null);
    void refreshRelationshipContext();
    void refreshNotificationCounts();
    setPendingIntroductionTab("sent");
    transitionTo("introductions");
  }

  function transitionTo(view: PortalTab, options?: { scrollToComposer?: boolean }) {
    if (view === "courses") {
      navigate("/courses");
      setActiveView("courses");
      return;
    }

    if (isCoursesRoute) {
      navigate("/member-portal");
    }

    if (view === activeView && !options?.scrollToComposer) return;

    if (options?.scrollToComposer) {
      scrollAfterTransition.current = "feed";
    }

    setIsTransitioning(true);
    window.setTimeout(() => {
      setActiveView(view === "compose" && options?.scrollToComposer ? "feed" : view);
      if (view === "messages" || view === "introductions") {
        void refreshNotificationCounts();
      }
      window.setTimeout(() => setIsTransitioning(false), TAB_TRANSITION_MS);
    }, TAB_TRANSITION_MS * 0.45);
  }

  function handleViewCourse(_courseId: string) {
    transitionTo("courses");
  }

  function handleMobileNav(tab: PortalTab) {
    if (tab === "compose") {
      if (isCoursesRoute) {
        navigate("/member-portal");
      }
      setActiveView("feed");
      window.scrollTo({ top: 0, behavior: "auto" });
      requestAnimationFrame(() => {
        document.getElementById(FEED_COMPOSER_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    if (tab === "courses") {
      navigate("/courses");
      setActiveView("courses");
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    if (isCoursesRoute) {
      navigate("/member-portal");
    }

    if (tab === activeView) return;

    setActiveView(tab);
    window.scrollTo({ top: 0, behavior: "auto" });

    if (tab === "messages" || tab === "introductions") {
      void refreshNotificationCounts();
    }
  }

  const handleIntroductionRequestsChange = useCallback((requests: IntroductionRequestRecord[]) => {
    setIntroductionRequests(requests);
  }, []);

  function toggleNotificationsPanel() {
    setNotificationsOpen((isOpen) => {
      const nextOpen = !isOpen;
      if (nextOpen) {
        void loadNotificationPanel();
      }
      return nextOpen;
    });
  }

  function handleNotificationSelect(notification: PortalNotificationItem) {
    setNotificationsOpen(false);

    if (notification.acknowledgeIntroductionRequestId && currentUserId) {
      markIntroductionRequestsSeen(currentUserId, [
        notification.acknowledgeIntroductionRequestId,
      ]);
      setSeenIntroductionRequestIds(getSeenIntroductionRequestIds(currentUserId));
    }

    if (notification.acknowledgeFeedLikeKey && currentUserId) {
      markFeedLikesSeen(currentUserId, [notification.acknowledgeFeedLikeKey]);
      setSeenFeedLikeKeys(getSeenFeedLikeKeys(currentUserId));
    }

    if (notification.acknowledgeMessageNotificationKey && currentUserId) {
      markMessageNotificationsSeen(currentUserId, [
        notification.acknowledgeMessageNotificationKey,
      ]);
      setSeenMessageNotificationKeys(getSeenMessageNotificationKeys(currentUserId));
    }

    const destination = resolvePortalNotificationDestination(notification);

    if (destination?.view === "messages") {
      setPendingConversation(destination.messageTarget);
      transitionTo("messages");
      return;
    }

    if (destination?.view === "introductions") {
      setPendingIntroductionTab(destination.introductionTarget.tab);
      setPendingIntroductionRequestId(destination.introductionTarget.requestId);
      transitionTo("introductions");
      return;
    }

    if (destination?.view === "feed") {
      setPendingFeedPostId(destination.postId);
      transitionTo("feed");
    }
  }

  return (
    <div className="inside-page portal-page portal-page--social et-theme-portal" data-et-theme="portal">
      {showLoader ? (
        <div
          className={`portal-loader${isInitialLoading || isTransitioning ? "" : " is-fading"}`}
          aria-hidden="true"
        >
          <span className="inside-logo-mark portal-loader-logo" />
        </div>
      ) : null}

      <div className="portal-chrome">
        <header className="portal-top">
          <div className="portal-shell portal-shell--bar">
            <button
              type="button"
              className="portal-logo-link"
              aria-label="EliteTee feed"
              onClick={() => transitionTo("feed")}
            >
              <span className="inside-logo-mark portal-logo-mark" aria-hidden="true" />
            </button>

            <div className="portal-top-actions">
              <div className="portal-notifications-anchor">
                <button
                  type="button"
                  className="portal-icon-btn portal-icon-btn--notifications"
                  data-notifications-trigger="true"
                  aria-label={
                    notificationBadgeCount === 1
                      ? "1 new notification"
                      : notificationBadgeCount > 1
                        ? `${notificationBadgeCount} notifications`
                        : "Open notifications"
                  }
                  aria-expanded={notificationsOpen}
                  aria-haspopup="dialog"
                  onClick={toggleNotificationsPanel}
                >
                  <span className="portal-icon-btn-glyph" aria-hidden="true">
                    <PortalTopBarBellIcon />
                  </span>
                  <span className="portal-icon-btn-label">Notifications</span>
                  {getNotificationBadgeDisplay(notificationBadgeCount) === "dot" ? (
                    <span className="portal-icon-badge-dot" aria-hidden="true" />
                  ) : null}
                  {getNotificationBadgeDisplay(notificationBadgeCount) === "count" ? (
                    <span className="portal-icon-badge">
                      {formatNotificationCount(notificationBadgeCount)}
                    </span>
                  ) : null}
                </button>
                <PortalNotificationsPanel
                  isOpen={notificationsOpen}
                  isMobile={isMobileLayout}
                  isLoading={notificationsLoading}
                  errorMessage={notificationsError}
                  notifications={notificationItems}
                  onClose={() => setNotificationsOpen(false)}
                  onRetry={() => void loadNotificationPanel()}
                  onSelect={handleNotificationSelect}
                />
              </div>
              <button
                type="button"
                className="portal-icon-btn portal-icon-btn--messages"
                aria-label={
                  unreadMessageCount > 0
                    ? `${unreadMessageCount} unread messages`
                    : "Open messages"
                }
                onClick={() => transitionTo("messages")}
              >
                <span className="portal-icon-btn-glyph" aria-hidden="true">
                  <PortalTopBarEnvelopeIcon />
                </span>
                <span className="portal-icon-btn-label">Messages</span>
                {unreadMessageCount > 0 ? (
                  <span className="portal-icon-badge">{formatNotificationCount(unreadMessageCount)}</span>
                ) : null}
              </button>
              <button
                type="button"
                className="portal-btn portal-btn--gold portal-signout"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </header>

        <nav className="portal-tabs portal-tabs--desktop" aria-label="EliteTee member portal">
          <div className="portal-shell portal-shell--bar">
            {PORTAL_DESKTOP_PRIMARY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`portal-tab${resolvedView === tab.id ? " is-active" : ""}`}
                onClick={() => transitionTo(tab.id)}
                aria-current={resolvedView === tab.id ? "page" : undefined}
              >
                <span className="portal-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      <main className={`portal-main portal-main--social${isInitialLoading ? " is-loading" : ""}`}>
        <div className="portal-shell">
          <div hidden={resolvedView !== "feed"}>
            <PortalFeed
              showComposer
              composerId={FEED_COMPOSER_ID}
              isActive={resolvedView === "feed"}
              focusPostId={pendingFeedPostId}
              onFocusPostConsumed={() => setPendingFeedPostId(null)}
              onViewMemberProfile={handleViewMemberProfile}
            />
          </div>
          {resolvedView === "discover" ? (
            <PortalDiscover
              onViewCourse={handleViewCourse}
              onNavigate={(tab) => transitionTo(tab)}
              onViewMemberProfile={handleViewMemberProfile}
              onMessageMember={handleMessageMember}
              onRequestIntroduction={handleRequestIntroduction}
              onRespondToIntroduction={handleRespondToIntroduction}
              relationshipContext={relationshipContext}
              onRelationshipContextChange={setRelationshipContext}
            />
          ) : null}
          {resolvedView === "ask" ? (
            <AskEliteTee
              isActive={resolvedView === "ask"}
              initialQuestion={pendingAskQuestion}
              onInitialQuestionConsumed={() => setPendingAskQuestion(null)}
              onViewMemberProfile={handleViewMemberProfile}
            />
          ) : null}
          {resolvedView === "compose" ? (
            <PortalCompose onPosted={() => transitionTo("feed")} />
          ) : null}
          {resolvedView === "courses" ? <PortalCourses /> : null}
          {resolvedView === "introductions" ? (
            <PortalIntroductionRequests
              isActive={resolvedView === "introductions"}
              initialTab={pendingIntroductionTab}
              onInitialTabConsumed={() => setPendingIntroductionTab(null)}
              focusRequestId={pendingIntroductionRequestId}
              onFocusRequestConsumed={() => setPendingIntroductionRequestId(null)}
              onMessageMember={handleMessageMember}
              onViewMemberProfile={handleViewMemberProfile}
              onRequestsChange={handleIntroductionRequestsChange}
            />
          ) : null}
          {resolvedView === "messages" ? (
            <PortalMessages
              unreadCount={unreadMessageCount}
              initialConversation={pendingConversation}
              onInitialConversationOpened={() => setPendingConversation(null)}
              onViewMemberProfile={handleViewMemberProfile}
            />
          ) : null}
          {resolvedView === "profile" ? (
            <GolferProfilePage
              isActive={resolvedView === "profile"}
              relationshipContext={relationshipContext}
              onViewMemberProfile={handleViewMemberProfile}
              onOpenFeedPost={handleOpenFeedPost}
              onRequestIntroduction={handleRequestIntroduction}
              onRespondToIntroduction={handleRespondToIntroduction}
              onMessageMember={handleMessageMember}
            />
          ) : null}

          {resolvedView !== "introductions" ? (
            <section className="portal-privacy">
              <p>{privacyCopy}</p>
            </section>
          ) : null}
        </div>
      </main>

      <nav className="portal-bottom-nav" aria-label="Mobile navigation">
        {PORTAL_MOBILE_BOTTOM_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`portal-bottom-nav-btn${resolvedView === tab.id ? " is-active" : ""}`}
            onClick={() => handleMobileNav(tab.id)}
            aria-current={resolvedView === tab.id ? "page" : undefined}
          >
            <span className="portal-bottom-nav-icon" aria-hidden="true">
              {bottomNavIcon(tab.id)}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {introRequestMember ? (
        <IntroductionRequestModal
          member={introRequestMember}
          onClose={() => setIntroRequestMember(null)}
          onSubmitted={handleIntroductionSubmitted}
        />
      ) : null}
    </div>
  );
}

export function MemberPortal() {
  return (
    <PortalToastProvider>
      <ComingSoonProvider>
        <MemberPortalContent />
      </ComingSoonProvider>
    </PortalToastProvider>
  );
}
