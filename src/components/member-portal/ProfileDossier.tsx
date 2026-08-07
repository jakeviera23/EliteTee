import { FormEvent, useEffect, useState } from "react";
import {
  buildListFieldUpdate,
  buildTextFieldUpdate,
  fetchOwnMemberProfile,
  formatListForInput,
  updateOwnMemberProfile,
} from "../../lib/memberProfiles";
import { migrateLegacyPortalProfileExtrasIfNeeded } from "../../lib/portalProfileExtras";
import {
  deleteMemberMediaPath,
  invalidateMemberMediaCache,
  resolveMemberMediaUrl,
  uploadMemberAvatarPhoto,
  uploadMemberCoverPhoto,
} from "../../lib/memberProfileMedia";
import { memberFacingPortalError } from "../../lib/portalErrorDisplay";
import { hydrateBucketListCourseIds } from "../../lib/portalCourseState";
import { formatMembershipLabel } from "../../lib/portalDisplay";
import { earlyStageCopy } from "../../data/portalSocial";
import { MemberClubAvatar } from "./MemberClubAvatar";
import { ProfileCover } from "./ProfileCover";
import { ProfileMediaUploadField } from "./ProfileMediaUploadField";
import { usePortalToast } from "./PortalToastProvider";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";

type ProfileFormState = {
  full_name: string;
  industry: string;
  based_in: string;
  primary_club: string;
  traveling_to: string;
  additional_clubs: string;
  golf_interests: string;
  business_interests: string;
  current_request: string;
  handicap: string;
};

type PendingMediaState = {
  coverFile: File | null;
  coverPreviewUrl: string | null;
  coverRemoved: boolean;
  avatarFile: File | null;
  avatarPreviewUrl: string | null;
  avatarRemoved: boolean;
};

const NO_LINKED_PROFILE_MESSAGE = "No profile is linked to this account yet.";

function profileToFormState(profile: MemberProfileRecord): ProfileFormState {
  return {
    full_name: profile.full_name ?? "",
    industry: profile.industry ?? "",
    based_in: profile.based_in ?? "",
    primary_club: profile.primary_club ?? "",
    traveling_to: profile.traveling_to ?? "",
    additional_clubs: formatListForInput(profile.additional_clubs),
    golf_interests: formatListForInput(profile.golf_interests),
    business_interests: formatListForInput(profile.business_interests),
    current_request: profile.current_request ?? "",
    handicap: profile.handicap ?? "",
  };
}

function buildProfileUpdates(
  profile: MemberProfileRecord,
  form: ProfileFormState,
  initialForm: ProfileFormState,
  media: {
    coverPhotoUrl: string | null;
    clubLogoUrl: string | null;
  },
) {
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
    regions: profile.regions,
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
    handicap: buildTextFieldUpdate({
      formValue: form.handicap,
      initialFormValue: initialForm.handicap,
      existingValue: profile.handicap,
    }),
    bucket_list_course_ids: profile.bucket_list_course_ids,
    club_logo_url: media.clubLogoUrl,
    cover_photo_url: media.coverPhotoUrl,
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
  const [media, setMedia] = useState<PendingMediaState>({
    coverFile: null,
    coverPreviewUrl: null,
    coverRemoved: false,
    avatarFile: null,
    avatarPreviewUrl: null,
    avatarRemoved: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);

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
          setErrorMessage(memberFacingPortalError(error.message, "profile"));
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

        const { data: migratedProfile } = await migrateLegacyPortalProfileExtrasIfNeeded(data);
        const profileRecord = migratedProfile ?? data;
        hydrateBucketListCourseIds(profileRecord.bucket_list_course_ids);
        const nextForm = profileToFormState(profileRecord);
        const [coverPreviewUrl, avatarPreviewUrl] = await Promise.all([
          resolveMemberMediaUrl(profileRecord.cover_photo_url),
          resolveMemberMediaUrl(profileRecord.club_logo_url),
        ]);

        if (!active) return;

        setProfile(profileRecord);
        setForm(nextForm);
        setInitialForm(nextForm);
        setMedia({
          coverFile: null,
          coverPreviewUrl,
          coverRemoved: false,
          avatarFile: null,
          avatarPreviewUrl,
          avatarRemoved: false,
        });
      } catch (unexpectedError) {
        if (!active) return;

        setProfile(null);
        setForm(null);
        setInitialForm(null);
        if (import.meta.env.DEV) console.error("[ProfileDossier] unexpected load failure", unexpectedError);
        setErrorMessage("Your profile could not be loaded. Please try again.");
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
  }, [isActive, retryVersion]);

  useEffect(() => {
    return () => {
      if (media.coverFile && media.coverPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(media.coverPreviewUrl);
      }
      if (media.avatarFile && media.avatarPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(media.avatarPreviewUrl);
      }
    };
  }, [media.avatarFile, media.avatarPreviewUrl, media.coverFile, media.coverPreviewUrl]);

  function updateField<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function handleCoverPick(file: File) {
    if (media.coverPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(media.coverPreviewUrl);
    }

    setMedia((current) => ({
      ...current,
      coverFile: file,
      coverPreviewUrl: URL.createObjectURL(file),
      coverRemoved: false,
    }));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function handleCoverRemove() {
    if (media.coverPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(media.coverPreviewUrl);
    }

    setMedia((current) => ({
      ...current,
      coverFile: null,
      coverPreviewUrl: null,
      coverRemoved: true,
    }));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function handleAvatarPick(file: File) {
    if (media.avatarPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(media.avatarPreviewUrl);
    }

    setMedia((current) => ({
      ...current,
      avatarFile: file,
      avatarPreviewUrl: URL.createObjectURL(file),
      avatarRemoved: false,
    }));
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function handleAvatarRemove() {
    if (media.avatarPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(media.avatarPreviewUrl);
    }

    setMedia((current) => ({
      ...current,
      avatarFile: null,
      avatarPreviewUrl: null,
      avatarRemoved: true,
    }));
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
      let nextCoverPhotoUrl: string | null = profile.cover_photo_url ?? null;
      let nextClubLogoUrl: string | null = profile.club_logo_url ?? null;

      if (media.coverRemoved && profile.cover_photo_url) {
        await deleteMemberMediaPath(profile.cover_photo_url);
        invalidateMemberMediaCache(profile.cover_photo_url);
        nextCoverPhotoUrl = null;
      }

      if (media.coverFile) {
        const { path, error: coverUploadError } = await uploadMemberCoverPhoto(media.coverFile);
        if (coverUploadError || !path) {
          throw coverUploadError ?? new Error("Cover photo upload failed.");
        }

        if (profile.cover_photo_url && profile.cover_photo_url !== path) {
          await deleteMemberMediaPath(profile.cover_photo_url);
          invalidateMemberMediaCache(profile.cover_photo_url);
        }

        nextCoverPhotoUrl = path;
      }

      if (media.avatarRemoved && profile.club_logo_url) {
        await deleteMemberMediaPath(profile.club_logo_url);
        invalidateMemberMediaCache(profile.club_logo_url);
        nextClubLogoUrl = null;
      }

      if (media.avatarFile) {
        const { path, error: avatarUploadError } = await uploadMemberAvatarPhoto(media.avatarFile);
        if (avatarUploadError || !path) {
          throw avatarUploadError ?? new Error("Profile photo upload failed.");
        }

        if (profile.club_logo_url && profile.club_logo_url !== path) {
          await deleteMemberMediaPath(profile.club_logo_url);
          invalidateMemberMediaCache(profile.club_logo_url);
        }

        nextClubLogoUrl = path;
      }

      const updates = buildProfileUpdates(profile, form, initialForm, {
        coverPhotoUrl: nextCoverPhotoUrl,
        clubLogoUrl: nextClubLogoUrl,
      });

      const { error } = await updateOwnMemberProfile(updates);

      if (error) {
        setErrorMessage(memberFacingPortalError(error.message, "profile"));
        return;
      }

      const refreshed = await fetchOwnMemberProfile();
      if (refreshed.error) {
        setErrorMessage(memberFacingPortalError(refreshed.error.message, "profile"));
      } else if (!refreshed.data) {
        setErrorMessage(NO_LINKED_PROFILE_MESSAGE);
      } else {
        hydrateBucketListCourseIds(refreshed.data.bucket_list_course_ids);
        const nextForm = profileToFormState(refreshed.data);
        const [coverPreviewUrl, avatarPreviewUrl] = await Promise.all([
          resolveMemberMediaUrl(refreshed.data.cover_photo_url),
          resolveMemberMediaUrl(refreshed.data.club_logo_url),
        ]);
        setProfile(refreshed.data);
        setForm(nextForm);
        setInitialForm(nextForm);
        setMedia({
          coverFile: null,
          coverPreviewUrl,
          coverRemoved: false,
          avatarFile: null,
          avatarPreviewUrl,
          avatarRemoved: false,
        });
        setSuccessMessage("Your profile has been updated.");
        showToast("Profile saved");
        onSaved?.();
      }
    } catch (unexpectedError) {
      if (import.meta.env.DEV) console.error("[ProfileDossier] unexpected save failure", unexpectedError);
      setErrorMessage("Your profile could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="et-profile-loading">Loading your profile…</p>;
  }

  if (!profile || !form) {
    return (
      <div className="et-profile-empty">
        <p className="portal-alert portal-alert--error" role="alert">
          {errorMessage ?? "Your profile is not available."}
        </p>
        <button type="button" className="et-btn et-btn--secondary" onClick={() => setRetryVersion((value) => value + 1)}>
          Retry
        </button>
      </div>
    );
  }

  const coverPreview = media.coverRemoved ? null : media.coverPreviewUrl;
  const avatarPreview = media.avatarRemoved ? null : media.avatarPreviewUrl;

  return (
    <article className="portal-dossier portal-dossier--editable et-profile-form">
      <div className="et-profile-edit-preview">
        <ProfileCover
          src={coverPreview}
          alt="Cover preview"
          className="portal-profile-edit-cover"
        />
        <div className="et-profile-edit-preview-body">
          <div className="portal-profile-edit-avatar">
            <MemberClubAvatar
              member={{ club_logo_url: avatarPreview ?? profile.club_logo_url }}
              name={form.full_name || profile.full_name}
              size="lg"
            />
          </div>
          <div className="portal-profile-edit-preview-identity">
            <h3>{form.full_name || profile.full_name}</h3>
            {form.industry ? <p className="portal-profile-edit-headline">{form.industry}</p> : null}
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

      <form className="portal-profile-form et-profile-form" onSubmit={handleSubmit}>
        <section className="portal-profile-form-card et-profile-form-card">
          <h3 className="portal-profile-form-card-title et-profile-form-card-title">Profile Media</h3>
          <div className="portal-profile-form-grid et-profile-form-grid">
            <ProfileMediaUploadField
              label="Cover photo"
              hint="JPEG, PNG, or WebP up to 12 MB. Shown on your public profile."
              previewUrl={coverPreview}
              previewAlt="Cover photo preview"
              disabled={isSaving}
              variant="cover"
              onPickFile={handleCoverPick}
              onRemove={handleCoverRemove}
            />

            <ProfileMediaUploadField
              label="Profile photo"
              hint="Square photos work best. Initials are shown when no photo is set."
              previewUrl={avatarPreview}
              previewAlt="Profile photo preview"
              disabled={isSaving}
              variant="avatar"
              onPickFile={handleAvatarPick}
              onRemove={handleAvatarRemove}
            />
          </div>
        </section>

        <section className="portal-profile-form-card et-profile-form-card">
          <h3 className="portal-profile-form-card-title et-profile-form-card-title">Member Identity</h3>
          <div className="portal-profile-form-grid et-profile-form-grid">
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
              <span>Industry</span>
              <input
                type="text"
                value={form.industry}
                onChange={(event) => updateField("industry", event.target.value)}
                placeholder="Hospitality, finance, real estate…"
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
              <span>Current request</span>
              <textarea
                rows={3}
                value={form.current_request}
                onChange={(event) => updateField("current_request", event.target.value)}
                placeholder="A game in South Florida, a Scotland travel partner, an introduction…"
              />
            </label>
          </div>
        </section>

        <section className="portal-profile-form-card et-profile-form-card">
          <h3 className="portal-profile-form-card-title et-profile-form-card-title">Golf Background</h3>
          <div className="portal-profile-form-grid et-profile-form-grid">
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
              <span>Other Clubs / Courses</span>
              <textarea
                rows={4}
                value={form.additional_clubs}
                onChange={(event) => updateField("additional_clubs", event.target.value)}
                placeholder="Other clubs or courses you regularly play"
              />
            </label>
          </div>
        </section>

        <section className="portal-profile-form-card et-profile-form-card">
          <h3 className="portal-profile-form-card-title et-profile-form-card-title">Travel Plans</h3>
          <div className="portal-profile-form-grid et-profile-form-grid">
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

        <section className="portal-profile-form-card et-profile-form-card">
          <h3 className="portal-profile-form-card-title et-profile-form-card-title">Business</h3>
          <div className="portal-profile-form-grid et-profile-form-grid">
            <label className="portal-profile-field portal-profile-field--full">
              <span>Business interests</span>
              <textarea
                rows={4}
                value={form.business_interests}
                onChange={(event) => updateField("business_interests", event.target.value)}
                placeholder="Industry focus, professional interests, business golf goals"
              />
            </label>
          </div>
        </section>

        <section className="portal-profile-form-card et-profile-form-card">
          <h3 className="portal-profile-form-card-title et-profile-form-card-title">Connection Interests</h3>
          <div className="portal-profile-form-grid et-profile-form-grid">
            <label className="portal-profile-field portal-profile-field--full">
              <span>Golf interests</span>
              <textarea
                rows={4}
                value={form.golf_interests}
                onChange={(event) => updateField("golf_interests", event.target.value)}
                placeholder="Architecture, links golf, weekend games, golf travel"
              />
            </label>
          </div>
        </section>

        <p className="portal-profile-form-note et-profile-form-note">{earlyStageCopy.profileStatsNote}</p>

        <div className="portal-profile-form-actions et-profile-form-actions">
          <button type="submit" className="et-btn et-btn--forest" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </article>
  );
}
