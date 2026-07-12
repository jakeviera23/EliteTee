import { adminCopy, type AdminTabId } from "../../data/adminCopy";

type AdminNavProps = {
  activeTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
  pendingCount: number;
};

const TAB_ORDER: AdminTabId[] = [
  "overview",
  "applications",
  "members",
  "invites",
  "ai",
  "activity",
];

export function AdminNav({ activeTab, onTabChange, pendingCount }: AdminNavProps) {
  return (
    <nav className="et-admin-nav" aria-label="Admin sections">
      <ul className="et-admin-nav-list">
        {TAB_ORDER.map((tabId) => {
          const label = adminCopy.tabs[tabId];
          const showPendingBadge = tabId === "applications" && pendingCount > 0;

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
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
