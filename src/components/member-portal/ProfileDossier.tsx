import { FormEvent, useEffect, useState } from "react";
import {
  buildListFieldUpdate,
  buildTextFieldUpdate,
  fetchOwnMemberProfile,
  formatListForInput,
  updateOwnMemberProfile,
} from "../../lib/memberProfiles";
import {
  getPortalProfileExtras,
  savePortalProfileExtras,
  type PortalProfileExtras,
} from "../../lib/portalProfileExtras";
import { formatMembershipLabel } from "../../lib/portalDisplay";
import { earlyStageCopy } from "../../data/portalSocial";
import { photos } from "../../assets/photos";
import { SafeImage } from "../SafeImage";
import { MemberClubAvatar } from "./MemberClubAvatar";
import { usePortalToast } from "./PortalToastProvider";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";

type ProfileFormState = {
  full_name: string;
  headline: string;
  based_in: string;
  primary_club: string;
  traveling_to: string;
  favorite_courses: string;
  connection_interests: string;
  bio: string;
  profile_photo_url: string;
  cover_image_url: string;
  handicap: string;
};

const NO_LINKED_PROFILE_MESSAGE = "No profile is linked to this account yet.";

function profileToFormState(
  profile: MemberProfileRecord,
  extras: PortalProfileExtras,
): ProfileFormState {
  const useLocal = extras.has_local_snapshot;

  return {
    full_name: useLocal ? extras.full_name : profile.full_name ?? "",
    headline: useLocal ? extras.headline : profile.industry ?? "",
    based_in: useLocal ? extras.based_in : profile.based_in ?? "",
    primary_club: useLocal ? extras.primary_club : profile.primary_club ?? "",
    traveling_to: useLocal ? extras.traveling_to : profile.traveling_to ?? "",
    favorite_courses: useLocal
      ? extras.favorite_courses
      : formatListForInput(profile.additional_clubs),
    connection_interests: formatListForInput(profile.golf_interests),
    bio: useLocal ? extras.bio : profile.current_request ?? "",
    profile_photo_url: useLocal ? extras.profile_photo_url : profile.club_logo_url ?? "",
    cover_image_url: extras.cover_image_url,
    handicap: extras.handicap,
  };
}

function buildProfileUpdates(
  profile: MemberProfileRecord,
  form: ProfileFormState,
  initialForm: ProfileFormState,
) {
  return {
    full_name: form.full_name.trim(),
    primary_club: form.primary_club.trim(),
    based_in: form.based_in.trim(),
    industry: form.headline.trim(),
    traveling_to: buildTextFieldUpdate({
      formValue: form.traveling_to,
      initialFormValue: initialForm.traveling_to,
      existingValue: profile.traveling_to,
    }),
    additional_clubs: buildListFieldUpdate({
      formValue: form.favorite_courses,
      initialFormValue: initialForm.favorite_courses,
      existingValues: profile.additional_clubs,
    }),
    regions: profile.regions,
    golf_interests: buildListFieldUpdate({
      formValue: form.connection_interests,
      initialFormValue: initialForm.connection_interests,
      existingValues: profile.golf_interests,
    }),
    business_interests: profile.business_interests,
    current_request: buildTextFieldUpdate({
      formValue: form.bio,
      initialFormValue: initialForm.bio,
      existingValue: profile.current_request,
    }),
    club_logo_url: (() => {
      const value = buildTextFieldUpdate({
        formValue: form.profile_photo_url,
        initialFormValue: initialForm.profile_photo_url,
        existingValue: profile.club_logo_url ?? "",
      });
      return value.trim() || null;
    })(),
  };
}

function buildExtrasFromForm(form: ProfileFormState): PortalProfileExtras {
  return {
    cover_image_url: form.cover_image_url.trim(),
    handicap: form.handicap.trim(),
    rounds_posted: "",
    countries_played: "",
    courses_played_count: "",
    full_name: form.full_name.trim(),
    headline: form.headline.trim(),
    based_in: form.based_in.trim(),
    primary_club: form.primary_club.trim(),
    bio: form.bio.trim(),
    traveling_to: form.traveling_to.trim(),
    favorite_courses: form.favorite_courses.trim(),
    profile_photo_url: form.profile_photo_url.trim(),
    has_local_snapshot: true,
  };
}

type ProfileDossierProps = {
  isActive?: boolean;
  onSaved?: () => void;
};

export function ProfileDossier({ isActive = true, onSaved }: ProfileDossierProps) {
  const { showToast } = usePortalToast();
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

        const extras = getPortalProfileExtras(data.user_id);
        const nextForm = profileToFormState(data, extras);
        setProfile(data);
        setForm(nextForm);
        setInitialForm(nextForm);
      } catch (unexpectedError) {
        if (!active) return;

        setProfile(null);
        setForm(null);
        setInitialForm(null);
        setErrorMessage(
          unexpectedError instanceof Error
            ? unexpectedError.message
            : "Unable to load your profile.",
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
      const extras = buildExtrasFromForm(form);

      // Always persist locally first so the profile view updates immediately.
      savePortalProfileExtras(profile.user_id, extras);

      const { error } = await updateOwnMemberProfile(updates);

      if (!error) {
        const refreshed = await fetchOwnMemberProfile();
        if (refreshed.error) {
          setErrorMessage(refreshed.error.message);
        } else if (!refreshed.data) {
          setErrorMessage(NO_LINKED_PROFILE_MESSAGE);
        } else {
          const refreshedExtras = getPortalProfileExtras(refreshed.data.user_id);
          const nextForm = profileToFormState(refreshed.data, refreshedExtras);
          setProfile(refreshed.data);
          setForm(nextForm);
          setInitialForm(nextForm);
        }
      } else {
        setErrorMessage(`Saved on this device. Remote sync failed: ${error.message}`);
      }

      setSuccessMessage("Your profile has been updated.");
      showToast("Profile saved");
      onSaved?.();
    } catch (unexpectedError) {
      setErrorMessage(
        unexpectedError instanceof Error
          ? unexpectedError.message
          : "Unable to save your profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="portal-empty">Loading your profile...</p>;
  }

  if (!profile || !form) {
    return (
      <div className="portal-profile-status">
        <p className="portal-alert portal-alert--error" role="alert">
          {errorMessage ?? "Your profile is not available."}
        </p>
      </div>
    );
  }

  return (
    <article className="portal-dossier portal-dossier--editable portal-profile-edit">
      <div className="portal-profile-edit-preview">
        <div className="portal-profile-edit-cover">
          <SafeImage
            src={form.cover_image_url || photos.courseNationalGolfLinks}
            alt="Cover preview"
            objectPosition="center"
            fill
            fallbackClassName="portal-golfer-cover-fallback"
          />
        </div>
        <div className="portal-profile-edit-preview-body">
          <div className="portal-profile-edit-avatar">
            <MemberClubAvatar
              member={{ club_logo_url: form.profile_photo_url || profile.club_logo_url }}
              name={form.full_name || profile.full_name}
              size="lg"
            />
          </div>
          <div className="portal-profile-edit-preview-identity">
            <h3>{form.full_name || profile.full_name}</h3>
            {form.headline ? <p className="portal-profile-edit-headline">{form.headline}</p> : null}
            <span className="portal-golfer-member-badge">
              {formatMembershipLabel(profile.membership_status)}
            </span>
          </div>
        </div>
      </div>

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
        <section className="portal-profile-form-card">
          <h3 className="portal-profile-form-card-title">Member Identity</h3>
          <div className="portal-profile-form-grid">
            <label className="portal-profile-field portal-profile-field--full">
              <span>Cover photo URL</span>
              <input
                type="url"
                value={form.cover_image_url}
                onChange={(event) => updateField("cover_image_url", event.target.value)}
                placeholder="https://..."
              />
            </label>

            <label className="portal-profile-field portal-profile-field--full">
              <span>Profile photo URL</span>
              <input
                type="url"
                value={form.profile_photo_url}
                onChange={(event) => updateField("profile_photo_url", event.target.value)}
                placeholder="https://..."
              />
            </label>

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
              <span>Headline</span>
              <input
                type="text"
                value={form.headline}
                onChange={(event) => updateField("headline", event.target.value)}
                placeholder="Private club member, frequent traveler"
              />
            </label>

            <label className="portal-profile-field">
              <span>Location</span>
              <input
                type="text"
                value={form.based_in}
                onChange={(event) => updateField("based_in", event.target.value)}
                required
              />
            </label>

            <label className="portal-profile-field portal-profile-field--full">
              <span>Bio</span>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                placeholder="Share what you love about golf and what brought you to EliteTee"
              />
            </label>
          </div>
        </section>

        <section className="portal-profile-form-card">
          <h3 className="portal-profile-form-card-title">Golf Background</h3>
          <div className="portal-profile-form-grid">
            <label className="portal-profile-field">
              <span>Home Course</span>
              <input
                type="text"
                value={form.primary_club}
                onChange={(event) => updateField("primary_club", event.target.value)}
                required
              />
            </label>

            <label className="portal-profile-field">
              <span>Handicap</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.handicap}
                onChange={(event) => updateField("handicap", event.target.value)}
                placeholder="e.g. 8.4"
              />
            </label>

            <label className="portal-profile-field portal-profile-field--full">
              <span>Favorite Courses</span>
              <textarea
                rows={4}
                value={form.favorite_courses}
                onChange={(event) => updateField("favorite_courses", event.target.value)}
                placeholder="One course per line or separated by commas"
              />
            </label>
          </div>
        </section>

        <section className="portal-profile-form-card">
          <h3 className="portal-profile-form-card-title">Travel Plans</h3>
          <div className="portal-profile-form-grid">
            <label className="portal-profile-field portal-profile-field--full">
              <span>Upcoming Golf Travel</span>
              <input
                type="text"
                value={form.traveling_to}
                onChange={(event) => updateField("traveling_to", event.target.value)}
                placeholder="Scotland — St Andrews, September"
              />
            </label>
          </div>
        </section>

        <section className="portal-profile-form-card">
          <h3 className="portal-profile-form-card-title">Connection Interests</h3>
          <div className="portal-profile-form-grid">
            <label className="portal-profile-field portal-profile-field--full">
              <span>What connections are you looking for?</span>
              <textarea
                rows={4}
                value={form.connection_interests}
                onChange={(event) => updateField("connection_interests", event.target.value)}
                placeholder="Weekend games, member introductions, golf travel partners, business golf"
              />
            </label>
          </div>
        </section>

        <p className="portal-profile-form-note">{earlyStageCopy.profileStatsNote}</p>

        <div className="portal-profile-form-actions">
          <button type="submit" className="portal-btn portal-btn--gold" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </article>
  );
}
