import { useRef, useState } from "react";
import { homeInsideEliteTee } from "../data/homePage";
import type { HomeInsidePreview } from "../data/homePage";
import { useDialogFocus } from "../hooks/useDialogFocus";

function HomeInsidePreviewLightbox({
  preview,
  onClose,
}: {
  preview: HomeInsidePreview;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useDialogFocus({
    dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  });

  return (
    <div
      className="home-inside-lightbox-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="home-inside-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={preview.label}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="home-inside-lightbox-stage">
          <button
            ref={closeButtonRef}
            type="button"
            className="home-inside-lightbox-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <span aria-hidden="true">×</span>
          </button>
          <img
            src={preview.src}
            alt={preview.alt}
            className="home-inside-lightbox-image"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

export function HomeInsideEliteTee() {
  const [activePreview, setActivePreview] = useState<HomeInsidePreview | null>(null);

  return (
    <section
      id="product"
      className="home-section home-product-section"
      aria-labelledby="home-product-heading"
    >
      <div className="layout home-section-inner home-product-section-inner">
        <header className="home-section-header home-section-header--centered">
          <h2 id="home-product-heading">{homeInsideEliteTee.title}</h2>
          <p className="home-section-lead">{homeInsideEliteTee.intro}</p>
        </header>

        <ul className="home-inside-preview-grid">
          {homeInsideEliteTee.previews.map((preview, index) => (
            <li key={preview.id}>
              <figure className="home-inside-preview-item">
                <button
                  type="button"
                  className="home-inside-preview-trigger"
                  onClick={() => setActivePreview(preview)}
                  aria-label={`View larger ${preview.label} preview`}
                >
                  <span className="home-inside-preview-frame">
                    <img
                      src={preview.src}
                      alt={preview.alt}
                      width={340}
                      height={212}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                      fetchPriority={index === 0 ? "high" : undefined}
                    />
                  </span>
                </button>
                <figcaption>{preview.label}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>

      {activePreview ? (
        <HomeInsidePreviewLightbox
          preview={activePreview}
          onClose={() => setActivePreview(null)}
        />
      ) : null}
    </section>
  );
}
