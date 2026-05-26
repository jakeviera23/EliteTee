export function RequestIntroduction() {
  return (
    <section id="request" className="section section--request" aria-labelledby="request-heading">
      <div className="layout">
        <header className="section-intro">
          <h2 id="request-heading">Request an introduction</h2>
          <p className="section-lead">
            Write to the membership desk with your name, home club, and the region or
            member you hope to meet. Replies are typically within two business days.
          </p>
        </header>

        <div className="request-panel">
          <form
            className="request-form"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href =
                "mailto:desk@elitetee.example?subject=Introduction%20request";
            }}
          >
            <label>
              <span>Name</span>
              <input type="text" name="name" autoComplete="name" />
            </label>
            <label>
              <span>Home club</span>
              <input type="text" name="club" autoComplete="organization" />
            </label>
            <label>
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" />
            </label>
            <label className="request-form-wide">
              <span>Travel or hosting note</span>
              <textarea
                name="note"
                rows={4}
                placeholder="Dates, region, and any member referral—kept confidential."
              />
            </label>
            <div className="request-form-actions">
              <button type="submit" className="btn">
                Send to membership desk
              </button>
              <a href="mailto:desk@elitetee.example" className="request-email">
                desk@elitetee.example
              </a>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
