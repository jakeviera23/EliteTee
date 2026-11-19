import { adminCopy, type AdminTabId } from "../../data/adminCopy";

type AdminNavProps = {
  activeTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
  pendingCount: number;
  needsAttentionCount?: number;
};

const TAB_ORDER: AdminTabId[] = [
  "overview",
  "applications",
  "members",
  "invites",
  "moderation",
  "ai",
  "activity",
];

export function AdminNav({
  activeTab,
  onTabChange,
  pendingCount,
  needsAttentionCount = 0,
  moderationCount = 0,
}: AdminNavProps & { moderationCount?: number }) {
  return (
    <nav className="et-admin-nav" aria-label="Admin sections">
      <ul className="et-admin-nav-list">
        {TAB_ORDER.map((tabId) => {
          const label = adminCopy.tabs[tabId];
          const showPendingBadge = tabId === "applications" && pendingCount > 0;
          const showAttentionBadge = tabId === "applications" && needsAttentionCount > 0;
          const showModerationBadge = tabId === "moderation" && moderationCount > 0;

          return (
            <li key={tabId}>
              <button
                type="button"
                className={`et-admin-nav-btn${activeTab === tabId ? " is-active" : ""}`}
                onClick={() => onTabChange(tabId)}
                aria-current={activeTab === tabId ? "page" : undefined}
              >
                {label}
                {showPendingBadge ? (
                  <span className="et-admin-nav-badge" aria-label={`${pendingCount} pending`}>
                    {pendingCount}
                  </span>
                ) : null}
                {showAttentionBadge ? (
                  <span
                    className="et-admin-nav-badge et-admin-nav-badge--attention"
                    aria-label={`${needsAttentionCount} need attention`}
                  >
                    {needsAttentionCount}
                  </span>
                ) : null}
                {showModerationBadge ? (
                  <span
                    className="et-admin-nav-badge et-admin-nav-badge--attention"
                    aria-label={`${moderationCount} open reports`}
                  >
                    {moderationCount}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
