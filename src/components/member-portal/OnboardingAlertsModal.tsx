type OnboardingAlertsModalProps = {
  onClose: () => void;
};

const onboardingAlerts = [
  {
    id: "welcome",
    title: "Welcome to EliteTee.",
    hint: "You're among the first founding members helping shape the community.",
  },
  {
    id: "profile",
    title: "Complete your profile.",
    hint: "Add your home club, location, and golf interests so members can find you.",
  },
  {
    id: "feed",
    title: "Introduce yourself in the Feed.",
    hint: "Share where you play, what you love about golf, or ask for an introduction.",
  },
  {
    id: "courses",
    title: "Add your first bucket-list course.",
    hint: "Save courses from the library to build your list and travel plans.",
  },
] as const;

export function OnboardingAlertsModal({ onClose }: OnboardingAlertsModalProps) {
  return (
    <div
      className="portal-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="portal-modal portal-modal--coming-soon portal-modal--onboarding"
        role="dialog"
        aria-labelledby="onboarding-alerts-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h3 id="onboarding-alerts-title">Alerts</h3>
          <button
            type="button"
            className="portal-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <ul className="portal-onboarding-alerts">
          {onboardingAlerts.map((alert) => (
            <li key={alert.id} className="portal-onboarding-alert">
              <p className="portal-onboarding-alert-title">{alert.title}</p>
              <p className="portal-onboarding-alert-hint">{alert.hint}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
