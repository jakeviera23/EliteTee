import { partitionProfileDisplayItems } from "../../../lib/portalProfileDisplay";

type ProfileTagOrTextListProps = {
  items: string[];
  emptyHint?: string;
};

export function ProfileTagOrTextList({ items, emptyHint }: ProfileTagOrTextListProps) {
  const { tags } = partitionProfileDisplayItems(items);

  if (tags.length === 0) {
    return emptyHint ? <p className="et-profile-aside-note">{emptyHint}</p> : null;
  }

  return (
    <ul className="et-profile-chips">
      {tags.map((item) => (
        <li key={item}>
          <span className="et-profile-chip">{item}</span>
        </li>
      ))}
    </ul>
  );
}
