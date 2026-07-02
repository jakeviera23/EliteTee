import { FormEvent, useEffect, useState } from "react";
import {
  buildListFieldUpdate,
  buildTextFieldUpdate,
  fetchOwnMemberProfile,
  formatListForInput,
  updateOwnMemberProfile,
} from "../../lib/memberProfiles";
import { formatMembershipLabel } from "../../lib/portalDisplay";
import { MemberIdentity } from "./MemberClubAvatar";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";

type ProfileFormState = {
  full_name: string;
  primary_club: string;
  based_in: string;
  industry: string;
  traveling_to: string;
  additional_clubs: string;
  regions: string;
  golf_interests: string;
  business_interests: string;
  current_request: string;
};

const NO_LINKED_PROFILE_MESSAGE = "No dossier is linked to this account yet.";

function profileToFormState(profile: MemberProfileRecord): ProfileFormState {
  return {
    full_name: profile.full_name ?? "",
    primary_club: profile.primary_club ?? "",
    based_in: profile.based_in ?? "",
    industry: profile.industry ?? "",
    traveling_to: profile.traveling_to ?? "",
    additional_clubs: formatListForInput(profile.additional_clubs),
    regions: formatListForInput(profile.regions),
    golf_interests: formatListForInput(profile.golf_interests),
    business_interests: formatListForInput(profile.business_interests),
    current_request: profile.current_request ?? "",
  };
}

function buildProfileUpdates(profile: MemberProfileRecord, form: ProfileFormState, initialForm: ProfileFormState) {
  return {
    full_name: form.full_name.trim(),
    primary_club: form.primary_club.trim(),
    based_in: form.based_in.trim(),
    industry: form.industry.trim(),
    traveling_to: buildTextFieldUpdate({
      formValue: form.traveling_to,
      initialFormValue: initialForm.traveling_to,
      existingValue: profile.traveling_to,
    }),
    additional_clubs: buildListFieldUpdate({
      formValue: form.additional_clubs,
      initialFormValue: initialForm.additional_clubs,
      existingValues: profile.additional_clubs,
    }),
    regions: buildListFieldUpdate({
      formValue: form.regions,
      initialFormValue: initialForm.regions,
      existingValues: profile.regions,
    }),
    golf_interests: buildListFieldUpdate({
      formValue: form.golf_interests,
      initialFormValue: initialForm.golf_interests,
      existingValues: profile.golf_interests,
    }),
    business_interests: buildListFieldUpdate({
      formValue: form.business_interests,
      initialFormValue: initialForm.business_interests,
      existingValues: profile.business_interests,
    }),
    current_request: buildTextFieldUpdate({
      formValue: form.current_request,
      initialFormValue: initialForm.current_request,
      existingValue: profile.current_request,
    }),
  };
}

function applyLoadedProfile(
  data: MemberProfileRecord,
  setters: {
    setProfile: (profile: MemberProfileRecord) => void;
    setForm: (form: ProfileFormState) => void;
    setInitialForm: (form: ProfileFormState) => void;
  },
) {
  const nextForm = profileToFormState(data);
  setters.setProfile(data);
  setters.setForm(nextForm);
  setters.setInitialForm(nextForm);
}

type ProfileDossierProps = {
  isActive?: boolean;
};

export function ProfileDossier({ isActive = true }: ProfileDossierProps) {
  const [profile, setProfile] = useState<MemberProfileRecord | null>(null);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [initialForm, setInitialForm] = useState<ProfileFormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) return;

    let active = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const { data, error } = await fetchOwnMemberProfile();

        if (!active) return;

        if (error) {
          setErrorMessage(error.message);
          setProfile(null);
          setForm(null);
          setInitialForm(null);
          return;
        }

        if (!data) {
          setProfile(null);
          setForm(null);
          setInitialForm(null);
          setErrorMessage(NO_LINKED_PROFILE_MESSAGE);
          return;
        }

        applyLoadedProfile(data, { setProfile, setForm, setInitialForm });
      } catch (unexpectedError) {
        if (!active) return;

        setProfile(null);
        setForm(null);
        setInitialForm(null);
        setErrorMessage(
          unexpectedError instanceof Error
            ? unexpectedError.message
            : "Unable to load your dossier.",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [isActive]);

  function updateField<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !profile || !initialForm) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updates = buildProfileUpdates(profile, form, initialForm);
      const { error } = await updateOwnMemberProfile(updates);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const refreshed = await fetchOwnMemberProfile();
      if (refreshed.error) {
        setErrorMessage(refreshed.error.message);
        return;
      }

      if (!refreshed.data) {
        setErrorMessage(NO_LINKED_PROFILE_MESSAGE);
        return;
      }

      applyLoadedProfile(refreshed.data, { setProfile, setForm, setInitialForm });
      setSuccessMessage("Your dossier has been updated.");
    } catch (unexpectedError) {
      setErrorMessage(
        unexpectedError instanceof Error
          ? unexpectedError.message
          : "Unable to save your dossier.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="portal-empty">Preparing your private dossier...</p>;
  }

  if (!profile || !form) {
    return (
      <div className="portal-profile-status">
        <p className="portal-alert portal-alert--error" role="alert">
          {errorMessage ?? "Your private dossier is not available."}
        </p>
      </div>
    );
  }

  return (
    <article className="portal-dossier portal-dossier--editable">
      <header className="portal-dossier-header portal-dossier-header--identity">
        <div className="portal-dossier-header-main">
          <MemberIdentity member={profile} size="lg" heading="h2" />
          <p className="portal-dossier-membership">{formatMembershipLabel(profile.membership_status)}</p>
        </div>
        {profile.is_verified ? <span className="portal-verified-badge">Club Verified</span> : null}
      </header>

      {errorMessage ? (
        <p className="portal-alert portal-alert--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="portal-alert portal-alert--success" role="status">
          {successMessage}
        </p>
      ) : null}

      <form className="portal-profile-form" onSubmit={handleSubmit}>
        <div className="portal-profile-form-grid">
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
            <span>Traveling To</span>
            <input
              type="text"
              value={form.traveling_to}
              onChange={(event) => updateField("traveling_to", event.target.value)}
              placeholder="Upcoming destination or travel window"
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>Additional Clubs</span>
            <textarea
              rows={3}
              value={form.additional_clubs}
              onChange={(event) => updateField("additional_clubs", event.target.value)}
              placeholder="Separate clubs with commas or line breaks"
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>Regions</span>
            <textarea
              rows={3}
              value={form.regions}
              onChange={(event) => updateField("regions", event.target.value)}
              placeholder="Separate regions with commas or line breaks"
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>Golf Interests</span>
            <textarea
              rows={3}
              value={form.golf_interests}
              onChange={(event) => updateField("golf_interests", event.target.value)}
              placeholder="Separate interests with commas or line breaks"
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>Business Interests</span>
            <textarea
              rows={3}
              value={form.business_interests}
              onChange={(event) => updateField("business_interests", event.target.value)}
              placeholder="Separate interests with commas or line breaks"
            />
          </label>

          <label className="portal-profile-field portal-profile-field--full">
            <span>Current Request</span>
            <textarea
              rows={3}
              value={form.current_request}
              onChange={(event) => updateField("current_request", event.target.value)}
              placeholder="What introductions or access are you seeking?"
            />
          </label>
        </div>

        <button type="submit" className="portal-btn portal-btn--gold" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Dossier"}
        </button>
      </form>
    </article>
  );
}
