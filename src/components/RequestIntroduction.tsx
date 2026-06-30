import { useState, type FormEvent } from "react";

// Paste your Formspree endpoint here (Formspree dashboard → your form → Integration → Endpoint):
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xvzyndnb";

const PLACEHOLDER_ENDPOINT = /YOUR_FORM_ID|YOUR_REAL_FORM_ID/i.test(
  FORMSPREE_ENDPOINT,
);

const SUCCESS_MESSAGE =
  "Thank you. Your request has been received and will be reviewed privately.";

export function RequestIntroduction() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (PLACEHOLDER_ENDPOINT) {
      setError(
        "Form endpoint is not configured. Update FORMSPREE_ENDPOINT in src/components/RequestIntroduction.tsx.",
      );
      return;
    }

    const form = event.currentTarget;
    setSubmitting(true);

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        setSubmitted(true);
        return;
      }

      let message = "Something went wrong. Please try again.";
      try {
        const data = (await response.json()) as { error?: string };
        if (data.error) {
          message = data.error;
        }
      } catch {
        // Non-JSON error body; keep default message.
      }
      setError(message);
    } catch {
      setError(
        "Unable to send your application. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="apply"
      className="section section--request section--compact"
      aria-labelledby="request-heading"
    >
      <div className="layout request-layout request-layout--membership">
        <header className="section-intro request-intro request-intro--membership">
          <span className="request-logo-mark" aria-hidden="true" />
          <h2 id="request-heading">Request Membership Consideration</h2>
          <p className="section-lead request-lead">
            EliteTee is reviewing a limited number of founding member applications. Each
            request is handled privately.
          </p>
        </header>

        <div className="request-panel">
          {submitted ? (
            <div className="request-success" role="status" aria-live="polite">
              <p className="request-success-body">{SUCCESS_MESSAGE}</p>
            </div>
          ) : (
            <form
              className="request-form request-form--application"
              onSubmit={handleSubmit}
            >
              <label>
                <span>Full Name</span>
                <input type="text" name="fullName" autoComplete="name" required />
              </label>

              <label>
                <span>Email Address</span>
                <input type="email" name="email" autoComplete="email" required />
              </label>

              <label>
                <span>Home Club / Where You Play Golf</span>
                <input type="text" name="homeClub" autoComplete="organization" required />
              </label>

              <label>
                <span>Other Clubs or Golf Affiliations</span>
                <input type="text" name="otherClubsAffiliations" />
              </label>

              <label>
                <span>Company / Profession</span>
                <input
                  type="text"
                  name="companyProfession"
                  autoComplete="organization-title"
                  required
                />
              </label>

              <label>
                <span>Location</span>
                <input type="text" name="location" autoComplete="address-level1" required />
              </label>

              <label>
                <span>How often do you travel for golf or business?</span>
                <input type="text" name="travelFrequency" required />
              </label>

              <label className="request-form-wide">
                <span>What interests you most about EliteTee?</span>
                <textarea name="interest" rows={4} required />
              </label>

              <div className="request-form-actions">
                <button type="submit" className="btn" disabled={submitting}>
                  Request consideration
                </button>
                {error ? (
                  <p className="request-form-error" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
