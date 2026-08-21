import { useRef, useState } from "react";
import {
  detectRoundMediaKind,
  getOversizedRoundMediaMessage,
  getRoundMediaLimitsHelpText,
  getUnsupportedRoundMediaMessage,
  isAcceptedRoundMediaType,
  isAcceptedRoundPhotoType,
  MAX_ROUND_MEDIA,
  MAX_ROUND_PHOTO_BYTES,
  MAX_ROUND_VIDEO_BYTES,
} from "../../lib/courseRoundMediaProcessing";
import type { CourseRoundPhotoDraft } from "../../types/memberCourseRoundPhoto";
import type { ExperienceEditPhoto } from "../../lib/experienceEditPhotos";

export type ExperienceMediaEditorItem = ExperienceEditPhoto & {
  mediaKind?: "image" | "video";
};

type ExperienceMediaEditorProps = {
  existing: ExperienceMediaEditorItem[];
  drafts: CourseRoundPhotoDraft[];
  coverId: string | null;
  onCoverIdChange: (id: string) => void;
  onExistingChange: (items: ExperienceMediaEditorItem[]) => void;
  onDraftsChange: (drafts: CourseRoundPhotoDraft[]) => void;
  onRemoveExisting: (id: string) => void;
  disabled?: boolean;
  videoEnabled?: boolean;
  canUseAsCourseDisplay?: boolean;
  onUseAsCourseDisplay?: (photoId: string) => void;
  courseDisplayBusy?: boolean;
};

function syncCover(
  existing: ExperienceMediaEditorItem[],
  drafts: CourseRoundPhotoDraft[],
  coverId: string | null,
  onCoverIdChange: (id: string) => void,
) {
  const ids = [...existing.map((item) => item.id), ...drafts.map((draft) => draft.id)];
  if (ids.length === 0) return;
  if (coverId && ids.includes(coverId)) return;
  onCoverIdChange(ids[0]);
}

export function ExperienceMediaEditor({
  existing,
  drafts,
  coverId,
  onCoverIdChange,
  onExistingChange,
  onDraftsChange,
  onRemoveExisting,
  disabled = false,
  videoEnabled = false,
  canUseAsCourseDisplay = false,
  onUseAsCourseDisplay,
  courseDisplayBusy = false,
}: ExperienceMediaEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetIdRef = useRef<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const totalCount = existing.length + drafts.length;

  const accept = videoEnabled
    ? "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
    : "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

  function addFiles(fileList: FileList | null, options?: { replaceExistingId?: string }) {
    if (!fileList || disabled) return;

    const replaceId = options?.replaceExistingId;
    const remainingSlots = replaceId ? 1 : MAX_ROUND_MEDIA - totalCount;
    if (remainingSlots <= 0) {
      setPickerError(`You can add up to ${MAX_ROUND_MEDIA} photos or videos per experience.`);
      return;
    }

    const incoming = Array.from(fileList).slice(0, remainingSlots);
    const errors: string[] = [];
    const nextDrafts: CourseRoundPhotoDraft[] = [];

    for (const file of incoming) {
      const kind = detectRoundMediaKind(file);
      if (kind === "video" && !videoEnabled) {
        errors.push(
          `${file.name}: Video uploads require migration 060 (media_kind) on this Supabase project.`,
        );
        continue;
      }

      if (!videoEnabled && !isAcceptedRoundPhotoType(file)) {
        errors.push(getUnsupportedRoundMediaMessage(file));
        continue;
      }

      if (videoEnabled && !isAcceptedRoundMediaType(file)) {
        errors.push(getUnsupportedRoundMediaMessage(file));
        continue;
      }

      const maxBytes = kind === "video" ? MAX_ROUND_VIDEO_BYTES : MAX_ROUND_PHOTO_BYTES;
      if (file.size > maxBytes) {
        errors.push(getOversizedRoundMediaMessage(file));
        continue;
      }

      nextDrafts.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
        sortOrder: replaceId
          ? existing.findIndex((item) => item.id === replaceId)
          : totalCount + nextDrafts.length,
        mediaKind: kind,
      });
    }

    setPickerError(errors[0] ?? null);

    if (nextDrafts.length === 0) {
      if (inputRef.current) inputRef.current.value = "";
      if (replaceInputRef.current) replaceInputRef.current.value = "";
      return;
    }

    if (replaceId) {
      onRemoveExisting(replaceId);
      const withoutReplaced = existing.filter((item) => item.id !== replaceId);
      const insertAt = Math.max(
        0,
        existing.findIndex((item) => item.id === replaceId),
      );
      const mergedDrafts = [...drafts];
      // Keep relative order: put replacement draft at start of drafts queue for save mapping simplicity.
      onDraftsChange([...nextDrafts, ...mergedDrafts]);
      onExistingChange(withoutReplaced.map((item, index) => ({ ...item, sort_order: index })));
      onCoverIdChange(coverId === replaceId ? nextDrafts[0].id : coverId ?? nextDrafts[0].id);
      void insertAt;
    } else {
      const merged = [...drafts, ...nextDrafts];
      onDraftsChange(merged);
      syncCover(existing, merged, coverId, onCoverIdChange);
    }

    if (inputRef.current) inputRef.current.value = "";
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  }

  function removeDraft(id: string) {
    const removed = drafts.find((draft) => draft.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    const next = drafts
      .filter((draft) => draft.id !== id)
      .map((draft, index) => ({ ...draft, sortOrder: existing.length + index }));
    onDraftsChange(next);
    syncCover(existing, next, coverId, onCoverIdChange);
    setPickerError(null);
  }

  function moveExisting(id: string, direction: -1 | 1) {
    const index = existing.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= existing.length) return;
    const next = [...existing];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onExistingChange(next.map((item, sortOrder) => ({ ...item, sort_order: sortOrder })));
  }

  function moveDraft(id: string, direction: -1 | 1) {
    const index = drafts.findIndex((draft) => draft.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= drafts.length) return;
    const next = [...drafts];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onDraftsChange(
      next.map((draft, sortOrder) => ({
        ...draft,
        sortOrder: existing.length + sortOrder,
      })),
    );
  }

  function startReplace(id: string) {
    if (disabled) return;
    replaceTargetIdRef.current = id;
    replaceInputRef.current?.click();
  }

  function openAddPicker() {
    if (disabled) return;
    setPickerError(null);
    inputRef.current?.click();
  }

  return (
    <div className="experience-media-editor">
      <div className="round-photo-picker-head">
        <span>Manage media</span>
        <span className="round-photo-picker-count">
          {totalCount}/{MAX_ROUND_MEDIA}
        </span>
      </div>
      <p className="round-photo-picker-help">
        {videoEnabled
          ? getRoundMediaLimitsHelpText()
          : `Up to ${MAX_ROUND_MEDIA} JPEG/PNG/WebP photos (12 MB each). Video uploads need migration 060 applied to Supabase.`}
      </p>
      <p className="round-photo-picker-help">
        Add, remove, reorder, replace, or set a cover. Changes apply when you save.
      </p>
      {!videoEnabled ? (
        <p className="feed-edit-field-hint" role="status">
          Video is unavailable until migration 060 is applied to this database.
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="experience-media-editor-hidden-input"
        disabled={disabled}
        onChange={(event) => addFiles(event.target.files)}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept={accept}
        className="experience-media-editor-hidden-input"
        disabled={disabled}
        onChange={(event) => {
          const targetId = replaceTargetIdRef.current;
          replaceTargetIdRef.current = null;
          addFiles(event.target.files, targetId ? { replaceExistingId: targetId } : undefined);
        }}
      />

      {totalCount > 0 ? (
        <ul className="experience-media-editor-list">
          {existing.map((item, index) => {
            const isCover = item.id === coverId;
            const isVideo = item.mediaKind === "video";
            return (
              <li key={item.id} className="experience-media-editor-item">
                <div className="experience-media-editor-thumb">
                  {item.previewUrl ? (
                    isVideo ? (
                      <video src={item.previewUrl} muted playsInline preload="metadata" />
                    ) : (
                      <img src={item.previewUrl} alt="" loading="lazy" />
                    )
                  ) : (
                    <span className="experience-media-missing">Preview unavailable</span>
                  )}
                  {isVideo ? <span className="experience-media-badge">Video</span> : null}
                  {isCover ? (
                    <span className="experience-media-badge experience-media-badge--cover">Cover</span>
                  ) : null}
                </div>
                <div className="experience-media-editor-actions">
                  {!isCover ? (
                    <button type="button" onClick={() => onCoverIdChange(item.id)} disabled={disabled}>
                      Set cover
                    </button>
                  ) : null}
                  <button type="button" onClick={() => startReplace(item.id)} disabled={disabled}>
                    Replace
                  </button>
                  {canUseAsCourseDisplay && !isVideo && onUseAsCourseDisplay ? (
                    <button
                      type="button"
                      onClick={() => onUseAsCourseDisplay(item.id)}
                      disabled={disabled || courseDisplayBusy}
                    >
                      Use as course photo
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => moveExisting(item.id, -1)}
                    disabled={disabled || index === 0}
                    aria-label="Move earlier"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveExisting(item.id, 1)}
                    disabled={disabled || index === existing.length - 1}
                    aria-label="Move later"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="experience-media-editor-remove"
                    onClick={() => onRemoveExisting(item.id)}
                    disabled={disabled}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}

          {drafts.map((draft, index) => {
            const isCover = draft.id === coverId;
            const isVideo = draft.mediaKind === "video";
            return (
              <li key={draft.id} className="experience-media-editor-item">
                <div className="experience-media-editor-thumb">
                  {isVideo ? (
                    <video src={draft.previewUrl} muted playsInline preload="metadata" />
                  ) : (
                    <img src={draft.previewUrl} alt="" loading="lazy" />
                  )}
                  <span className="experience-media-badge">New</span>
                  {isVideo ? <span className="experience-media-badge">Video</span> : null}
                  {isCover ? (
                    <span className="experience-media-badge experience-media-badge--cover">Cover</span>
                  ) : null}
                </div>
                <div className="experience-media-editor-actions">
                  {!isCover ? (
                    <button
                      type="button"
                      onClick={() => onCoverIdChange(draft.id)}
                      disabled={disabled}
                    >
                      Set cover
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => moveDraft(draft.id, -1)}
                    disabled={disabled || index === 0}
                    aria-label="Move new item earlier"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDraft(draft.id, 1)}
                    disabled={disabled || index === drafts.length - 1}
                    aria-label="Move new item later"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="experience-media-editor-remove"
                    onClick={() => removeDraft(draft.id)}
                    disabled={disabled}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="feed-edit-field-hint">No photos yet. Add one below.</p>
      )}

      {totalCount < MAX_ROUND_MEDIA ? (
        <button
          type="button"
          className="round-photo-picker-add"
          onClick={openAddPicker}
          disabled={disabled}
        >
          {totalCount === 0 ? "Add photos" : "Add more photos"}
        </button>
      ) : null}

      {pickerError ? (
        <p className="portal-course-played-error" role="alert">
          {pickerError}
        </p>
      ) : null}
    </div>
  );
}
