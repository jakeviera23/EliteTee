import { useState } from "react";

type ProfileProsePreviewProps = {
  items: string[];
  maxLines?: number;
  className?: string;
};

export function ProfileProsePreview({
  items,
  maxLines = 3,
  className = "",
}: ProfileProsePreviewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set());

  if (items.length === 0) return null;

  function toggleItem(item: string) {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }

  return (
    <ul className={`et-profile-prose-list${className ? ` ${className}` : ""}`}>
      {items.map((item) => {
        const isExpanded = expandedItems.has(item);
        const isLong = item.split("\n").length > maxLines || item.length > 180;

        return (
          <li key={item} className="et-profile-prose-item">
            <p
              className={`et-profile-prose-copy${
                isLong && !isExpanded ? " et-profile-prose-copy--clamped" : ""
              }`}
            >
              {item}
            </p>
            {isLong ? (
              <button
                type="button"
                className="et-profile-prose-toggle"
                onClick={() => toggleItem(item)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? "Show less" : "Read more"}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
