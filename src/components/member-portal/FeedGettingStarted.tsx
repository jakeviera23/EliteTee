import { useState } from "react";
import {
  FIRST_SESSION_ACTIONS,
  dismissFirstSessionGettingStarted,
  isFirstSessionGettingStartedDismissed,
  type FirstSessionActionId,
} from "../../lib/firstSessionActivation";

type FeedGettingStartedProps = {
  onAction: (actionId: FirstSessionActionId) => void;
};

export function FeedGettingStarted({ onAction }: FeedGettingStartedProps) {
  const [dismissed, setDismissed] = useState(() => isFirstSessionGettingStartedDismissed());

  if (dismissed) return null;

  return (
    <section className="et-getting-started" aria-labelledby="getting-started-heading">
      <header className="et-getting-started-head">
        <div className="et-getting-started-copy">
          <p className="et-getting-started-eyebrow">Getting started</p>
          <h3 id="getting-started-heading" className="et-getting-started-title">
            Make EliteTee useful in a few minutes
          </h3>
          <p className="et-getting-started-lead">
            Complete your profile, meet a member, share a round, or invite someone who belongs here.
          </p>
        </div>
        <button
          type="button"
          className="et-getting-started-dismiss"
          onClick={() => {
            dismissFirstSessionGettingStarted();
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </header>

      <ul className="et-getting-started-list">
        {FIRST_SESSION_ACTIONS.map((action, index) => (
          <li key={action.id}>
            <button
              type="button"
              className="et-getting-started-action"
              onClick={() => onAction(action.id)}
            >
              <span className="et-getting-started-action-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="et-getting-started-action-text">
                <span className="et-getting-started-action-title">{action.title}</span>
                <span className="et-getting-started-action-desc">{action.description}</span>
              </span>
              <svg
                className="et-getting-started-action-arrow"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8h9m-3.5-3.5L12.5 8 9 11.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
