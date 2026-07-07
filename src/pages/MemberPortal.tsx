import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GolferProfilePage } from "../components/member-portal/GolferProfilePage";
import { PortalCompose } from "../components/member-portal/PortalCompose";
import { PortalCourses } from "../components/member-portal/PortalCourses";
import { PortalDiscover } from "../components/member-portal/PortalDiscover";
import { PortalFeed } from "../components/member-portal/PortalFeed";
import { PortalMessages } from "../components/member-portal/PortalMessages";
import { ComingSoonProvider, useComingSoon } from "../components/member-portal/ComingSoonProvider";
import { PortalToastProvider } from "../components/member-portal/PortalToastProvider";
import type { FeedPost } from "../data/portalSocial";
import { privacyCopy } from "../data/memberPortalDirectory";
import { fetchUnreadMessageCount } from "../lib/privateMessages";
import { formatNotificationCount } from "../lib/portalNotifications";
import { supabase } from "../lib/supabase";
import "../inside-elitetee.css";
import "../member-portal.css";

const INITIAL_LOADER_MS = 1800;
const TAB_TRANSITION_MS = 650;
const FEED_COMPOSER_ID = "feed-composer";

type PortalTab = "feed" | "discover" | "compose" | "courses" | "messages" | "profile";

const desktopTabs: { id: PortalTab; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "discover", label: "Discover" },
  { id: "courses", label: "Courses" },
  { id: "messages", label: "Messages" },
  { id: "profile", label: "Profile" },
];

const mobileTabs: { id: PortalTab; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "discover", label: "Discover" },
  { id: "compose", label: "Post" },
  { id: "courses", label: "Courses" },
  { id: "profile", label: "Profile" },
];

function MemberPortalContent() {
  const navigate = useNavigate();
  const { showComingSoon } = useComingSoon();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isInitialLoaderVisible, setIsInitialLoaderVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeView, setActiveView] = useState<PortalTab>("feed");
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const scrollAfterTransition = useRef<PortalTab | null>(null);

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

  const refreshUnreadMessageCount = useCallback(async () => {
    const { count } = await fetchUnreadMessageCount();
    setUnreadMessageCount(count);
  }, []);

  useEffect(() => {
    void refreshUnreadMessageCount();
  }, [refreshUnreadMessageCount]);

  useEffect(() => {
    if (isTransitioning || scrollAfterTransition.current !== "feed") return;

    const composer = document.getElementById(FEED_COMPOSER_ID);
    if (composer) {
      composer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    scrollAfterTransition.current = null;
  }, [isTransitioning, activeView]);

  const showLoader = isInitialLoaderVisible || isTransitioning;

  function handleNewPost(post: FeedPost) {
    setFeedPosts((current) => [post, ...current]);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login", { replace: true });
  }

  function transitionTo(view: PortalTab, options?: { scrollToComposer?: boolean }) {
    if (view === activeView && !options?.scrollToComposer) return;

    if (options?.scrollToComposer) {
      scrollAfterTransition.current = "feed";
    }

    setIsTransitioning(true);
    window.setTimeout(() => {
      setActiveView(view === "compose" && options?.scrollToComposer ? "feed" : view);
      if (view === "messages") {
        void refreshUnreadMessageCount();
      }
      window.setTimeout(() => setIsTransitioning(false), TAB_TRANSITION_MS);
    }, TAB_TRANSITION_MS * 0.45);
  }

  function handleViewCourse(courseId: string) {
    setPendingCourseId(courseId);
    transitionTo("courses");
  }

  function handleMobileNav(tab: PortalTab) {
    if (tab === "compose") {
      transitionTo("feed", { scrollToComposer: true });
      return;
    }
    transitionTo(tab);
  }

  return (
    <div className="inside-page portal-page portal-page--social">
      {showLoader ? (
        <div
          className={`portal-loader${isInitialLoading || isTransitioning ? "" : " is-fading"}`}
          aria-hidden="true"
        >
          <span className="inside-logo-mark portal-loader-logo" />
        </div>
      ) : null}

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
          <button
            type="button"
            className="portal-icon-btn"
            aria-label="Notifications"
            onClick={() => showComingSoon("Notifications")}
          >
            <span aria-hidden="true">◦</span>
            <span className="portal-icon-btn-label">Alerts</span>
          </button>
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
            <span aria-hidden="true">✉</span>
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
        {desktopTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`portal-tab${activeView === tab.id ? " is-active" : ""}`}
            onClick={() => transitionTo(tab.id)}
            aria-current={activeView === tab.id ? "page" : undefined}
          >
            <span className="portal-tab-label">
              {tab.label}
              {tab.id === "messages" && unreadMessageCount > 0 ? (
                <span className="portal-tab-badge" aria-hidden="true">
                  {formatNotificationCount(unreadMessageCount)}
                </span>
              ) : null}
            </span>
          </button>
        ))}
        </div>
      </nav>

      <main className={`portal-main portal-main--social${isInitialLoading ? " is-loading" : ""}`}>
        <div className="portal-shell">
        {activeView === "feed" ? (
          <PortalFeed
            posts={feedPosts}
            onPost={handleNewPost}
            showComposer
            composerId={FEED_COMPOSER_ID}
          />
        ) : null}
        {activeView === "discover" ? (
          <PortalDiscover
            onViewCourse={handleViewCourse}
            onNavigate={(tab) => transitionTo(tab)}
          />
        ) : null}
        {activeView === "compose" ? (
          <PortalCompose onPost={handleNewPost} onPosted={() => transitionTo("feed")} />
        ) : null}
        {activeView === "courses" ? (
          <PortalCourses
            initialCourseId={pendingCourseId}
            onCourseOpened={() => setPendingCourseId(null)}
          />
        ) : null}
        {activeView === "messages" ? <PortalMessages unreadCount={unreadMessageCount} /> : null}
        {activeView === "profile" ? (
          <GolferProfilePage isActive={activeView === "profile"} feedPosts={feedPosts} />
        ) : null}

        <section className="portal-privacy">
          <p>{privacyCopy}</p>
        </section>
        </div>
      </main>

      <nav className="portal-bottom-nav" aria-label="Mobile navigation">
        {mobileTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`portal-bottom-nav-btn${(tab.id === "compose" ? activeView === "feed" : activeView === tab.id) ? " is-active" : ""}${tab.id === "compose" ? " portal-bottom-nav-btn--post" : ""}`}
            onClick={() => handleMobileNav(tab.id)}
            aria-current={
              (tab.id === "compose" ? activeView === "feed" : activeView === tab.id) ? "page" : undefined
            }
          >
            <span className="portal-bottom-nav-icon" aria-hidden="true">
              {tab.id === "feed"
                ? "⌂"
                : tab.id === "discover"
                  ? "◎"
                  : tab.id === "compose"
                    ? "+"
                    : tab.id === "courses"
                      ? "⛳"
                      : "◉"}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
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
