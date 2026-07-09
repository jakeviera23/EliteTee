import { useRef, useState } from "react";
import { photos } from "../../assets/photos";
import { earlyStageCopy } from "../../data/portalSocial";

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
  onNavigate?: (tab: "profile" | "messages") => void;
};

export function PortalDiscover({ onViewCourse: _onViewCourse, onNavigate: _onNavigate }: PortalDiscoverProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All Members");
  const membersRef = useRef<HTMLDivElement>(null);

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
            ref={membersRef}
          >
            <h3 id="founding-members-heading" className="discover-section-title">
              {earlyStageCopy.discoverFoundingTitle}
            </h3>
            <div className="portal-discover-founding-body">
              <p>{earlyStageCopy.discoverFoundingBody}</p>
              <p className="portal-discover-founding-note">{earlyStageCopy.discoverFoundingNote}</p>
              {query.trim() || activeFilter !== "All Members" ? (
                <p className="discover-no-match">{earlyStageCopy.discoverNoMatch}</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
