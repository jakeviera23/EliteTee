import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import type { FeedPost } from "../../data/portalSocial";
import {
  deriveCourseRoundEditDefaults,
  getFeedPostEditMode,
  validateCourseRoundPostEditInput,
  validateTextPostEditInput,
} from "../../lib/feedPostEditing";
import {
  updateCourseRoundFeedPost,
  updateMemberFeedPostCaption,
} from "../../lib/memberFeedPosts";
import { memberFacingCoverPhotoError, memberFacingPortalError } from "../../lib/portalErrorDisplay";
import { fetchMemberCourseRoundById } from "../../lib/memberCourseRounds";
import {
  buildRoundImageUrls,
  buildRoundMediaItems,
  deleteOwnCourseRoundPhoto,
  fetchCoverPhotoIdsForRoundIds,
  fetchPhotosForRoundIds,
  golfCourseHasCuratedImage,
  isCourseRoundVideoUploadSupported,
  setCourseCommunityDisplayPhoto,
  setRoundCoverPhoto,
  updateRoundPhotoSortOrders,
  uploadCourseRoundPhotos,
} from "../../lib/memberCourseRoundPhotos";
import {
  buildExperienceEditPhotoRecords,
  mapActivePhotosForExperienceEdit,
  resolveExperienceEditCoverPhotoId,
  type ExperienceEditPhoto,
} from "../../lib/experienceEditPhotos";
import { ensureMemberCourseRoundForFeedPost } from "../../lib/ensureExperienceRoundLink";
import { fetchGolfCourseById } from "../../lib/golfCourses";
import type { CourseRoundPhotoDraft } from "../../types/memberCourseRoundPhoto";
import type { GolfCourseSearchResult } from "../../types/golfCourse";
import { CourseRatingPicker } from "./CourseRatingPicker";
import { ExperienceMediaEditor } from "./ExperienceMediaEditor";
import { RoundPhotoCoverGrid } from "./RoundPhotoCoverGrid";

type FeedPostEditModalProps = {
  post: FeedPost;
  currentUserId?: string | null;
  viewerIsAdmin?: boolean;
  onClose: () => void;
  onSaved: (post: FeedPost) => void;
};

export function FeedPostEditModal({
  post,
  currentUserId = null,
  viewerIsAdmin = false,
  onClose,
  onSaved,
}: FeedPostEditModalProps) {
  const formId = useId();
  const editMode = getFeedPostEditMode(post);
  const hydrateKey = `${post.id}:${post.memberCourseRoundId ?? ""}`;
  const defaults = useMemo(() => deriveCourseRoundEditDefaults(post), [hydrateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [message, setMessage] = useState(defaults.message);
  const [location, setLocation] = useState(defaults.location);
  const [playedOn, setPlayedOn] = useState(defaults.playedOn);
  const [wouldPlayAgain, setWouldPlayAgain] = useState(defaults.wouldPlayAgain);
  const [courseRating, setCourseRating] = useState<number | null>(defaults.courseRating);
  const [linkedCourse, setLinkedCourse] = useState<GolfCourseSearchResult | null>(null);
  const [isLoadingRound, setIsLoadingRound] = useState(editMode === "course-round");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roundPhotos, setRoundPhotos] = useState<ExperienceEditPhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [mediaDrafts, setMediaDrafts] = useState<CourseRoundPhotoDraft[]>([]);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [initialCoverPhotoId, setInitialCoverPhotoId] = useState<string | null>(null);
  const [initialSortSignature, setInitialSortSignature] = useState("");
  const [canSetCourseDisplay, setCanSetCourseDisplay] = useState(false);
  const [courseDisplayBusy, setCourseDisplayBusy] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [linkedRoundId, setLinkedRoundId] = useState<string | null>(
    post.memberCourseRoundId ?? null,
  );
  const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);

  // Track user edits so async round hydration cannot clobber typing.
  const locationDirtyRef = useRef(false);
  const messageDirtyRef = useRef(false);
  const metaDirtyRef = useRef(false);

  const isOwner = Boolean(currentUserId && post.authorUserId === currentUserId);
  const canEditDetails = isOwner;
  const fieldsDisabled = isSaving || !canEditDetails;
  // Allow adding drafts while round metadata loads — only block during save / non-owner.
  const mediaDisabled = isSaving || !canEditDetails;
  const effectiveRoundId = linkedRoundId ?? post.memberCourseRoundId ?? null;
  const coverChanged = coverPhotoId !== initialCoverPhotoId;
  const sortSignature = useMemo(
    () => roundPhotos.map((photo) => `${photo.id}:${photo.sort_order}`).join("|"),
    [roundPhotos],
  );
  const mediaChanged =
    removedPhotoIds.length > 0 ||
    mediaDrafts.length > 0 ||
    coverChanged ||
    sortSignature !== initialSortSignature;

  useEffect(() => {
    locationDirtyRef.current = false;
    messageDirtyRef.current = false;
    metaDirtyRef.current = false;

    const nextDefaults = deriveCourseRoundEditDefaults(post);
    setMessage(nextDefaults.message);
    setLocation(nextDefaults.location);
    setPlayedOn(nextDefaults.playedOn);
    setWouldPlayAgain(nextDefaults.wouldPlayAgain);
    setCourseRating(nextDefaults.courseRating);
    setError(null);
    setUploadProgress(null);
    setMediaLoadError(null);
    setRemovedPhotoIds([]);
    setMediaDrafts([]);
    setRoundPhotos([]);
    setCoverPhotoId(null);
    setInitialCoverPhotoId(null);
    setInitialSortSignature("");
    setLinkedCourse(null);
    setCanSetCourseDisplay(false);
    setLinkedRoundId(post.memberCourseRoundId ?? null);

    if (editMode !== "course-round") {
      setIsLoadingRound(false);
      return;
    }

    // Optimistic seed from the feed card so the editor is never blank when the post already shows media.
    const seededFromPost: ExperienceEditPhoto[] = post.mediaItems?.length
      ? post.mediaItems.map((item, index) => ({
          id: item.id,
          previewUrl: item.kind === "video" ? item.posterUrl || item.url : item.url,
          sort_order: index,
          created_at: "",
          mediaKind: item.kind,
        }))
      : (post.images ?? []).map((url, index) => ({
          id: `${post.id}-image-${index}`,
          previewUrl: url,
          sort_order: index,
          created_at: "",
          mediaKind: "image" as const,
        }));
    if (seededFromPost.length > 0) {
      setRoundPhotos(seededFromPost);
      setCoverPhotoId(seededFromPost[0]?.id ?? null);
      setInitialCoverPhotoId(seededFromPost[0]?.id ?? null);
    }

    let active = true;
    setIsLoadingRound(true);

    void (async () => {
      try {
        let roundId = post.memberCourseRoundId ?? null;

        if (!roundId) {
          const { data: ensured, error: ensureError } = await ensureMemberCourseRoundForFeedPost(
            post,
          );
          if (!active) return;

          if (ensureError || !ensured?.memberCourseRoundId) {
            console.error("[FeedPostEditModal] round ensure failed", ensureError ?? ensured);
            setMediaLoadError(
              ensureError?.message ||
                ensured?.detail ||
                "This experience is missing its linked round id, so photos cannot be loaded or saved yet.",
            );
            return;
          }

          roundId = ensured.memberCourseRoundId;
          setLinkedRoundId(roundId);
        }

        const [
          { data: round, error: roundError },
          photosResult,
          { data: coverIds },
        ] = await Promise.all([
          fetchMemberCourseRoundById(roundId),
          fetchPhotosForRoundIds([roundId]),
          fetchCoverPhotoIdsForRoundIds([roundId]),
        ]);

        if (!active) return;

        setLinkedRoundId(roundId);

        if (photosResult.error) {
          console.error("[FeedPostEditModal] photo load failed", photosResult.error);
          setMediaLoadError(
            photosResult.error.message ||
              "Photos could not be loaded. You can still add new photos and save.",
          );
        } else {
          setMediaLoadError(null);
          const editablePhotos = mapActivePhotosForExperienceEdit(photosResult.data ?? []);
          if (editablePhotos.length > 0) {
            setRoundPhotos(editablePhotos);
            setInitialSortSignature(
              editablePhotos.map((photo) => `${photo.id}:${photo.sort_order}`).join("|"),
            );
            const resolvedCoverId = resolveExperienceEditCoverPhotoId(
              coverIds?.get(roundId) ?? round?.cover_photo_id,
              editablePhotos,
            );
            setCoverPhotoId(resolvedCoverId);
            setInitialCoverPhotoId(resolvedCoverId);
          } else if (seededFromPost.length === 0) {
            setRoundPhotos([]);
            setInitialSortSignature("");
            setCoverPhotoId(null);
            setInitialCoverPhotoId(null);
          }
        }

        // Video support is optional and must never block photo editing.
        void isCourseRoundVideoUploadSupported()
          .then((supported) => {
            if (active) setVideoEnabled(supported);
          })
          .catch((videoError) => {
            console.warn("[FeedPostEditModal] video capability check failed", videoError);
            if (active) setVideoEnabled(false);
          });

        if (round) {
          if (!messageDirtyRef.current) {
            setMessage(round.note || nextDefaults.message);
          }
          if (!locationDirtyRef.current) {
            setLocation((round.location ?? "").trim() || nextDefaults.location);
          }
          if (!metaDirtyRef.current) {
            setPlayedOn(round.played_on);
            setWouldPlayAgain(round.would_play_again);
            setCourseRating(round.course_rating);
          }

          if (round.golf_course_id) {
            const [{ data: course }, { data: curated }] = await Promise.all([
              fetchGolfCourseById(round.golf_course_id),
              golfCourseHasCuratedImage(round.golf_course_id),
            ]);
            if (!active) return;
            setLinkedCourse(course);
            setCanSetCourseDisplay(!curated);
          }
        } else if (roundError) {
          console.warn("[FeedPostEditModal] round metadata load failed", roundError.message);
          setMediaLoadError(
            (current) =>
              current ?? `Round details could not be loaded: ${roundError.message}`,
          );
        }
      } catch (loadError) {
        console.error("[FeedPostEditModal] media hydration failed", loadError);
        if (active) {
          setMediaLoadError(
            loadError instanceof Error
              ? loadError.message
              : "Photos could not be loaded. You can still add new photos and save.",
          );
        }
      } finally {
        if (active) setIsLoadingRound(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [editMode, hydrateKey]); // intentionally stable: do not reset while typing

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  function buildUpdatedMedia(nextCoverPhotoId: string | null, photos: ExperienceEditPhoto[]) {
    if (!post.memberCourseRoundId) {
      return { images: post.images, mediaItems: post.mediaItems };
    }
    const records = buildExperienceEditPhotoRecords(photos, post.memberCourseRoundId);
    return {
      images: buildRoundImageUrls(records, nextCoverPhotoId),
      mediaItems: buildRoundMediaItems(records, nextCoverPhotoId),
    };
  }

  async function persistMediaChanges(roundId: string) {
    const remaining = roundPhotos.filter((photo) => !removedPhotoIds.includes(photo.id));

    for (const photoId of removedPhotoIds) {
      const photo = roundPhotos.find((item) => item.id === photoId);
      if (!photo?.user_id || !photo.storage_path) continue;
      const { error: deleteError } = await deleteOwnCourseRoundPhoto({
        id: photo.id,
        member_course_round_id: roundId,
        user_id: photo.user_id,
        storage_path: photo.storage_path,
        poster_storage_path: photo.poster_storage_path ?? null,
        sort_order: photo.sort_order,
        is_featured: false,
        moderation_status: "active",
        created_at: photo.created_at,
        media_kind: photo.mediaKind ?? "image",
      });
      if (deleteError) {
        return { photos: remaining, error: deleteError };
      }
    }

    let nextPhotos = remaining.map((photo, index) => ({ ...photo, sort_order: index }));
    if (sortSignature !== initialSortSignature || removedPhotoIds.length > 0) {
      const { error: sortError } = await updateRoundPhotoSortOrders(
        nextPhotos.map((photo) => ({ id: photo.id, sort_order: photo.sort_order })),
      );
      if (sortError) {
        return { photos: nextPhotos, error: sortError };
      }
    }

    let uploadedMapped: ExperienceEditPhoto[] = [];
    if (mediaDrafts.length > 0) {
      setUploadProgress(
        `Uploading ${mediaDrafts.length} new item${mediaDrafts.length === 1 ? "" : "s"}…`,
      );
      const { data: uploadResult, error: uploadError } = await uploadCourseRoundPhotos(
        roundId,
        mediaDrafts.map((draft, index) => ({
          file: draft.file,
          caption: draft.caption,
          sortOrder: nextPhotos.length + index,
        })),
      );
      setUploadProgress(null);
      if (uploadError) {
        return { photos: nextPhotos, error: uploadError };
      }
      if (uploadResult?.failed.length) {
        return {
          photos: nextPhotos,
          error: new Error(uploadResult.failed[0]?.message ?? "Media upload failed."),
        };
      }

      uploadedMapped = mapActivePhotosForExperienceEdit(uploadResult?.uploaded ?? []);
      nextPhotos = [...nextPhotos, ...uploadedMapped];
    }

    let effectiveCoverId = coverPhotoId;
    if (effectiveCoverId && mediaDrafts.some((draft) => draft.id === effectiveCoverId)) {
      const draftIndex = mediaDrafts.findIndex((draft) => draft.id === effectiveCoverId);
      effectiveCoverId = uploadedMapped[draftIndex]?.id ?? nextPhotos[0]?.id ?? null;
    }
    if (effectiveCoverId && !nextPhotos.some((photo) => photo.id === effectiveCoverId)) {
      effectiveCoverId = nextPhotos[0]?.id ?? null;
    }

    if (effectiveCoverId && (coverChanged || mediaDrafts.length > 0 || removedPhotoIds.length > 0)) {
      const { error: coverError } = await setRoundCoverPhoto(roundId, effectiveCoverId);
      if (coverError) {
        return { photos: nextPhotos, coverId: effectiveCoverId, error: coverError };
      }
    }

    return { photos: nextPhotos, coverId: effectiveCoverId, error: null };
  }

  async function handleUseAsCourseDisplay(photoId: string) {
    if (!linkedCourse?.id || !canSetCourseDisplay) return;
    setCourseDisplayBusy(true);
    setError(null);
    const { error: featureError } = await setCourseCommunityDisplayPhoto(linkedCourse.id, photoId);
    setCourseDisplayBusy(false);
    if (featureError) {
      setError(featureError.message);
      return;
    }
    setUploadProgress("Course display photo updated.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setError(null);
    setUploadProgress(null);

    if (editMode === "text") {
      if (!canEditDetails) {
        setError("Only the post owner can edit this post.");
        return;
      }

      const validation = validateTextPostEditInput({ message });
      if (!validation.ok) {
        setError(validation.message);
        return;
      }

      setIsSaving(true);
      const { data, error: saveError } = await updateMemberFeedPostCaption(post.id, message);
      setIsSaving(false);

      if (saveError || !data) {
        setError(memberFacingPortalError(saveError?.message ?? "unknown", "feed"));
        return;
      }

      onSaved(data);
      return;
    }

    if (courseRating == null) {
      setError("Please enter a rating from 1.0 to 10.0.");
      return;
    }

    if (!canEditDetails && !coverChanged) {
      setError("Choose a different cover photo to save changes.");
      return;
    }

    if (!canEditDetails) {
      if (!post.memberCourseRoundId || !coverPhotoId || !coverChanged) {
        setError("Choose a different cover photo to save changes.");
        return;
      }

      setIsSaving(true);
      const { error: coverError } = await setRoundCoverPhoto(post.memberCourseRoundId, coverPhotoId);
      setIsSaving(false);

      if (coverError) {
        setError(memberFacingCoverPhotoError(coverError.message));
        return;
      }

      onSaved({
        ...post,
        ...buildUpdatedMedia(coverPhotoId, roundPhotos),
        golfCourseId: linkedCourse?.id ?? post.golfCourseId,
      });
      return;
    }

    const validation = validateCourseRoundPostEditInput({
      message,
      courseRating,
      playedOn,
      wouldPlayAgain,
      location,
    });

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setIsSaving(true);
    const { data, error: saveError } = await updateCourseRoundFeedPost(post.id, {
      message,
      courseRating,
      playedOn,
      wouldPlayAgain,
      location,
    });

    if (saveError || !data) {
      setIsSaving(false);
      setError(memberFacingPortalError(saveError?.message ?? "unknown", "feed"));
      return;
    }

    let savedPost: FeedPost = {
      ...data,
      courseLocation: location.trim(),
      golfCourseId: linkedCourse?.id ?? data.golfCourseId ?? post.golfCourseId,
    };
    let mediaWarning: string | null = null;

    if (mediaChanged) {
      let roundIdForMedia = effectiveRoundId;
      if (!roundIdForMedia) {
        const { data: ensured, error: ensureError } = await ensureMemberCourseRoundForFeedPost(
          post,
        );
        if (ensureError || !ensured?.memberCourseRoundId) {
          setIsSaving(false);
          setError(
            ensureError?.message ||
              ensured?.detail ||
              "This experience is missing its linked round id, so photos cannot be saved. Refresh and try again.",
          );
          return;
        }
        roundIdForMedia = ensured.memberCourseRoundId;
        setLinkedRoundId(roundIdForMedia);
      }

      const mediaResult = await persistMediaChanges(roundIdForMedia);
      if (mediaResult.error) {
        console.error("[FeedPostEditModal] media save failed", mediaResult.error);
        mediaWarning =
          mediaResult.error.message.includes("cover")
            ? memberFacingCoverPhotoError(mediaResult.error.message)
            : mediaResult.error.message;
      } else {
        savedPost = {
          ...savedPost,
          memberCourseRoundId: roundIdForMedia,
          ...buildUpdatedMedia(mediaResult.coverId ?? coverPhotoId, mediaResult.photos),
        };
        setMediaDrafts([]);
        setRemovedPhotoIds([]);
        setRoundPhotos(mediaResult.photos);
        setInitialCoverPhotoId(mediaResult.coverId ?? coverPhotoId);
        setCoverPhotoId(mediaResult.coverId ?? coverPhotoId);
        setInitialSortSignature(
          mediaResult.photos.map((photo) => `${photo.id}:${photo.sort_order}`).join("|"),
        );

        // Prefer community display photo over TB placeholder when course has no curated image.
        const displayPhotoId = mediaResult.coverId ?? mediaResult.photos[0]?.id ?? null;
        const courseIdForDisplay = linkedCourse?.id ?? savedPost.golfCourseId ?? null;
        if (displayPhotoId && courseIdForDisplay && canSetCourseDisplay) {
          const { error: featureError } = await setCourseCommunityDisplayPhoto(
            courseIdForDisplay,
            displayPhotoId,
          );
          if (featureError) {
            console.warn(
              "[FeedPostEditModal] community display photo not set (migration 060 may be required)",
              featureError.message,
            );
          }
        }
      }
    } else if (coverChanged && effectiveRoundId && coverPhotoId) {
      const { error: coverError } = await setRoundCoverPhoto(effectiveRoundId, coverPhotoId);
      if (coverError) {
        mediaWarning = memberFacingCoverPhotoError(coverError.message);
      } else {
        savedPost = {
          ...savedPost,
          memberCourseRoundId: effectiveRoundId,
          ...buildUpdatedMedia(coverPhotoId, roundPhotos),
        };
      }
    }

    setIsSaving(false);
    setUploadProgress(null);
    onSaved(savedPost);
    if (mediaWarning) {
      setError(mediaWarning);
    }
  }

  return (
    <div className="feed-edit-backdrop" role="presentation" onClick={isSaving ? undefined : onClose}>
      <div
        className="feed-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="feed-edit-modal-head">
          <h2 id={`${formId}-title`} className="feed-edit-modal-title">
            {editMode === "course-round" ? "Edit experience" : "Edit post"}
          </h2>
          <button
            type="button"
            className="feed-edit-modal-close"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close editor"
          >
            ×
          </button>
        </header>

        <form id={formId} className="feed-edit-form" onSubmit={handleSubmit}>
          {editMode === "course-round" && isLoadingRound ? (
            <p className="feed-edit-loading" aria-live="polite">
              Loading media…
            </p>
          ) : null}

          {!canEditDetails && viewerIsAdmin ? (
            <p className="feed-edit-field-hint">
              As an admin, you can change the cover photo only. Other experience details stay with the
              member who posted it.
            </p>
          ) : null}

          {!canEditDetails && !viewerIsAdmin ? (
            <p className="feed-edit-error" role="alert">
              Only the member who posted this experience can edit location, review, and media.
            </p>
          ) : null}

          {editMode === "course-round" && canEditDetails ? (
            <div className="feed-edit-field feed-edit-field--wide">
              <span className="feed-edit-field-label">Photos & videos</span>
              {mediaLoadError ? (
                <p className="feed-edit-error" role="alert">
                  {mediaLoadError}
                </p>
              ) : null}
              {isLoadingRound ? (
                <p className="feed-edit-loading" aria-live="polite">
                  Loading existing photos…
                </p>
              ) : null}
              <ExperienceMediaEditor
                existing={roundPhotos}
                drafts={mediaDrafts}
                coverId={coverPhotoId}
                onCoverIdChange={setCoverPhotoId}
                onExistingChange={setRoundPhotos}
                onDraftsChange={setMediaDrafts}
                onRemoveExisting={(id) => {
                  setRemovedPhotoIds((current) =>
                    current.includes(id) ? current : [...current, id],
                  );
                  const next = roundPhotos
                    .filter((photo) => photo.id !== id)
                    .map((photo, index) => ({ ...photo, sort_order: index }));
                  setRoundPhotos(next);
                  if (coverPhotoId === id) {
                    setCoverPhotoId(next[0]?.id ?? mediaDrafts[0]?.id ?? null);
                  }
                }}
                disabled={mediaDisabled}
                videoEnabled={videoEnabled}
                canUseAsCourseDisplay={canSetCourseDisplay}
                onUseAsCourseDisplay={handleUseAsCourseDisplay}
                courseDisplayBusy={courseDisplayBusy}
              />
            </div>
          ) : null}

          {editMode === "course-round" && !canEditDetails && roundPhotos.length > 0 ? (
            <div className="feed-edit-field feed-edit-field--wide">
              <span className="feed-edit-field-label">Change cover photo</span>
              <RoundPhotoCoverGrid
                items={roundPhotos.map((photo) => ({
                  id: photo.id,
                  previewUrl: photo.previewUrl,
                  mediaKind: photo.mediaKind,
                }))}
                coverId={coverPhotoId}
                onCoverIdChange={setCoverPhotoId}
                disabled={isSaving || isLoadingRound}
              />
            </div>
          ) : null}

          <label className="feed-edit-field feed-edit-field--wide">
            <span>{editMode === "course-round" ? "Review" : "Post"}</span>
            <textarea
              rows={4}
              value={message}
              onChange={(event) => {
                messageDirtyRef.current = true;
                setMessage(event.target.value);
              }}
              required
              disabled={fieldsDisabled}
            />
          </label>

          {editMode === "course-round" ? (
            <>
              <label className="feed-edit-field feed-edit-field--wide">
                <span>Location</span>
                <input
                  type="text"
                  name="experience-location"
                  autoComplete="address-level2"
                  value={location}
                  onChange={(event) => {
                    locationDirtyRef.current = true;
                    setLocation(event.target.value);
                  }}
                  required
                  disabled={fieldsDisabled}
                  readOnly={false}
                  placeholder="e.g. Bridgehampton, NY"
                />
              </label>

              <label className="feed-edit-field">
                <span>Date played</span>
                <input
                  type="date"
                  value={playedOn}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => {
                    metaDirtyRef.current = true;
                    setPlayedOn(event.target.value);
                  }}
                  required
                  disabled={fieldsDisabled}
                />
              </label>

              <div className="feed-edit-field feed-edit-field--wide">
                <CourseRatingPicker
                  value={courseRating}
                  onChange={(value) => {
                    metaDirtyRef.current = true;
                    setCourseRating(value);
                  }}
                  disabled={fieldsDisabled}
                  error={error && courseRating == null ? error : null}
                />
              </div>

              <fieldset className="feed-edit-choice" disabled={fieldsDisabled}>
                <legend>Would play again?</legend>
                <div className="feed-edit-choice-options">
                  <label className="feed-edit-choice-option">
                    <input
                      type="radio"
                      name={`${formId}-would-play-again`}
                      checked={wouldPlayAgain}
                      onChange={() => {
                        metaDirtyRef.current = true;
                        setWouldPlayAgain(true);
                      }}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="feed-edit-choice-option">
                    <input
                      type="radio"
                      name={`${formId}-would-play-again`}
                      checked={!wouldPlayAgain}
                      onChange={() => {
                        metaDirtyRef.current = true;
                        setWouldPlayAgain(false);
                      }}
                    />
                    <span>No</span>
                  </label>
                </div>
              </fieldset>
            </>
          ) : null}

          {uploadProgress ? (
            <p className="feed-edit-loading" aria-live="polite">
              {uploadProgress}
            </p>
          ) : null}

          {error ? (
            <p className="feed-edit-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="feed-edit-actions">
            <button
              type="button"
              className="et-btn et-btn--secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="et-btn et-btn--primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
