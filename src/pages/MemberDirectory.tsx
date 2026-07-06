import { Link } from "react-router-dom";
import { earlyStageCopy } from "../data/portalSocial";

export function MemberDirectory() {
  return (
    <>
      <header className="nav nav--directory is-scrolled">
        <div className="layout nav-inner">
          <Link to="/" className="logo">
            EliteTee
          </Link>
          <p className="directory-nav-label">Private directory</p>
        </div>
      </header>

      <main className="directory-page">
        <div className="layout">
          <header className="directory-header">
            <p className="directory-eyebrow">Members only</p>
            <h1 className="directory-title">Member directory</h1>
            <p className="directory-lead">{earlyStageCopy.noPublicDirectory}</p>
          </header>

          <div className="directory-empty directory-empty--early">
            <p>{earlyStageCopy.earlyCommunity}</p>
            <p>{earlyStageCopy.memberActivityPending}</p>
          </div>
        </div>
      </main>

      <footer className="footer directory-footer">
        <div className="layout footer-inner">
          <div className="footer-brand">
            <p className="footer-copy">© EliteTee</p>
            <p className="footer-tagline">Building trusted relationships through golf.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
