import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../inside-elitetee.css";
import "../member-portal.css";

export function MemberPortal() {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="inside-page member-portal-page">
      <header className="inside-topnav">
        <div className="inside-topnav-inner">
          <Link to="/" className="inside-logo" aria-label="EliteTee home">
            <span className="inside-logo-mark" aria-hidden="true" />
            <span>EliteTee</span>
          </Link>
        </div>
      </header>

      <main className="member-portal-main">
        <article className="member-portal-card">
          <p className="inside-eyebrow">Private Member Portal</p>
          <h1>EliteTee Member Portal</h1>
          <p className="member-portal-subtitle">Member access confirmed.</p>
          <p className="inside-lead">
            The private member platform is now connected successfully.
          </p>
          <button
            type="button"
            className="inside-btn inside-btn--gold member-portal-signout"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </button>
        </article>
      </main>
    </div>
  );
}
