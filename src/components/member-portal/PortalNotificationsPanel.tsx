import { useEffect, useId, useRef, useState } from "react";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import {
  groupPortalNotifications,
  PORTAL_NOTIFICATIONS_EMPTY_MESSAGE,
  type PortalNotificationItem,
} from "../../lib/portalNotificationCenter";

type PortalNotificationsPanelProps = {
  isOpen: boolean;
  isMobile: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  notifications: PortalNotificationItem[];
  onClose: () => void;
  onRetry: () => void;
  onSelect: (notification: PortalNotificationItem) => void;
};

const PANEL_CLOSE_MS = 220;

export function PortalNotificationsPanel({
  isOpen,
  isMobile,
  isLoading,
  errorMessage,
  notifications,
  onClose,
  onRetry,
  onSelect,
}: PortalNotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  useDialogFocus({
    active: isOpen && shouldRender,
    dialogRef: panelRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  });

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => setShouldRender(false), PANEL_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !shouldRender) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-notifications-trigger='true']")) return;
      onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, onClose, shouldRender]);

  if (!shouldRender) return null;

  const sections = groupPortalNotifications(notifications);

  return (
    <>
      {isMobile ? (
        <button
          type="button"
          className={`portal-notifications-backdrop${isVisible ? " is-open" : ""}`}
          aria-label="Close notifications"
          tabIndex={-1}
          onClick={onClose}
        />
      ) : null}
      <div
        ref={panelRef}
        className={`portal-notifications-panel${isMobile ? " portal-notifications-panel--mobile" : ""}${isVisible ? " is-open" : " is-closing"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="portal-notifications-panel-header">
          <h2 id={titleId} className="portal-notifications-panel-title">
            Activity
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="portal-icon-btn portal-notifications-close"
            aria-label="Close activity"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="portal-notifications-panel-body">
          {isLoading ? (
            <p className="portal-notifications-status" role="status">
              Loading activity...
            </p>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="portal-notifications-error" role="alert">
              <p>{errorMessage}</p>
              <button type="button" className="portal-btn portal-btn--outline" onClick={onRetry}>
                Try again
              </button>
            </div>
          ) : null}

          {!isLoading && !errorMessage && notifications.length === 0 ? (
            <div className="portal-notifications-empty" role="status">
              <strong>{PORTAL_NOTIFICATIONS_EMPTY_MESSAGE}</strong>
              <span>Comments, introductions, messages, matches, and member recommendations will appear here.</span>
            </div>
          ) : null}

          {!isLoading && !errorMessage && sections.length > 0 ? (
            <div className="portal-notifications-sections">
              {sections.map((section) => (
                <section
                  key={section.id}
                  className={`portal-notifications-section portal-notifications-section--${section.id}`}
                  aria-label={section.label}
                >
                  {section.showHeader ? (
                    <h3 className="portal-notifications-section-title">{section.label}</h3>
                  ) : null}
                  <ul className="portal-notifications-list">
                    {section.items.map((notification) => (
                      <li key={notification.id}>
                        <button
                          type="button"
                          className={`portal-notifications-item portal-notifications-item--${notification.kind}`}
                          onClick={() => onSelect(notification)}
                        >
                          <span className="portal-notifications-item-type">
                            {notification.typeLabel}
                            {notification.countsTowardBadge ? (
                              <span className="portal-notifications-item-new">New</span>
                            ) : null}
                          </span>
                          <span className="portal-notifications-item-member">
                            {notification.memberName}
                          </span>
                          <span className="portal-notifications-item-description">
                            {notification.description}
                          </span>
                          {notification.timestampLabel ? (
                            <span className="portal-notifications-item-time">
                              {notification.timestampLabel}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
