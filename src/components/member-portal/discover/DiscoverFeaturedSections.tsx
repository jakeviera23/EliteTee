import type { DiscoverFeaturedSection } from "../../../lib/discoverDirectory";
import type { MemberProfileRecord } from "../../../types/memberProfileRecord";
import { DiscoverDirectoryCard } from "./DiscoverDirectoryCard";

type DiscoverFeaturedSectionsProps = {
  sections: DiscoverFeaturedSection[];
  viewer: MemberProfileRecord | null;
  onViewProfile: (member: MemberProfileRecord) => void;
  onRequestIntroduction: (member: MemberProfileRecord) => void;
  onMessageMember?: (member: MemberProfileRecord) => void;
};

export function DiscoverFeaturedSections({
  sections,
  viewer,
  onViewProfile,
  onRequestIntroduction,
  onMessageMember,
}: DiscoverFeaturedSectionsProps) {
  if (sections.length === 0) return null;

  const editorialMembers = sections
    .flatMap((section) =>
      section.members.map((member) => ({ member, context: section.title })),
    )
    .filter(
      (entry, index, entries) =>
        entries.findIndex((candidate) => candidate.member.id === entry.member.id) === index,
    )
    .slice(0, 3);

  return (
    <section className="et-discover-featured-section" aria-labelledby="discover-featured-edit">
      <div className="et-discover-featured-head">
        <div>
          <p className="et-discover-section-kicker">Curated for you</p>
          <h3 id="discover-featured-edit" className="et-discover-featured-title">
            This week’s member edit
          </h3>
        </div>
        <p className="et-discover-section-lead">Introductions selected for relevance and recency.</p>
      </div>
      <ul className="et-discover-featured-grid">
        {editorialMembers.map(({ member, context }, index) => (
          <li key={member.id} className={index === 0 ? "is-lead" : undefined}>
            <DiscoverDirectoryCard
              member={member}
              viewer={viewer}
              variant={index === 0 ? "spotlight" : "standard"}
              showMatchReasons={context === "Suggested for You"}
              onViewProfile={onViewProfile}
              onRequestIntroduction={onRequestIntroduction}
              onMessageMember={onMessageMember}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
