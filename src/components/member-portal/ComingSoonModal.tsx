type ComingSoonModalProps = {
  feature?: string;
  onClose: () => void;
};

export function ComingSoonModal({ feature = "This feature", onClose }: ComingSoonModalProps) {
  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="portal-modal portal-modal--coming-soon"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coming-soon-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h2 id="coming-soon-heading">Coming Soon</h2>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p className="portal-coming-soon-copy">
          {feature} will open as EliteTee grows. Member access is opening soon — applications are
          reviewed thoughtfully.
        </p>
        <button type="button" className="portal-btn portal-btn--gold portal-btn--full" onClick={onClose}>
          Got it
        </button>
      </article>
    </div>
  );
}
