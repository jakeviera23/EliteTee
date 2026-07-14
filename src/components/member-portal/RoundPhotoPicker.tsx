import { useRef, useState } from "react";
import {
  getOversizedRoundPhotoMessage,
  getUnsupportedRoundPhotoMessage,
  isAcceptedRoundPhotoType,
  MAX_ROUND_PHOTO_BYTES,
  MAX_ROUND_PHOTOS,
} from "../../lib/courseRoundImageProcessing";
import type { CourseRoundPhotoDraft } from "../../types/memberCourseRoundPhoto";
import { RoundPhotoCoverGrid } from "./RoundPhotoCoverGrid";

type RoundPhotoPickerProps = {
  drafts: CourseRoundPhotoDraft[];
  onChange: (drafts: CourseRoundPhotoDraft[]) => void;
  coverDraftId: string | null;
  onCoverDraftIdChange: (id: string) => void;
  disabled?: boolean;
};

function syncCoverDraftId(
  drafts: CourseRoundPhotoDraft[],
  coverDraftId: string | null,
  onCoverDraftIdChange: (id: string) => void,
) {
  if (drafts.length === 0) return;
  if (coverDraftId && drafts.some((draft) => draft.id === coverDraftId)) return;
  onCoverDraftIdChange(drafts[0].id);
}

export function RoundPhotoPicker({
  drafts,
  onChange,
  coverDraftId,
  onCoverDraftIdChange,
  disabled = false,
}: RoundPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  function updateDrafts(nextDrafts: CourseRoundPhotoDraft[]) {
    onChange(nextDrafts);
    syncCoverDraftId(nextDrafts, coverDraftId, onCoverDraftIdChange);
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || disabled) return;

    const remainingSlots = MAX_ROUND_PHOTOS - drafts.length;
    if (remainingSlots <= 0) {
      setPickerError(`You can add up to ${MAX_ROUND_PHOTOS} photos per round.`);
      return;
    }

    const incoming = Array.from(fileList).slice(0, remainingSlots);
    const errors: string[] = [];
    const nextDrafts: CourseRoundPhotoDraft[] = [];

    for (const file of incoming) {
      if (file.size > MAX_ROUND_PHOTO_BYTES) {
        errors.push(getOversizedRoundPhotoMessage(file));
        continue;
      }

      if (!isAcceptedRoundPhotoType(file)) {
        errors.push(getUnsupportedRoundPhotoMessage(file));
        continue;
      }

      nextDrafts.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
        sortOrder: drafts.length + nextDrafts.length,
      });
    }

    if (errors.length > 0) {
      setPickerError(errors[0]);
    } else {
      setPickerError(null);
    }

    if (nextDrafts.length > 0) {
      const merged = [...drafts, ...nextDrafts];
      updateDrafts(merged);
      if (!coverDraftId && merged.length > 0) {
        onCoverDraftIdChange(merged[0].id);
      }
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function removeDraft(id: string) {
    const removed = drafts.find((draft) => draft.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
    }

    const next = drafts
      .filter((draft) => draft.id !== id)
      .map((draft, index) => ({ ...draft, sortOrder: index }));
    updateDrafts(next);
    setPickerError(null);
  }

  function updateCaption(id: string, caption: string) {
    onChange(drafts.map((draft) => (draft.id === id ? { ...draft, caption } : draft)));
  }

  function moveDraft(id: string, direction: -1 | 1) {
    const index = drafts.findIndex((draft) => draft.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= drafts.length) return;

    const next = [...drafts];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    updateDrafts(next.map((draft, sortOrder) => ({ ...draft, sortOrder })));
  }

  return (
    <div className="round-photo-picker">
      <div className="round-photo-picker-head">
        <span>Course photos (optional)</span>
        <span className="round-photo-picker-count">
          {drafts.length}/{MAX_ROUND_PHOTOS}
        </span>
      </div>
      <p className="round-photo-picker-help">
        Add up to {MAX_ROUND_PHOTOS} JPEG, PNG, or WebP photos (12 MB each). Images are resized before
        upload. Choose one as the cover photo for the feed.
      </p>

      {drafts.length > 0 ? (
        <>
          <RoundPhotoCoverGrid
            items={drafts.map((draft) => ({
              id: draft.id,
              previewUrl: draft.previewUrl,
            }))}
            coverId={coverDraftId}
            onCoverIdChange={onCoverDraftIdChange}
            disabled={disabled}
          />

          <ul className="round-photo-picker-list">
            {drafts.map((draft, index) => (
              <li key={draft.id} className="round-photo-picker-item">
                <img src={draft.previewUrl} alt="" className="round-photo-picker-thumb" loading="lazy" />
                <div className="round-photo-picker-item-body">
                  <label className="portal-profile-field portal-profile-field--full">
                    <span>Caption (optional)</span>
                    <input
                      type="text"
                      value={draft.caption}
                      onChange={(event) => updateCaption(draft.id, event.target.value)}
                      disabled={disabled}
                      maxLength={200}
                    />
                  </label>
                  <div className="round-photo-picker-item-actions">
                    <button
                      type="button"
                      className="round-photo-picker-move"
                      onClick={() => moveDraft(draft.id, -1)}
                      disabled={disabled || index === 0}
                      aria-label="Move photo earlier"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="round-photo-picker-move"
                      onClick={() => moveDraft(draft.id, 1)}
                      disabled={disabled || index === drafts.length - 1}
                      aria-label="Move photo later"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="round-photo-picker-remove"
                      onClick={() => removeDraft(draft.id)}
                      disabled={disabled}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {drafts.length < MAX_ROUND_PHOTOS ? (
        <label className="round-photo-picker-add">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            disabled={disabled}
            onChange={(event) => addFiles(event.target.files)}
          />
          <span>{drafts.length === 0 ? "Add photos" : "Add more photos"}</span>
        </label>
      ) : null}

      {pickerError ? (
        <p className="portal-course-played-error" role="alert">
          {pickerError}
        </p>
      ) : null}
    </div>
  );
}
