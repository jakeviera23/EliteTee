import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchMembershipInviteByToken,
  type MembershipInvitePreview,
} from "../lib/membershipInvites";
import {
  storePendingInviteToken,
  tryCompleteAuthenticatedInviteRedemption,
} from "../lib/membershipInviteRedemption";
import {
  establishInviteSignupSession,
  mapInviteSignupCompletionError,
  resendInviteSignupVerification,
  toInviteSignupUiState,
  validateInviteSignupForm,
  type InviteSignupUiState,
} from "../lib/inviteSignupFlow";
import { getEmailRedirectTo } from "../lib/siteUrl";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  inviteSignupSessionConflict,
  inviteSignupSessionConflictMessage,
} from "../lib/inviteSignupSession";
import {
  clearLegacySharedProfileExtras,
} from "../lib/portalProfileExtras";
import { fetchOwnMemberProfile, memberProfileToSelfUpdate, updateOwnMemberProfile } from "../lib/memberProfiles";
import "../inside-elitetee.css";

export function InviteSignup() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const [invite, setInvite] = useState<MembershipInvitePreview | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [inviteInvalid, setInviteInvalid] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);
  const [uiState, setUiState] = useState<InviteSignupUiState>({ kind: "form" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [activeSessionEmail, setActiveSessionEmail] = useState<string | null>(null);
  const [isSigningOutSession, setIsSigningOutSession] = useState(false);

  const sessionConflict =
    invite && activeSessionEmail
      ? inviteSignupSessionConflict(activeSessionEmail, invite.email)
      : null;

  useEffect(() => {
    let active = true;

    async function loadInvite() {
      setIsLoadingInvite(true);
      setInviteInvalid(false);

      if (!token.trim()) {
        if (active) {
          setInviteInvalid(true);
          setIsLoadingInvite(false);
        }
        return;
      }

      const { data, error } = await fetchMembershipInviteByToken(token);

      if (!active) return;

      if (error) {
        if (import.meta.env.DEV) {
          console.error("[InviteSignup] invite lookup failed", error);
        }
        setInviteInvalid(true);
        setIsLoadingInvite(false);
        return;
      }

      if (!data) {
        setInviteInvalid(true);
        setIsLoadingInvite(false);
        return;
      }

      setInvite(data);
      setEmail(data.email);
      setIsLoadingInvite(false);
    }

    void loadInvite();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const authClient = supabase;
    let active = true;

    async function loadActiveSessionEmail() {
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (!active) return;
      setActiveSessionEmail(session?.user?.email?.trim() || null);
    }

    void loadActiveSessionEmail();

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setActiveSessionEmail(session?.user?.email?.trim() || null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !token.trim()) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user?.email || !invite) return;

      const sessionEmail = session.user.email.trim().toLowerCase();
      if (sessionEmail !== invite.email.trim().toLowerCase()) return;

      void (async () => {
        const result = await tryCompleteAuthenticatedInviteRedemption({ inviteToken: token });
        if (!result.completed) return;

        clearLegacySharedProfileExtras();
        navigate("/member-portal", { replace: true });
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [invite, navigate, token]);

  useEffect(() => {
    let active = true;

    async function redeemInviteForExistingSession() {
      if (!invite || !token.trim() || !isSupabaseConfigured || !supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active || !session?.user?.email) return;

      const sessionEmail = session.user.email.trim().toLowerCase();
      if (sessionEmail !== invite.email.trim().toLowerCase()) return;

      const result = await tryCompleteAuthenticatedInviteRedemption({ inviteToken: token });
      if (!active) return;

      if (!result.completed) {
        if (result.error && import.meta.env.DEV) {
          console.error("[InviteSignup] invite redemption failed", result.error);
        }
        return;
      }

      clearLegacySharedProfileExtras();
      navigate("/member-portal", { replace: true });
    }

    void redeemInviteForExistingSession();

    return () => {
      active = false;
    };
  }, [invite, navigate, token]);

  async function handleSignOutAndContinue() {
    if (!supabase || isSigningOutSession) return;

    setSubmitError(null);
    setSubmitInfo(null);
    setIsSigningOutSession(true);

    try {
      await supabase.auth.signOut();
      setActiveSessionEmail(null);
    } catch {
      setSubmitError("We couldn't sign you out. Please try again.");
    } finally {
      setIsSigningOutSession(false);
    }
  }

  async function handleResendVerification() {
    if (!invite || !supabase || isResending) return;

    setSubmitError(null);
    setSubmitInfo(null);
    setIsResending(true);

    try {
      const result = await resendInviteSignupVerification(supabase.auth, invite.email, {
        emailRedirectTo: getEmailRedirectTo(),
      });
      if (result.ok) {
        setSubmitInfo(result.message);
      } else {
        setSubmitError(result.message);
      }
    } finally {
      setIsResending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitInfo(null);

    if (!invite || uiState.kind !== "form") return;

    if (sessionConflict) {
      setSubmitError(
        inviteSignupSessionConflictMessage(
          sessionConflict.signedInEmail,
          sessionConflict.inviteEmail,
        ),
      );
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setSubmitError("Account setup is temporarily unavailable. Please try again later.");
      return;
    }

    const validation = validateInviteSignupForm({
      email,
      inviteEmail: invite.email,
      password,
      confirmPassword,
    });

    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    setIsSubmitting(true);
    storePendingInviteToken(token);

    try {
      const authResult = await establishInviteSignupSession(
        supabase.auth,
        validation.normalizedEmail,
        password,
        { emailRedirectTo: getEmailRedirectTo() },
      );

      if (authResult.status === "session") {
        const redemption = await tryCompleteAuthenticatedInviteRedemption({ inviteToken: token });
        if (!redemption.completed) {
          setSubmitError(mapInviteSignupCompletionError(redemption.error));
          return;
        }

        clearLegacySharedProfileExtras();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id && invite.handicap?.trim()) {
          const { data: profile } = await fetchOwnMemberProfile();
          if (profile) {
            await updateOwnMemberProfile({
              ...memberProfileToSelfUpdate(profile),
              handicap: invite.handicap.trim(),
            });
          }
        }

        if (import.meta.env.DEV) {
          console.info("[InviteSignup] invite redeemed for member profile", {
            email: validation.normalizedEmail,
            foundingMemberNumber: invite.founding_member_number,
          });
        }

        navigate("/member-portal", { replace: true });
        return;
      }

      if (authResult.status === "pending_verification" || authResult.status === "account_exists") {
        setUiState(toInviteSignupUiState(authResult));
        setSubmitInfo(authResult.message);
        return;
      }

      setSubmitError(authResult.message);
    } catch {
      setSubmitError("We couldn't finish setting up your account. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const showFollowUpActions = uiState.kind !== "form";

  return (
    <div className="inside-page invite-page">
      <header className="inside-topnav">
        <div className="inside-topnav-inner">
          <Link to="/" className="inside-logo" aria-label="EliteTee home">
            <span className="inside-logo-mark" aria-hidden="true" />
            <span>EliteTee</span>
          </Link>
        </div>
      </header>

      <main className="invite-main">
        <section className="invite-card" aria-labelledby="invite-heading">
          {isLoadingInvite ? (
            <p className="invite-status">Loading your invitation...</p>
          ) : inviteInvalid || !invite ? (
            <>
              <h1 id="invite-heading">Invitation unavailable</h1>
              <p className="invite-lead">This invite link is invalid or expired.</p>
              <p className="invite-note">
                If you believe this is a mistake, contact{" "}
                <a href="mailto:membership@elitetee.club">membership@elitetee.club</a>.
              </p>
              <Link to="/login" className="portal-btn portal-btn--outline invite-back-link">
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <p className="invite-eyebrow">Founding Member Invitation</p>
              <h1 id="invite-heading">Welcome, {invite.full_name}</h1>
              <p className="invite-lead">
                You&apos;ve been approved as{" "}
                <strong>{invite.founding_member_number ?? "a founding member"}</strong>. Create your
                private login to enter the EliteTee member portal.
              </p>

              {showFollowUpActions ? (
                <div className="invite-followup">
                  {submitInfo ? (
                    <p className="invite-info" role="status">
                      {submitInfo}
                    </p>
                  ) : null}

                  {submitError ? (
                    <p className="invite-error" role="alert">
                      {submitError}
                    </p>
                  ) : null}

                  <div className="invite-actions">
                    <Link to="/login" className="portal-btn portal-btn--gold invite-action-link">
                      Sign in
                    </Link>

                    {uiState.kind === "pending_verification" && uiState.canResend ? (
                      <button
                        type="button"
                        className="portal-btn portal-btn--outline invite-action-button"
                        onClick={() => void handleResendVerification()}
                        disabled={isResending}
                      >
                        {isResending ? "Sending verification email..." : "Resend verification email"}
                      </button>
                    ) : null}

                    {uiState.kind === "account_exists" ? (
                      <button
                        type="button"
                        className="portal-btn portal-btn--outline invite-action-button"
                        onClick={() => void handleResendVerification()}
                        disabled={isResending}
                      >
                        {isResending ? "Sending verification email..." : "Resend verification email"}
                      </button>
                    ) : null}
                  </div>

                  <p className="invite-note">
                    Do not create another account with the same email. The confirmation link opens
                    EliteTee and finishes your invitation. If that link has expired, sign in with the
                    password you just created.
                  </p>
                </div>
              ) : sessionConflict ? (
                <div className="invite-followup">
                  <p className="invite-info" role="status">
                    {inviteSignupSessionConflictMessage(
                      sessionConflict.signedInEmail,
                      sessionConflict.inviteEmail,
                    )}
                  </p>

                  {submitError ? (
                    <p className="invite-error" role="alert">
                      {submitError}
                    </p>
                  ) : null}

                  <div className="invite-actions">
                    <button
                      type="button"
                      className="portal-btn portal-btn--gold invite-action-button"
                      onClick={() => void handleSignOutAndContinue()}
                      disabled={isSigningOutSession}
                    >
                      {isSigningOutSession ? "Signing out..." : "Sign out and continue"}
                    </button>
                  </div>

                  <p className="invite-note">
                    This private invite is for {invite.email}. Sign out of your current EliteTee
                    account first, then create the invited member login here.
                  </p>
                </div>
              ) : (
                <form className="invite-form" onSubmit={handleSubmit}>
                  <label className="invite-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                      readOnly
                    />
                  </label>

                  <label className="invite-field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </label>

                  <label className="invite-field">
                    <span>Confirm password</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </label>

                  {submitError ? (
                    <p className="invite-error" role="alert">
                      {submitError}
                    </p>
                  ) : null}

                  {submitInfo ? (
                    <p className="invite-info" role="status">
                      {submitInfo}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    className="portal-btn portal-btn--gold invite-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating account..." : "Create account"}
                  </button>

                  <p className="invite-note invite-note--center">
                    Already confirmed your email?{" "}
                    <Link to="/login">Sign in</Link>.
                  </p>
                </form>
              )}

              <p className="invite-note">
                This private link is for {invite.email} only. Do not share it publicly.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
