import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { finishInviteActivationAfterAuth } from "../lib/inviteCompletion";
import {
  consumeAuthEntryCallback,
  shouldEnterSetPasswordMode,
} from "../lib/completeAuthEntry";
import { getEmailRedirectTo } from "../lib/siteUrl";
import "../inside-elitetee.css";

type LoginLocationState = {
  recoveryVerified?: boolean;
  authError?: string;
};

const SIGN_IN_IMAGE = "/images/elitetee-member-gate.png";

function modeHeading(
  accessMode: "sign-in" | "request-reset" | "validating-recovery" | "set-password",
): string {
  if (accessMode === "request-reset") return "Reset Password";
  if (accessMode === "validating-recovery") return "Checking Secure Link";
  if (accessMode === "set-password") return "Choose a New Password";
  return "Member Sign In";
}

function modeLead(
  accessMode: "sign-in" | "request-reset" | "validating-recovery" | "set-password",
): string | null {
  if (accessMode === "request-reset") {
    return "Enter your member email and we'll send a secure recovery link.";
  }
  if (accessMode === "validating-recovery") {
    return "Confirming this password-recovery request with EliteTee.";
  }
  if (accessMode === "set-password") {
    return "Use a strong password of at least 8 characters.";
  }
  return null;
}

function submitLabel(
  accessMode: "sign-in" | "request-reset" | "validating-recovery" | "set-password",
  isSigningIn: boolean,
): string {
  if (isSigningIn) {
    return accessMode === "sign-in" ? "Entering…" : "Working…";
  }
  if (accessMode === "request-reset") return "Send Secure Link";
  if (accessMode === "set-password") return "Update Password";
  return "Enter EliteTee";
}

export function InsideEliteTee() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginState = (location.state as LoginLocationState | null) ?? null;
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

    if (shouldEnterSetPasswordMode({ recoveryVerifiedFromRouter: Boolean(loginState?.recoveryVerified) })) {
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
    let recoveryValidated = Boolean(loginState?.recoveryVerified);

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
          const activation = await finishInviteActivationAfterAuth();
          if (!active) return;
          if (activation.ok) {
            navigate("/member-portal", { replace: true });
            return;
          }
          setLoginError(activation.message);
        })();
      }
    });

    void supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!active) return;

      if (expectsRecovery) {
        return;
      }

      if (sessionData.session) {
        const activation = await finishInviteActivationAfterAuth();
        if (!active) return;
        if (activation.ok) {
          navigate("/member-portal", { replace: true });
          return;
        }
        setLoginError(activation.message);
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

      const activation = await finishInviteActivationAfterAuth();
      if (!activation.ok) {
        setLoginError(activation.message);
        return;
      }

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

      consumeAuthEntryCallback();
      setRecoverySessionVerified(false);

      const activation = await finishInviteActivationAfterAuth();
      if (activation.ok) {
        setAccessMode("sign-in");
        setPassword("");
        setConfirmPassword("");
        navigate("/member-portal", { replace: true });
        return;
      }

      await supabase.auth.signOut();
      setPassword("");
      setConfirmPassword("");
      setAccessMode("sign-in");
      setAccessMessage(
        "Password updated. Sign in with your new password to finish enabling portal access.",
      );
      if (activation.message) {
        setLoginError(activation.message);
      }
      navigate("/login", { replace: true });
    } catch {
      setLoginError("We couldn't update your password. Request a new secure link and try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  const heading = modeHeading(accessMode);
  const lead = modeLead(accessMode);
  const showBrandBlock = accessMode === "sign-in";

  return (
    <div className="inside-page inside-page--gate">
      <div className="inside-gate" data-mode={accessMode}>
        <div className="inside-gate-visual" aria-hidden="true">
          <img
            className="inside-gate-visual-image"
            src={SIGN_IN_IMAGE}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
          <div className="inside-gate-visual-overlay" />
        </div>

        <div className="inside-gate-panel">
          <div className="inside-gate-content">
            {showBrandBlock ? (
              <header className="inside-gate-brand">
                <Link to="/" className="inside-gate-brand-link" aria-label="EliteTee home">
                  <span className="inside-logo-mark inside-gate-brand-mark" aria-hidden="true" />
                  <span className="inside-gate-brand-name">EliteTee</span>
                </Link>
                <p className="inside-gate-eyebrow">Private Golf Society</p>
                <p className="inside-gate-tagline">For those who take the game seriously.</p>
              </header>
            ) : (
              <header className="inside-gate-brand inside-gate-brand--compact">
                <Link to="/" className="inside-gate-brand-link" aria-label="EliteTee home">
                  <span className="inside-logo-mark inside-gate-brand-mark" aria-hidden="true" />
                  <span className="inside-gate-brand-name">EliteTee</span>
                </Link>
              </header>
            )}

            {showBrandBlock ? <div className="inside-gate-divider" aria-hidden="true" /> : null}

            <section id="member-access" className="inside-gate-access" aria-label="Member sign in">
              <h1 className="inside-gate-form-title">{heading}</h1>
              {lead ? <p className="inside-gate-form-lead">{lead}</p> : null}

              {accessMode === "validating-recovery" ? (
                <p className="inside-gate-message inside-gate-message--status" role="status">
                  Validating secure link…
                </p>
              ) : (
                <form
                  className="inside-gate-form"
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
                  {accessMode !== "set-password" ? (
                    <label className="inside-gate-field">
                      <span className="inside-gate-label">Email</span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </label>
                  ) : null}

                  {accessMode !== "request-reset" ? (
                    <label className="inside-gate-field inside-gate-field--password">
                      <span className="inside-gate-label">
                        {accessMode === "set-password" ? "New password" : "Password"}
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete={accessMode === "set-password" ? "new-password" : "current-password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="inside-gate-password-toggle"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path
                            d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          />
                          <circle cx="10" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                      </button>
                    </label>
                  ) : null}

                  {accessMode === "set-password" ? (
                    <label className="inside-gate-field">
                      <span className="inside-gate-label">Confirm new password</span>
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                      />
                    </label>
                  ) : null}

                  <button
                    type="submit"
                    className="inside-gate-submit"
                    disabled={isSigningIn}
                    aria-live="polite"
                  >
                    {submitLabel(accessMode, isSigningIn)}
                  </button>

                  {loginError ? (
                    <p className="inside-gate-message inside-gate-message--error" role="alert">
                      {loginError}
                    </p>
                  ) : null}
                  {accessMessage ? (
                    <p className="inside-gate-message inside-gate-message--success" role="status">
                      {accessMessage}
                    </p>
                  ) : null}
                </form>
              )}

              <div className="inside-gate-secondary">
                {accessMode === "sign-in" ? (
                  <>
                    <button
                      type="button"
                      className="inside-gate-secondary-link"
                      onClick={() => {
                        setAccessMode("request-reset");
                        setLoginError(null);
                        setAccessMessage(null);
                      }}
                    >
                      Forgot password?
                    </button>
                    <Link to="/#apply" className="inside-gate-secondary-link">
                      Request membership
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    className="inside-gate-secondary-link"
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
              </div>
            </section>

            <footer className="inside-gate-legal">
              <Link to="/" className="inside-gate-legal-link">
                Privacy
              </Link>
              <span aria-hidden="true">·</span>
              <Link to="/" className="inside-gate-legal-link">
                Terms
              </Link>
              <span aria-hidden="true">·</span>
              <span className="inside-gate-legal-copy">© EliteTee</span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
