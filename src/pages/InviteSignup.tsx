import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  completeMembershipInvite,
  fetchMembershipInviteByToken,
  type MembershipInvitePreview,
} from "../lib/membershipInvites";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  clearLegacySharedProfileExtras,
  defaultPortalProfileExtras,
  getPortalProfileExtras,
  savePortalProfileExtras,
} from "../lib/portalProfileExtras";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        console.error("[InviteSignup] invite lookup failed", error);
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

  async function establishSession(inviteEmail: string, invitePassword: string) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const signUp = await supabase.auth.signUp({
      email: inviteEmail,
      password: invitePassword,
    });

    if (signUp.error && !signUp.error.message.toLowerCase().includes("already")) {
      throw signUp.error;
    }

    if (signUp.data.session) {
      return signUp.data.session;
    }

    const signIn = await supabase.auth.signInWithPassword({
      email: inviteEmail,
      password: invitePassword,
    });

    if (signIn.error) {
      if (signUp.data.user && !signUp.data.session) {
        throw new Error(
          "Account created. Check your email to confirm your address, then return to this invite link to finish setup.",
        );
      }
      throw signIn.error;
    }

    return signIn.data.session;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!invite) return;

    if (!isSupabaseConfigured || !supabase) {
      setSubmitError("Account setup is temporarily unavailable. Please try again later.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== invite.email) {
      setSubmitError("Use the same email address that was approved for this invitation.");
      return;
    }

    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await establishSession(normalizedEmail, password);
      if (!session) {
        setSubmitError("Unable to start your session. Please try again.");
        return;
      }

      const { error: completeError } = await completeMembershipInvite(token);
      if (completeError) {
        console.error("[InviteSignup] complete invite failed", completeError.message);
        setSubmitError(completeError.message);
        return;
      }

      clearLegacySharedProfileExtras();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id && invite.handicap?.trim()) {
        const existingExtras = getPortalProfileExtras(user.id);
        savePortalProfileExtras(user.id, {
          ...defaultPortalProfileExtras,
          ...existingExtras,
          handicap: invite.handicap.trim(),
        });
      }

      console.info("[InviteSignup] invite redeemed for member profile", {
        email: normalizedEmail,
        foundingMemberNumber: invite.founding_member_number,
      });

      navigate("/member-portal", { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

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

                <button type="submit" className="portal-btn portal-btn--gold invite-submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
              </form>

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
