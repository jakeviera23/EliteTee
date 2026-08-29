import type { DiscoverFeaturedSection } from "../../../lib/discoverDirectory";
import type { MemberRelationshipContext } from "../../../lib/memberRelationships";
import type { MemberProfileRecord } from "../../../types/memberProfileRecord";
import { DiscoverDirectoryCard } from "./DiscoverDirectoryCard";

type DiscoverFeaturedSectionsProps = {
  sections: DiscoverFeaturedSection[];
  viewer: MemberProfileRecord | null;
  relationshipContext?: MemberRelationshipContext | null;
  onViewProfile: (member: MemberProfileRecord) => void;
  onRequestIntroduction?: (member: MemberProfileRecord) => void;
  onRespondToIntroduction?: (requestId: string) => void;
  onMessageMember?: (member: MemberProfileRecord) => void;
  onViewAllMembers?: () => void;
};

export function DiscoverFeaturedSections({
  sections,
  viewer,
  relationshipContext = null,
  onViewProfile,
  onRequestIntroduction,
  onRespondToIntroduction,
  onMessageMember,
  onViewAllMembers,
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
            <div className="et-discover-featured-head-actions">
              <p className="et-discover-featured-count">
                {section.members.length} member{section.members.length === 1 ? "" : "s"}
              </p>
              {section.id === "new-members" && onViewAllMembers ? (
                <button
                  type="button"
                  className="et-btn et-btn--ghost et-discover-view-all"
                  onClick={onViewAllMembers}
                >
                  View All Members
                </button>
              ) : null}
            </div>
          </div>
          <ul className="et-discover-featured-grid">
            {section.members.map((member) => (
              <li key={member.id}>
                <DiscoverDirectoryCard
                  member={member}
                  viewer={viewer}
                  relationshipContext={relationshipContext}
                  onViewProfile={onViewProfile}
                  onRequestIntroduction={onRequestIntroduction}
                  onRespondToIntroduction={onRespondToIntroduction}
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
