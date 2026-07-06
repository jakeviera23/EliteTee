import { FormEvent, useState } from "react";

const DEFAULT_MESSAGE = (name: string) =>
  `Hi ${name.split(" ")[0]} — I saw your profile on EliteTee and would love to connect through golf. If you are open to it, I'd enjoy setting up a round or talking more about courses we both enjoy.`;

type RequestConnectionModalProps = {
  golferName: string;
  onClose: () => void;
  onSent?: () => void;
};

export function RequestConnectionModal({
  golferName,
  onClose,
  onSent,
}: RequestConnectionModalProps) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE(golferName));
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    // TODO: Persist round/connection requests to Supabase when table is available.
    setSent(true);
    onSent?.();
  }

  return (
    <div className="portal-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="portal-modal portal-modal--connection"
        role="dialog"
        aria-labelledby="request-connection-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="portal-modal-head">
          <h2 id="request-connection-heading">Request Round</h2>
          <button type="button" className="portal-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {sent ? (
          <div className="portal-connection-sent" role="status">
            <p className="portal-connection-sent-title">Request sent.</p>
            <p>
              Your message to {golferName} has been recorded. Connect through the game and look for a
              reply in Messages.
            </p>
            <button type="button" className="portal-btn portal-btn--gold portal-btn--full" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="portal-connection-form" onSubmit={handleSubmit}>
            <p className="portal-connection-lead">
              Send a thoughtful note to {golferName}. EliteTee is built for trusted relationships
              through golf.
            </p>
            <label className="portal-profile-field portal-profile-field--full">
              <span>Message</span>
              <textarea
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
              />
            </label>
            <button type="submit" className="portal-btn portal-btn--gold portal-btn--full">
              Send Request
            </button>
          </form>
        )}
      </article>
    </div>
  );
}
