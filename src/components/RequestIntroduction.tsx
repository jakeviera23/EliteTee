import { useState, type FormEvent } from "react";
import { submitMembershipApplication } from "../lib/membershipApplications";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xvzyndnb";

const PLACEHOLDER_ENDPOINT = /YOUR_FORM_ID|YOUR_REAL_FORM_ID/i.test(
  FORMSPREE_ENDPOINT,
);

const SUCCESS_MESSAGE =
  "Your request has been received. We'll review it thoughtfully.";

export function RequestIntroduction() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const application = {
      full_name: String(formData.get("fullName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      location: String(formData.get("location") ?? "").trim(),
      home_club: String(formData.get("homeClub") ?? "").trim(),
      handicap: String(formData.get("handicap") ?? "").trim(),
      instagram: String(formData.get("instagram") ?? "").trim(),
      golf_love: String(formData.get("golfLove") ?? "").trim(),
      why_join: String(formData.get("whyJoin") ?? "").trim(),
    };

    setSubmitting(true);

    try {
      const { error: supabaseError } = await submitMembershipApplication(application);

      if (supabaseError) {
        console.error("[RequestMembership] Supabase application insert failed", {
          error: supabaseError,
          application,
        });
        setError(
          "Unable to save your application right now. Please try again or email membership@elitetee.club.",
        );
        return;
      }

      if (!PLACEHOLDER_ENDPOINT) {
        try {
          await fetch(FORMSPREE_ENDPOINT, {
            method: "POST",
            body: formData,
            headers: { Accept: "application/json" },
          });
        } catch {
          // Supabase save succeeded; Formspree notification is optional.
        }
      }

      setSubmitted(true);
    } catch (unexpectedError) {
      console.error("[RequestMembership] unexpected submission failure", unexpectedError);
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
          <h2 id="request-heading">Request Membership</h2>
          <p className="section-lead request-lead">
            EliteTee is a curated golf community for serious golfers to share rounds, discover
            courses, and build trusted relationships through the game.
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
                <span>Email</span>
                <input type="email" name="email" autoComplete="email" required />
              </label>

              <label>
                <span>Location</span>
                <input type="text" name="location" autoComplete="address-level1" required />
              </label>

              <label>
                <span>Home Course / Where You Play Most</span>
                <input type="text" name="homeClub" autoComplete="organization" required />
              </label>

              <label>
                <span>Handicap (optional)</span>
                <input type="text" name="handicap" inputMode="decimal" />
              </label>

              <label>
                <span>Instagram (optional)</span>
                <input type="text" name="instagram" autoComplete="username" placeholder="@username" />
              </label>

              <label className="request-form-wide">
                <span>What do you love most about golf?</span>
                <textarea name="golfLove" rows={3} required />
              </label>

              <label className="request-form-wide">
                <span>Why do you want to join EliteTee?</span>
                <textarea name="whyJoin" rows={4} required />
              </label>

              <div className="request-form-actions">
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? "Submitting…" : "Request Membership"}
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
