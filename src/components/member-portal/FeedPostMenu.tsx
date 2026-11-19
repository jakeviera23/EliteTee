import { useEffect, useId, useRef, useState } from "react";

type FeedPostMenuProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onBlockAuthor?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  reportLabel?: string;
  blockLabel?: string;
};

export function FeedPostMenu({
  onEdit,
  onDelete,
  onReport,
  onBlockAuthor,
  editLabel = "Edit post",
  deleteLabel = "Delete post",
  reportLabel = "Report post",
  blockLabel = "Block member",
}: FeedPostMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasItems = Boolean(onEdit || onDelete || onReport || onBlockAuthor);

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

  if (!hasItems) return null;

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
          {onReport ? (
            <button
              type="button"
              className="feed-card-menu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onReport();
              }}
            >
              {reportLabel}
            </button>
          ) : null}
          {onBlockAuthor ? (
            <button
              type="button"
              className="feed-card-menu-item feed-card-menu-item--danger"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onBlockAuthor();
              }}
            >
              {blockLabel}
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
