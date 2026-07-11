import { useRef, useState } from "react";
import {
  getOversizedRoundPhotoMessage,
  getUnsupportedRoundPhotoMessage,
  isAcceptedRoundPhotoType,
  MAX_ROUND_PHOTO_BYTES,
} from "../../lib/courseRoundImageProcessing";

type ProfileMediaUploadFieldProps = {
  label: string;
  hint: string;
  previewUrl: string | null;
  previewAlt: string;
  disabled?: boolean;
  onPickFile: (file: File) => void;
  onRemove: () => void;
  variant: "cover" | "avatar";
};

export function ProfileMediaUploadField({
  label,
  hint,
  previewUrl,
  previewAlt,
  disabled = false,
  onPickFile,
  onRemove,
  variant,
}: ProfileMediaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const inputId = `profile-media-${variant}`;

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || disabled) return;

    const file = fileList[0];
    if (file.size > MAX_ROUND_PHOTO_BYTES) {
      setPickerError(getOversizedRoundPhotoMessage(file));
      return;
    }

    if (!isAcceptedRoundPhotoType(file)) {
      setPickerError(getUnsupportedRoundPhotoMessage(file));
      return;
    }

    setPickerError(null);
    onPickFile(file);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className={`portal-profile-media-field portal-profile-media-field--${variant}`}>
      <div className="portal-profile-media-field-head">
        <label htmlFor={inputId}>{label}</label>
        <p>{hint}</p>
      </div>

      <div className="portal-profile-media-field-preview">
        {variant === "cover" ? (
          <div className="portal-profile-media-cover-preview">
            {previewUrl ? (
              <img src={previewUrl} alt={previewAlt} />
            ) : (
              <div className="portal-profile-cover-placeholder portal-profile-media-cover-empty">
                <span className="portal-profile-cover-crest" aria-hidden="true" />
              </div>
            )}
          </div>
        ) : (
          <div className="portal-profile-media-avatar-preview">
            {previewUrl ? (
              <img src={previewUrl} alt={previewAlt} />
            ) : (
              <span className="portal-profile-media-avatar-empty">No photo</span>
            )}
          </div>
        )}
      </div>

      <div className="portal-profile-media-field-actions">
        <button
          type="button"
          className="portal-btn portal-btn--outline portal-btn--compact"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? "Replace" : "Upload"}
        </button>
        {previewUrl ? (
          <button
            type="button"
            className="portal-btn portal-btn--outline portal-btn--compact"
            disabled={disabled}
            onClick={onRemove}
          >
            Remove
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="visually-hidden"
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />

      {pickerError ? (
        <p className="portal-alert portal-alert--error" role="alert">
          {pickerError}
        </p>
      ) : null}
    </div>
  );
}
