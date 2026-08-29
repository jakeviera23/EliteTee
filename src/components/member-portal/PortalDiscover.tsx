import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  DEFAULT_DISCOVER_FILTERS,
  buildDiscoverGeoGroups,
  buildFeaturedDiscoverSections,
  countActiveDiscoverFilters,
  extractDiscoverFilterOptions,
  filterDiscoverMembers,
  sortDiscoverMembers,
  type DiscoverFilters,
  type DiscoverSortOption,
} from "../../lib/discoverDirectory";
import {
  fetchDiscoverablePortalMembers,
  fetchOwnMemberProfile,
} from "../../lib/memberProfiles";
import {
  formatDiscoverMemberLoadError,
  logDiscoverMemberLoadError,
} from "../../lib/portalDiscoverErrors";
import {
  fetchMemberRelationshipContext,
  type MemberRelationshipContext,
} from "../../lib/memberRelationships";
import type { MemberProfileRecord } from "../../types/memberProfileRecord";
import type { ViewMemberProfileHandler } from "../../types/memberProfileNavigation";
import { DiscoverDirectoryCard } from "./discover/DiscoverDirectoryCard";
import { DiscoverFeaturedSections } from "./discover/DiscoverFeaturedSections";
import { DiscoverFilterDrawer } from "./discover/DiscoverFilterDrawer";
import { DiscoverFiltersBar } from "./discover/DiscoverFiltersBar";
import { DiscoverGeoBrowse } from "./discover/DiscoverGeoBrowse";
import { InviteGolfer } from "./InviteGolfer";

type PortalDiscoverProps = {
  onViewCourse?: (courseId: string) => void;
  onNavigate?: (tab: "profile" | "messages" | "introductions") => void;
  onViewMemberProfile?: ViewMemberProfileHandler;
  onMessageMember?: (userId: string, memberName: string) => void;
  onRequestIntroduction?: (member: MemberProfileRecord) => void;
  onRespondToIntroduction?: (requestId: string) => void;
  relationshipContext?: MemberRelationshipContext | null;
  onRelationshipContextChange?: (context: MemberRelationshipContext | null) => void;
};

export function PortalDiscover({
  onViewCourse: _onViewCourse,
  onNavigate: _onNavigate,
  onViewMemberProfile,
  onMessageMember,
  onRequestIntroduction,
  onRespondToIntroduction,
  relationshipContext = null,
  onRelationshipContextChange,
}: PortalDiscoverProps) {
  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_DISCOVER_FILTERS);
  const debouncedFilters = useDebouncedValue(filters, 250);
  const [sortBy, setSortBy] = useState<DiscoverSortOption>("most-relevant");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [members, setMembers] = useState<MemberProfileRecord[]>([]);
  const [viewer, setViewer] = useState<MemberProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const [{ data, error }, ownProfileResult] = await Promise.all([
      fetchDiscoverablePortalMembers(),
      fetchOwnMemberProfile(),
    ]);

    if (error) {
      logDiscoverMemberLoadError(error);
      setLoadError(formatDiscoverMemberLoadError(error));
      setMembers([]);
    } else {
      setMembers(data);
    }

    setViewer(ownProfileResult.data ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    void fetchMemberRelationshipContext().then(({ context }) => {
      onRelationshipContextChange?.(context);
    });
  }, [onRelationshipContextChange, members.length]);

  const filterOptions = useMemo(() => extractDiscoverFilterOptions(members), [members]);
  const geoGroups = useMemo(() => buildDiscoverGeoGroups(members), [members]);
  const hasActiveFilters =
    debouncedFilters.query.trim().length > 0 || countActiveDiscoverFilters(debouncedFilters) > 0;

  const filteredMembers = useMemo(() => {
    const filtered = filterDiscoverMembers(members, debouncedFilters);
    return sortDiscoverMembers(filtered, sortBy, viewer);
  }, [members, debouncedFilters, sortBy, viewer]);

  const featuredSections = useMemo(() => {
    if (hasActiveFilters) return [];
    return buildFeaturedDiscoverSections(members, viewer);
  }, [hasActiveFilters, members, viewer]);

  function handleViewProfile(member: MemberProfileRecord) {
    const userId = member.user_id?.trim();
    if (!userId || !onViewMemberProfile) return;
    onViewMemberProfile(userId, member.full_name);
  }

  function handleMessageMember(member: MemberProfileRecord) {
    const userId = member.user_id?.trim();
    if (!userId || !onMessageMember) return;
    if (viewer?.user_id && viewer.user_id === userId) return;
    onMessageMember(userId, member.full_name);
  }

  function handleResetFilters() {
    setFilters(DEFAULT_DISCOVER_FILTERS);
    setSortBy("most-relevant");
  }

  function handleViewAllMembers() {
    const target = document.getElementById("discover-results-heading");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    target?.focus({ preventScroll: true });
  }

  function handleApplyGeoFilter(partial: Partial<DiscoverFilters>) {
    setFilters((current) => ({
      ...current,
      city: partial.city ?? "",
      region: partial.region ?? "",
      country: partial.country ?? "",
      travelDestination: partial.travelDestination ?? "",
    }));
  }

  return (
    <section className="et-discover" aria-labelledby="discover-heading">
      <header className="et-discover-header">
        <p className="et-discover-eyebrow">Private Network</p>
        <h2 id="discover-heading" className="et-discover-title">
          Discover
        </h2>
        <p className="et-discover-lead">
          Explore members by club, location, interests, and travel — and find meaningful golf
          connections inside EliteTee.
        </p>
        {!isLoading && !loadError ? (
          <p className="et-discover-count" aria-live="polite">
            {members.length} member{members.length === 1 ? "" : "s"} in the directory
          </p>
        ) : null}
      </header>

      <InviteGolfer variant="compact" />

      <DiscoverFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onOpenMobileFilters={() => setFiltersOpen(true)}
      />

      {isLoading ? (
        <div className="et-discover-loading" aria-live="polite" aria-busy="true">
          <p className="et-discover-empty-title">Loading members…</p>
          <p className="et-discover-empty-copy">Gathering the EliteTee member directory.</p>
        </div>
      ) : null}

      {loadError ? (
        <div className="et-discover-error" role="alert">
          <p className="et-discover-error-title">Could not load members</p>
          <p className="et-discover-error-copy">{loadError}</p>
          <button type="button" className="et-btn et-btn--forest" onClick={() => void loadMembers()}>
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !loadError && members.length === 0 ? (
        <div className="et-discover-empty">
          <p className="et-discover-empty-title">No members in the directory yet</p>
          <p className="et-discover-empty-copy">
            Approved member profiles will appear here as the directory grows.
          </p>
        </div>
      ) : null}

      {!isLoading && !loadError && members.length > 0 ? (
        <>
          {!hasActiveFilters ? (
            <>
              <DiscoverFeaturedSections
                sections={featuredSections}
                viewer={viewer}
                relationshipContext={relationshipContext}
                onViewProfile={handleViewProfile}
                onRequestIntroduction={onRequestIntroduction}
                onRespondToIntroduction={onRespondToIntroduction}
                onMessageMember={onMessageMember ? handleMessageMember : undefined}
                onViewAllMembers={handleViewAllMembers}
              />
              <DiscoverGeoBrowse groups={geoGroups} onApplyFilter={handleApplyGeoFilter} />
            </>
          ) : null}

          <section className="et-discover-results" aria-labelledby="discover-results-heading">
            <div className="et-discover-results-head">
              <h3
                id="discover-results-heading"
                className="et-discover-section-title"
                tabIndex={-1}
              >
                {hasActiveFilters ? "Filtered members" : "All Members"}
              </h3>
              <p className="et-discover-featured-count" aria-live="polite">
                {filteredMembers.length} result{filteredMembers.length === 1 ? "" : "s"}
              </p>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="et-discover-empty">
                <p className="et-discover-empty-title">No members match these filters</p>
                <p className="et-discover-empty-copy">
                  Try broadening your search or reset filters to explore the full directory.
                </p>
                <button type="button" className="et-btn et-btn--forest" onClick={handleResetFilters}>
                  Reset filters
                </button>
              </div>
            ) : (
              <ul className="et-discover-grid">
                {filteredMembers.map((member) => (
                  <li key={member.id}>
                    <DiscoverDirectoryCard
                      member={member}
                      viewer={viewer}
                      relationshipContext={relationshipContext}
                      onViewProfile={handleViewProfile}
                      onRequestIntroduction={onRequestIntroduction}
                      onRespondToIntroduction={onRespondToIntroduction}
                      onMessageMember={onMessageMember ? handleMessageMember : undefined}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      <DiscoverFilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
    </section>
  );
}
