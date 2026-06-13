import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export function RequestIntroductionPage() {
  const [submitted, setSubmitted] = useState(false);
  const formId = useMemo(() => "elitetee-introduction-request-form", []);

  return (
    <>
      <header className="nav nav--directory is-scrolled">
        <div className="layout nav-inner">
          <Link to="/" className="logo">
            EliteTee
          </Link>
          <p className="directory-nav-label">Private request</p>
        </div>
      </header>

      <main className="directory-page request-page">
        <div className="layout request-layout">
          <header className="section-intro request-intro">
            <p className="request-desk-line">
              Applications are reviewed privately by the membership desk.
            </p>
            <h1 className="request-page-title">Request an introduction</h1>
            <p className="section-lead request-lead">
              Share who you would like to meet and why. Correspondence remains private.
            </p>
          </header>

          <div className="request-panel">
            {submitted ? (
              <div className="request-success" role="status" aria-live="polite">
                <p className="request-success-body">
                  Your request has been received. The membership desk will review it privately.
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
                  <span>Your Name</span>
                  <input type="text" name="yourName" autoComplete="name" required />
                </label>

                <label>
                  <span>Member You Want To Meet</span>
                  <input type="text" name="memberToMeet" required />
                </label>

                <label className="request-form-wide">
                  <span>Reason For Introduction</span>
                  <textarea name="reason" rows={4} required />
                </label>

                <label className="request-form-wide">
                  <span>Travel Plans (Optional)</span>
                  <textarea name="travelPlans" rows={3} />
                </label>

                <div className="request-form-actions">
                  <button type="submit" className="btn">
                    Submit request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="footer directory-footer">
        <div className="layout footer-inner">
          <div className="footer-brand">
            <p className="footer-copy">© EliteTee</p>
            <p className="footer-tagline">A private golf network of vetted members.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
