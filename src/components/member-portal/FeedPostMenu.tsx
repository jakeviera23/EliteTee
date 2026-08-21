import { useEffect, useId, useRef, useState } from "react";

type FeedPostMenuProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
};

export function FeedPostMenu({
  onEdit,
  onDelete,
  editLabel = "Edit post",
  deleteLabel = "Delete post",
}: FeedPostMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="feed-card-menu" ref={rootRef}>
      <button
        type="button"
        className="feed-card-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Post options"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">⋯</span>
      </button>

      {open ? (
        <div id={menuId} className="feed-card-menu-panel" role="menu">
          {onEdit ? (
            <button
              type="button"
              className="feed-card-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              {editLabel}
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="feed-card-menu-item feed-card-menu-item--danger"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              {deleteLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
