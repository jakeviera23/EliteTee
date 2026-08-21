type RoundPhotoCoverGridItem = {
  id: string;
  previewUrl: string;
  alt?: string;
  mediaKind?: "image" | "video";
};

type RoundPhotoCoverGridProps = {
  items: RoundPhotoCoverGridItem[];
  coverId: string | null;
  onCoverIdChange: (id: string) => void;
  disabled?: boolean;
};

function CoverStarIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="round-photo-cover-star">
      <path
        d="M8 1.8 9.9 6l4.3.3-3.3 2.8 1 4.2L8 11.2 3.1 13.3l1-4.2L.8 6.3 5.1 6 8 1.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function RoundPhotoCoverGrid({
  items,
  coverId,
  onCoverIdChange,
  disabled = false,
}: RoundPhotoCoverGridProps) {
  if (items.length === 0) return null;

  const effectiveCoverId = coverId && items.some((item) => item.id === coverId) ? coverId : items[0]?.id;

  return (
    <div className="round-photo-cover-grid" role="group" aria-label="Choose cover photo">
      <p className="round-photo-cover-grid-label">Tap a photo or video to use as the cover in the feed and gallery.</p>
      <ul className="round-photo-cover-grid-list">
        {items.map((item) => {
          const isCover = item.id === effectiveCoverId;
          const isVideo = item.mediaKind === "video" || item.alt === "Video";

          return (
            <li key={item.id} className="round-photo-cover-grid-item">
              <div
                className={`round-photo-cover-thumb${isCover ? " round-photo-cover-thumb--selected" : ""}`}
              >
                {isVideo ? (
                  <video src={item.previewUrl} muted playsInline preload="metadata" />
                ) : (
                  <img src={item.previewUrl} alt={item.alt ?? ""} loading="lazy" />
                )}
                {isCover ? (
                  <span className="round-photo-cover-badge">
                    <CoverStarIcon />
                    Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    className="round-photo-cover-set"
                    onClick={() => onCoverIdChange(item.id)}
                    disabled={disabled}
                  >
                    Set as cover
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type { RoundPhotoCoverGridItem };
