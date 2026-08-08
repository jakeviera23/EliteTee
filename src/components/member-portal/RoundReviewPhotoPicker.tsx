import { useRef, useState } from "react";
import {
  getOversizedRoundPhotoMessage,
  getUnsupportedRoundPhotoMessage,
  isAcceptedRoundPhotoType,
  MAX_ROUND_PHOTO_BYTES,
} from "../../lib/courseRoundImageProcessing";
import type { CourseRoundPhotoDraft } from "../../types/memberCourseRoundPhoto";

export const MAX_ROUND_REVIEW_PHOTOS = 8;

type RoundReviewPhotoPickerProps = {
  drafts: CourseRoundPhotoDraft[];
  onChange: (drafts: CourseRoundPhotoDraft[]) => void;
  disabled?: boolean;
};

export function RoundReviewPhotoPicker({
  drafts,
  onChange,
  disabled = false,
}: RoundReviewPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  function addFiles(fileList: FileList | null) {
    if (!fileList || disabled) return;

    const remainingSlots = MAX_ROUND_REVIEW_PHOTOS - drafts.length;
    if (remainingSlots <= 0) {
      setPickerError(`You can add up to ${MAX_ROUND_REVIEW_PHOTOS} photos.`);
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
      onChange([...drafts, ...nextDrafts]);
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

    onChange(
      drafts
        .filter((draft) => draft.id !== id)
        .map((draft, index) => ({ ...draft, sortOrder: index })),
    );
    setPickerError(null);
  }

  return (
    <div className="round-review-photo-picker">
      <div className="round-review-photo-picker-head">
        <span className="round-review-photo-picker-label">
          Photos <span className="round-review-photo-picker-optional">· Optional</span>
        </span>
        {drafts.length > 0 ? (
          <span className="round-review-photo-picker-count">
            {drafts.length}/{MAX_ROUND_REVIEW_PHOTOS}
          </span>
        ) : null}
      </div>

      {drafts.length < MAX_ROUND_REVIEW_PHOTOS ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={disabled}
            className="visually-hidden"
            id="round-review-photo-input"
            onChange={(event) => addFiles(event.target.files)}
          />
          <label htmlFor="round-review-photo-input" className="round-review-photo-picker-add">
            + Add photos
          </label>
        </>
      ) : null}

      {drafts.length > 0 ? (
        <ul className="round-review-photo-picker-grid" aria-label="Selected photos">
          {drafts.map((draft) => (
            <li key={draft.id} className="round-review-photo-picker-item">
              <img
                src={draft.previewUrl}
                alt=""
                className="round-review-photo-picker-thumb"
                loading="lazy"
              />
              <button
                type="button"
                className="round-review-photo-picker-remove"
                onClick={() => removeDraft(draft.id)}
                disabled={disabled}
                aria-label="Remove photo"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {pickerError ? (
        <p className="round-review-photo-picker-error" role="alert">
          {pickerError}
        </p>
      ) : null}
    </div>
  );
}
