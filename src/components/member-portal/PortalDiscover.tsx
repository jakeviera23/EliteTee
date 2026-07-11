import { useCallback, useEffect, useMemo, useState } from "react";
import { photos } from "../../assets/photos";
import { earlyStageCopy } from "../../data/portalSocial";
import { fetchDiscoverablePortalMembers } from "../../lib/memberProfiles";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { IntroductionRequestModal } from "./IntroductionRequestModal";
import { MemberCard } from "./MemberCard";
import { usePortalToast } from "./PortalToastProvider";

const discoverFilters = [
  "All Members",
  "Near Me",
  "Traveling Soon",
  "Same Home Club",
  "Business Golf",
  "Competitive Golf",
  "Course Architecture",
  "International Travel",
] as const;

type PortalDiscoverProps = {
  onViewCourse?: (courseId: string) => void;
  onNavigate?: (tab: "profile" | "messages" | "introductions") => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
};

function memberMatchesQuery(member: MemberProfileRecord, query: string) {
  const haystack = [
    member.full_name,
    member.primary_club,
    member.based_in,
    member.traveling_to,
    member.current_request,
    member.industry,
    ...member.golf_interests,
    ...member.regions,
    member.founding_member_number ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function memberMatchesFilter(member: MemberProfileRecord, filter: string) {
  if (filter === "All Members") return true;
  if (filter === "Traveling Soon") return Boolean(member.traveling_to?.trim());
  if (filter === "Same Home Club") return Boolean(member.primary_club?.trim());

  const interests = member.golf_interests.join(" ").toLowerCase();
  const industry = member.industry.toLowerCase();
  const regions = member.regions.join(" ").toLowerCase();

  if (filter === "Business Golf") {
    return interests.includes("business") || industry.includes("business");
  }
  if (filter === "Competitive Golf") {
    return interests.includes("competitive") || interests.includes("tournament");
  }
  if (filter === "Course Architecture") {
    return interests.includes("architecture") || interests.includes("design");
  }
  if (filter === "International Travel") {
    return (
      regions.length > 1 ||
      interests.includes("travel") ||
      Boolean(member.traveling_to?.trim())
    );
  }

  return true;
}

export function PortalDiscover({
  onViewCourse: _onViewCourse,
  onNavigate,
  onViewMemberProfile,
}: PortalDiscoverProps) {
  const { showToast } = usePortalToast();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All Members");
  const [members, setMembers] = useState<MemberProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [introRequestMember, setIntroRequestMember] = useState<MemberProfileRecord | null>(null);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const { data, error } = await fetchDiscoverablePortalMembers();

    if (error) {
      const supabaseError = error as Error & {
        code?: string;
        details?: string;
        hint?: string;
      };
      console.error("[PortalDiscover] failed to load members", {
        code: supabaseError.code,
        message: supabaseError.message,
        details: supabaseError.details,
        hint: supabaseError.hint,
      });
      setLoadError("Member profiles could not be loaded right now.");
      setMembers([]);
    } else {
      setMembers(data);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return members.filter((member) => {
      const matchesQuery = normalizedQuery === "" || memberMatchesQuery(member, normalizedQuery);
      const matchesFilter = memberMatchesFilter(member, activeFilter);
      return matchesQuery && matchesFilter;
    });
  }, [members, query, activeFilter]);

  function openIntroductionRequest(member: MemberProfileRecord) {
    setIntroRequestMember(member);
  }

  function handleViewProfile(member: MemberProfileRecord) {
    const userId = member.user_id?.trim();
    if (!userId || !onViewMemberProfile) return;
    onViewMemberProfile(userId, member.full_name);
  }

  function handleIntroductionSubmitted() {
    showToast("Introduction request submitted");
    onNavigate?.("introductions");
  }

  return (
    <section className="portal-social-page portal-discover-page" aria-labelledby="discover-heading">
      <div className="portal-discover-hero" aria-hidden="true">
        <img
          src={photos.heroAerial}
          alt="Aerial view of sand bunkers on a private fairway"
          style={{ objectFit: "cover", objectPosition: "center", width: "100%", height: "100%" }}
          loading="lazy"
          decoding="async"
        />
      </div>

      <header className="portal-section-head portal-section-head--social portal-section-head--compact">
        <h2 id="discover-heading">Discover</h2>
        <p>
          Find golfers by club, location, travel plans, and interests as founding members join
          EliteTee.
        </p>
      </header>

      <div className="discover-layout discover-layout--founding">
        <div className="discover-main">
          <section className="discover-toolbar" aria-labelledby="find-golfers-heading">
            <h3 id="find-golfers-heading" className="discover-section-title">
              Find Golfers
            </h3>
            <label className="portal-search-label portal-search-label--social">
              <span className="visually-hidden">Search golfers</span>
              <input
                type="search"
                className="portal-search-input"
                placeholder="Search by name, club, city, destination, or interest…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="discover-filters" role="group" aria-label="Filter golfers">
              {discoverFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`discover-chip${activeFilter === filter ? " is-active" : ""}`}
                  aria-pressed={activeFilter === filter}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </section>

          <section
            className="portal-discover-founding"
            aria-labelledby="founding-members-heading"
          >
            <h3 id="founding-members-heading" className="discover-section-title">
              {earlyStageCopy.discoverFoundingTitle}
            </h3>

            {isLoading ? (
              <p className="portal-discover-loading">Loading founding members…</p>
            ) : null}

            {loadError ? (
              <p className="portal-alert portal-alert--warning" role="alert">
                {loadError}
              </p>
            ) : null}

            {!isLoading && !loadError && members.length === 0 ? (
              <div className="portal-discover-founding-body">
                <p>{earlyStageCopy.discoverFoundingBody}</p>
                <p className="portal-discover-founding-note">{earlyStageCopy.discoverFoundingNote}</p>
              </div>
            ) : null}

            {!isLoading && !loadError && members.length > 0 ? (
              <p className="portal-discover-count" aria-live="polite">
                {members.length} founding member{members.length === 1 ? "" : "s"}
              </p>
            ) : null}

            {!isLoading && !loadError && members.length > 0 && filteredMembers.length === 0 ? (
              <p className="discover-no-match">{earlyStageCopy.discoverNoMatch}</p>
            ) : null}

            {!isLoading && filteredMembers.length > 0 ? (
              <ul className="portal-member-grid">
                {filteredMembers.map((member) => (
                  <li key={member.id}>
                    <MemberCard
                      member={member}
                      onViewProfile={handleViewProfile}
                      onRequest={openIntroductionRequest}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      </div>

      {introRequestMember ? (
        <IntroductionRequestModal
          member={introRequestMember}
          onClose={() => setIntroRequestMember(null)}
          onSubmitted={handleIntroductionSubmitted}
        />
      ) : null}
    </section>
  );
}
