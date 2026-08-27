import { useEffect } from "react";

type MessageImageLightboxProps = {
  urls: string[];
  startIndex: number;
  onClose: () => void;
};

export function MessageImageLightbox({ urls, startIndex, onClose }: MessageImageLightboxProps) {
  const safeIndex = Math.min(Math.max(startIndex, 0), Math.max(urls.length - 1, 0));
  const activeUrl = urls[safeIndex] ?? null;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!activeUrl) return null;

  return (
    <div
      className="et-messages-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
    >
      <button
        type="button"
        className="et-messages-lightbox-close"
        onClick={onClose}
        aria-label="Close image preview"
      >
        ×
      </button>
      <img
        className="et-messages-lightbox-image"
        src={activeUrl}
        alt=""
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
