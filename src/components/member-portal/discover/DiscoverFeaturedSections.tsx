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

  return (
    <div className="et-discover-featured-stack">
      {sections.map((section) => (
        <section
          key={section.id}
          className="et-discover-featured-section"
          aria-labelledby={`discover-featured-${section.id}`}
        >
          <div className="et-discover-featured-head">
            <h3 id={`discover-featured-${section.id}`} className="et-discover-featured-title">
              {section.title}
            </h3>
            <p className="et-discover-featured-count">
              {section.members.length} member{section.members.length === 1 ? "" : "s"}
            </p>
          </div>
          <ul className="et-discover-featured-grid">
            {section.members.map((member) => (
              <li key={member.id}>
                <DiscoverDirectoryCard
                  member={member}
                  viewer={viewer}
                  showMatchReasons={section.id === "suggested"}
                  onViewProfile={onViewProfile}
                  onRequestIntroduction={onRequestIntroduction}
                  onMessageMember={onMessageMember}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
