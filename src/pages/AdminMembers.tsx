import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createMemberProfile, parseListInput } from "../lib/memberProfiles";
import { supabase } from "../lib/supabase";
import "../inside-elitetee.css";
import "../member-portal.css";

type FormState = {
  full_name: string;
  email: string;
  primary_club: string;
  additional_clubs: string;
  based_in: string;
  regions: string;
  industry: string;
  golf_interests: string;
  business_interests: string;
  current_request: string;
  membership_status: string;
  is_verified: boolean;
};

const initialFormState: FormState = {
  full_name: "",
  email: "",
  primary_club: "",
  additional_clubs: "",
  based_in: "",
  regions: "",
  industry: "",
  golf_interests: "",
  business_interests: "",
  current_request: "",
  membership_status: "Verified Member",
  is_verified: true,
};

export function AdminMembers() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login", { replace: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const { data, error } = await createMemberProfile({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      primary_club: form.primary_club.trim(),
      additional_clubs: parseListInput(form.additional_clubs),
      based_in: form.based_in.trim(),
      regions: parseListInput(form.regions),
      industry: form.industry.trim(),
      golf_interests: parseListInput(form.golf_interests),
      business_interests: parseListInput(form.business_interests),
      current_request: form.current_request.trim(),
      membership_status: form.membership_status.trim(),
      is_verified: form.is_verified,
    });

    setIsSubmitting(false);

    if (error) {
      const message =
        error.message.includes("duplicate") || error.message.includes("unique")
          ? "A member profile with this email already exists."
          : error.message;
      setErrorMessage(message);
      return;
    }

    setSuccessMessage(`Member profile created successfully.${data?.id ? ` ID: ${data.id}` : ""}`);
    setForm(initialFormState);
  }

  return (
    <div className="inside-page portal-page">
      <header className="portal-top">
        <Link to="/member-portal" className="portal-logo-link" aria-label="EliteTee member portal">
          <span className="inside-logo-mark portal-logo-mark" aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="portal-btn portal-btn--gold portal-signout"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </button>
      </header>

      <main className="portal-main portal-admin-main">
        <header className="portal-section-head">
          <h1>Admin — Create Member Profile</h1>
          <p>
            Manually add approved applicants to the EliteTee member directory. Applications continue
            to arrive through Formspree.
          </p>
        </header>

        {successMessage ? (
          <p className="portal-alert portal-alert--success" role="status">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="portal-alert portal-alert--error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <form className="portal-admin-form" onSubmit={handleSubmit}>
          <div className="portal-admin-form-grid">
            <label className="portal-profile-field">
              <span>Full Name</span>
              <input
                type="text"
                value={form.full_name}
                onChange={(event) => updateField("full_name", event.target.value)}
                required
              />
            </label>

            <label className="portal-profile-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                required
              />
            </label>

            <label className="portal-profile-field">
              <span>Primary Club</span>
              <input
                type="text"
                value={form.primary_club}
                onChange={(event) => updateField("primary_club", event.target.value)}
                required
              />
            </label>

            <label className="portal-profile-field">
              <span>Based In</span>
              <input
                type="text"
                value={form.based_in}
                onChange={(event) => updateField("based_in", event.target.value)}
                required
              />
            </label>

            <label className="portal-profile-field">
              <span>Industry</span>
              <input
                type="text"
                value={form.industry}
                onChange={(event) => updateField("industry", event.target.value)}
                required
              />
            </label>

            <label className="portal-profile-field">
              <span>Membership Status</span>
              <select
                value={form.membership_status}
                onChange={(event) => updateField("membership_status", event.target.value)}
                required
              >
                <option value="Founding Member">Founding Member</option>
                <option value="Verified Member">Verified Member</option>
              </select>
            </label>

            <label className="portal-profile-field portal-profile-field--full">
              <span>Additional Clubs</span>
              <textarea
                rows={3}
                value={form.additional_clubs}
                onChange={(event) => updateField("additional_clubs", event.target.value)}
                placeholder="One club per line"
              />
            </label>

            <label className="portal-profile-field portal-profile-field--full">
              <span>Regions</span>
              <textarea
                rows={3}
                value={form.regions}
                onChange={(event) => updateField("regions", event.target.value)}
                placeholder="One region per line"
                required
              />
            </label>

            <label className="portal-profile-field portal-profile-field--full">
              <span>Golf Interests</span>
              <textarea
                rows={3}
                value={form.golf_interests}
                onChange={(event) => updateField("golf_interests", event.target.value)}
                placeholder="One interest per line"
              />
            </label>

            <label className="portal-profile-field portal-profile-field--full">
              <span>Business Interests</span>
              <textarea
                rows={3}
                value={form.business_interests}
                onChange={(event) => updateField("business_interests", event.target.value)}
                placeholder="One interest per line"
              />
            </label>

            <label className="portal-profile-field portal-profile-field--full">
              <span>Current Request</span>
              <textarea
                rows={3}
                value={form.current_request}
                onChange={(event) => updateField("current_request", event.target.value)}
                placeholder="What the member is currently seeking"
              />
            </label>

            <label className="portal-profile-field portal-profile-field--checkbox">
              <input
                type="checkbox"
                checked={form.is_verified}
                onChange={(event) => updateField("is_verified", event.target.checked)}
              />
              <span>Verified Member</span>
            </label>
          </div>

          <button
            type="submit"
            className="portal-btn portal-btn--gold portal-admin-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Create Member Profile"}
          </button>
        </form>
      </main>
    </div>
  );
}
