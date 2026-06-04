import { useState } from "react";

// Replace YOUR_FORM_ID with your real Formspree form ID from https://formspree.io
// Example: https://formspree.io/f/xvzyndnb → use "xvzyndnb" in place of YOUR_FORM_ID
const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

export function RequestIntroduction() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <section
      id="request"
      className="section section--request section--compact"
      aria-labelledby="request-heading"
    >
      <div className="layout request-layout request-layout--membership">
        <header className="section-intro request-intro request-intro--membership">
          <p className="request-desk-line">
            Applications are reviewed privately by the membership desk.
          </p>
          <h2 id="request-heading">Apply for membership</h2>
          <p className="section-lead request-lead">
            Founding membership is reviewed privately. Pricing and membership details are
            shared individually as the network develops.
          </p>
        </header>

        <div className="request-panel">
          {submitted ? (
            <div className="request-success" role="status" aria-live="polite">
              <p className="request-success-body">
                Thank you. Your request has been received and will be reviewed privately.
              </p>
            </div>
          ) : (
            <form
              className="request-form request-form--application"
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);

                try {
                  const response = await fetch(FORMSPREE_ENDPOINT, {
                    method: "POST",
                    body: new FormData(e.currentTarget),
                    headers: { Accept: "application/json" },
                  });

                  if (response.ok) {
                    setSubmitted(true);
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
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
                <span>Home Club</span>
                <input type="text" name="homeClub" autoComplete="organization" required />
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

              <label className="request-form-wide">
                <span>What interests you about EliteTee?</span>
                <textarea name="interest" rows={4} required />
              </label>

              <div className="request-form-actions">
                <button type="submit" className="btn" disabled={submitting}>
                  Submit application
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
