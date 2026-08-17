import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { navLinks } from "../data/content";
import {
  foundingCta,
  memberAccessLead,
  membershipSteps,
  portalNavItems,
  privacyPoints,
  privacyTitle,
  societyHero,
  trustPoints,
  whyEliteTee,
} from "../data/insidePreview";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { tryCompleteAuthenticatedInviteRedemption } from "../lib/membershipInviteRedemption";
import { getEmailRedirectTo } from "../lib/siteUrl";
import "../inside-elitetee.css";

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="inside-lock-icon">
      <rect x="4.5" y="9" width="11" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function InsideTopNav() {
  const location = useLocation();

  return (
    <header className="inside-topnav">
      <div className="inside-topnav-inner">
        <Link to="/" className="inside-logo" aria-label="EliteTee home">
          <span className="inside-logo-mark" aria-hidden="true" />
          <span>EliteTee</span>
        </Link>
        <nav className="inside-topnav-links" aria-label="Primary">
          {navLinks.map((link) => {
            const isInside = link.href === "/inside" || link.href === "/login";
            const isActive = isInside && (location.pathname === "/inside" || location.pathname === "/login");
            const className = `inside-topnav-link${isActive ? " is-active" : ""}${link.className ? ` ${link.className}` : ""}`;

            if (link.href.startsWith("#")) {
              return (
                <Link key={link.href} to={{ pathname: "/", hash: link.href }} className={className}>
                  {link.label}
                </Link>
              );
            }

            return (
              <Link key={link.href} to={link.href} className={className}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

type LoginLocationState = {
  recoveryVerified?: boolean;
  authError?: string;
};

export function InsideEliteTee() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginState = (location.state as LoginLocationState | null) ?? null;
  const [activeNav, setActiveNav] = useState("society");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(loginState?.authError ?? null);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [accessMode, setAccessMode] = useState<
    "sign-in" | "request-reset" | "validating-recovery" | "set-password"
  >(
    () =>
      loginState?.recoveryVerified
        ? "set-password"
        : new URLSearchParams(window.location.search).get("recovery") === "1"
          ? "validating-recovery"
          : "sign-in",
  );
  const [recoverySessionVerified, setRecoverySessionVerified] = useState(
    () => Boolean(loginState?.recoveryVerified),
  );
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!supabase) {
      if (new URLSearchParams(window.location.search).get("recovery") === "1") {
        setAccessMode("request-reset");
        setLoginError("Password recovery is temporarily unavailable. Please contact membership@elitetee.club.");
      }
      return;
    }

    if (loginState?.recoveryVerified) {
      setRecoverySessionVerified(true);
      setAccessMode("set-password");
      setLoginError(null);
      return;
    }

    if (loginState?.authError) {
      setLoginError(loginState.authError);
    }

    let active = true;
    const expectsRecovery = new URLSearchParams(window.location.search).get("recovery") === "1";
    let recoveryValidated = loginState?.recoveryVerified ?? false;

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY") {
        recoveryValidated = true;
        setRecoverySessionVerified(true);
        setAccessMode("set-password");
        setLoginError(null);
        return;
      }

      if (event === "SIGNED_IN" && session && !expectsRecovery && !loginState?.recoveryVerified) {
        void (async () => {
          await tryCompleteAuthenticatedInviteRedemption();
          if (active) navigate("/member-portal", { replace: true });
        })();
      }
    });

    void supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!active) return;

      if (expectsRecovery && sessionData.session) {
        recoveryValidated = true;
        setRecoverySessionVerified(true);
        setAccessMode("set-password");
        setLoginError(null);
        return;
      }

      if (expectsRecovery) {
        return;
      }

      if (sessionData.session) {
        await tryCompleteAuthenticatedInviteRedemption();
        if (active) navigate("/member-portal", { replace: true });
      }
    });

    const validationTimer = expectsRecovery
      ? window.setTimeout(() => {
          if (!recoveryValidated) {
            setLoginError("This recovery link is invalid or has expired. Request a new secure link.");
            setAccessMode("request-reset");
          }
        }, 8000)
      : null;

    return () => {
      active = false;
      data.subscription.unsubscribe();
      if (validationTimer !== null) window.clearTimeout(validationTimer);
    };
  }, [loginState?.authError, loginState?.recoveryVerified, navigate]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoginError(null);

    if (!isSupabaseConfigured || !supabase) {
      setLoginError("Member login is temporarily unavailable. You can still request membership below.");
      return;
    }

    setIsSigningIn(true);

    try {
      const response = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.error) {
        const isInvalidCredentials = /invalid login credentials/i.test(response.error.message);
        setLoginError(
          isInvalidCredentials
            ? "The email or password is incorrect. Please try again or reset your password."
            : "Sign in could not be completed. Please try again.",
        );
        return;
      }

      if (!response.data.session) {
        setLoginError("Sign in could not be completed. Please try again.");
        return;
      }

      await tryCompleteAuthenticatedInviteRedemption();

      navigate("/member-portal", { replace: true });
    } catch (error) {
      if (import.meta.env.DEV) console.error("[InsideEliteTee] unexpected sign-in failure", error);
      setLoginError("Sign in could not be completed. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    setAccessMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      setLoginError("Password recovery is temporarily unavailable. Please contact membership@elitetee.club.");
      return;
    }

    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: getEmailRedirectTo(),
      });

      if (error) {
        setLoginError("We couldn't send a recovery email right now. Please try again shortly.");
        return;
      }

      setAccessMessage(
        "If an EliteTee account exists for that email, a secure password link is on its way.",
      );
    } catch {
      setLoginError("We couldn't send a recovery email right now. Please try again shortly.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    setAccessMessage(null);

    if (!recoverySessionVerified) {
      setLoginError("This recovery link is invalid or has expired. Request a new secure link.");
      setAccessMode("request-reset");
      return;
    }

    if (password.length < 8) {
      setLoginError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setLoginError("Passwords do not match.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setLoginError("Password recovery is temporarily unavailable. Please contact membership@elitetee.club.");
      return;
    }

    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setLoginError(
          "This recovery link is invalid or has expired. Request a new secure link and try again.",
        );
        return;
      }

      await supabase.auth.signOut();
      setPassword("");
      setConfirmPassword("");
      setAccessMode("sign-in");
      setAccessMessage("Password updated. Sign in with your new password.");
      navigate("/login", { replace: true });
    } catch {
      setLoginError("We couldn't update your password. Request a new secure link and try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  useEffect(() => {
    const ids = portalNavItems.map((item) => item.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveNav(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.2, 0.4] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="inside-page">
      <InsideTopNav />

      <div className="inside-shell">
        <aside className="inside-sidebar" aria-label="Member sign in">
          <article id="member-access" className="inside-access-card">
            <h2 className="inside-access-title">
              {accessMode === "request-reset"
                ? "Reset Password"
                : accessMode === "validating-recovery"
                  ? "Checking Secure Link"
                : accessMode === "set-password"
                  ? "Choose a New Password"
                  : "Sign In"}
            </h2>
            <p className="inside-access-lead">
              {accessMode === "request-reset"
                ? "Enter your member email and we'll send a secure recovery link."
                : accessMode === "validating-recovery"
                  ? "Confirming this password-recovery request with EliteTee."
                : accessMode === "set-password"
                  ? "Use a strong password of at least 8 characters."
                  : memberAccessLead}
            </p>
            {accessMode === "validating-recovery" ? (
              <p className="inside-access-success" role="status">Validating secure link…</p>
            ) : <form
              className="inside-access-form"
              onSubmit={
                accessMode === "request-reset"
                  ? handleRequestReset
                  : accessMode === "set-password"
                    ? handleSetPassword
                    : handleSignIn
              }
              aria-label={accessMode === "sign-in" ? "Member sign in" : "Password recovery"}
              aria-busy={isSigningIn}
            >
              {accessMode !== "set-password" ? <label>
                <span className="visually-hidden">Email address</span>
                <input
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label> : null}
              {accessMode !== "request-reset" ? <label className="inside-password-field">
                <span className="visually-hidden">Password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                    autoComplete={accessMode === "set-password" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="inside-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="10" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
              </label> : null}
              {accessMode === "set-password" ? (
                <label>
                  <span className="visually-hidden">Confirm new password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </label>
              ) : null}
              <button
                type="submit"
                className="inside-btn inside-btn--gold"
                disabled={isSigningIn}
                aria-live="polite"
              >
                {isSigningIn
                  ? accessMode === "sign-in" ? "Signing in..." : "Working..."
                  : accessMode === "request-reset"
                    ? "Send Secure Link"
                    : accessMode === "set-password"
                      ? "Update Password"
                      : "Sign In"}
              </button>
              {loginError ? (
                <p className="inside-access-error" role="alert">
                  {loginError}
                </p>
              ) : null}
              {accessMessage ? (
                <p className="inside-access-success" role="status">
                  {accessMessage}
                </p>
              ) : null}
            </form>}
            <p className="inside-access-footer">
              {accessMode === "sign-in" ? (
                <>
                  <button
                    type="button"
                    className="inside-access-link inside-access-link--button"
                    onClick={() => {
                      setAccessMode("request-reset");
                      setLoginError(null);
                      setAccessMessage(null);
                    }}
                  >
                    Forgot password?
                  </button>
                  <span aria-hidden="true"> · </span>
                  <Link to="/#apply" className="inside-access-link">
                    Apply for Early Access
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  className="inside-access-link inside-access-link--button"
                  onClick={() => {
                    setAccessMode("sign-in");
                    setLoginError(null);
                    setAccessMessage(null);
                    if (location.search) navigate("/login", { replace: true });
                  }}
                >
                  Back to sign in
                </button>
              )}
            </p>
          </article>

          <nav aria-label="Society sections">
            <ul className="inside-sidebar-nav">
              {portalNavItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`inside-sidebar-link${activeNav === item.id ? " is-active" : ""}`}
                    aria-current={activeNav === item.id ? "page" : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <p className="inside-sidebar-foot">
            <LockIcon />
            <span className="inside-sidebar-foot-copy">
              Curated golf community.
              <br />
              Serious golfers only.
              <br />
              Quality over scale.
            </span>
          </p>
        </aside>

        <main className="inside-main">
          <section id="society" className="inside-section">
            <header className="inside-hero">
              <p className="inside-eyebrow">EliteTee Society</p>
              <h1>{societyHero.title}</h1>
              <p className="inside-lead">{societyHero.text}</p>
            </header>
            <ul className="inside-trust-row">
              {trustPoints.map((point) => (
                <li key={point}>
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M3.5 8.2 6.4 11 12.5 5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
          </section>

          <section id="why-elitetee" className="inside-section inside-section--alt">
            <header className="inside-section-head">
              <h2>{whyEliteTee.title}</h2>
              <p className="inside-lead">{whyEliteTee.text}</p>
            </header>
          </section>

          <section id="how-membership-works" className="inside-section">
            <header className="inside-section-head">
              <p className="inside-eyebrow">Membership</p>
              <h2>How Membership Works</h2>
            </header>
            <ol className="inside-timeline">
              {membershipSteps.map((step) => (
                <li key={step.step} className="inside-timeline-step">
                  <span className="inside-step-num">{step.step}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="privacy" className="inside-section">
            <header className="inside-section-head">
              <h2>{privacyTitle}</h2>
            </header>
            <ul className="inside-privacy-list">
              {privacyPoints.map((item) => (
                <li key={item}>
                  <LockIcon />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section id="apply" className="inside-section inside-section--cta">
            <article className="inside-cta-card">
              <h2>{foundingCta.title}</h2>
              <p>{foundingCta.text}</p>
              <Link to="/#apply" className="inside-btn inside-btn--gold inside-btn--lg">
                {foundingCta.button}
              </Link>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
