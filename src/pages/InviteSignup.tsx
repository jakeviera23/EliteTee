import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  completeMembershipInvite,
  fetchMembershipInviteByToken,
  type MembershipInvitePreview,
} from "../lib/membershipInvites";
import {
  establishInviteSignupSession,
  mapInviteSignupCompletionError,
  resendInviteSignupVerification,
  toInviteSignupUiState,
  validateInviteSignupForm,
  type InviteSignupUiState,
} from "../lib/inviteSignupFlow";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
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

  async function handleResendVerification() {
    if (!invite || !supabase || isResending) return;

    setSubmitError(null);
    setSubmitInfo(null);
    setIsResending(true);

    try {
      const result = await resendInviteSignupVerification(supabase.auth, invite.email);
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

    try {
      const authResult = await establishInviteSignupSession(
        supabase.auth,
        validation.normalizedEmail,
        password,
      );

      if (authResult.status === "session") {
        const { error: completeError } = await completeMembershipInvite(token);
        if (completeError) {
          setSubmitError(mapInviteSignupCompletionError(completeError));
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
                    Do not create another account with the same email. After your address is verified,
                    sign in to finish redeeming this invitation.
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
