import { useMemo, useState } from "react";

export function RequestIntroduction() {
  const [submitted, setSubmitted] = useState(false);
  const formId = useMemo(() => "elitetee-request-form", []);

  return (
    <section id="request" className="section section--request section--compact" aria-labelledby="request-heading">
      <div className="layout request-layout">
        <header className="section-intro request-intro">
          <p className="request-desk-line">
            Applications are reviewed privately by the membership desk.
          </p>
          <h2 id="request-heading">Request an introduction</h2>
          <p className="section-lead request-lead">
            Name, home club, and a brief note. Correspondence remains private.
          </p>
        </header>

        <div className="request-panel">
          {submitted ? (
            <div className="request-success" role="status" aria-live="polite">
              <p className="request-success-title">Received.</p>
              <p className="request-success-body">
                Your request has been received by the membership desk. Applications are reviewed
                individually and correspondence is handled privately.
              </p>
            </div>
          ) : (
            <form
              id={formId}
              className="request-form request-form--application"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
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
                <input type="text" name="companyProfession" autoComplete="organization-title" required />
              </label>

              <label>
                <span>Location</span>
                <input type="text" name="primaryRegion" autoComplete="address-level1" required />
              </label>

              <label className="request-form-wide">
                <span>What interests you about EliteTee?</span>
                <textarea name="interest" rows={4} required />
              </label>

              <div className="request-form-actions">
                <button type="submit" className="btn">
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
