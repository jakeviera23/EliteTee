import { useState } from "react";
import { earlyStageCopy } from "../../data/portalSocial";

type PortalDiscoverProps = {
  onViewCourse?: (courseId: string) => void;
};

export function PortalDiscover({ onViewCourse: _onViewCourse }: PortalDiscoverProps) {
  const [query, setQuery] = useState("");

  return (
    <section className="portal-social-page portal-discover-page" aria-labelledby="discover-heading">
      <header className="portal-section-head portal-section-head--social portal-section-head--compact">
        <h2 id="discover-heading">Discover</h2>
        <p>Find golfers, courses, and destinations as the EliteTee community grows.</p>
        <p className="portal-early-badge">{earlyStageCopy.earlyCommunity}</p>
      </header>

      <div className="portal-discover-layout portal-discover-layout--early">
        <section className="portal-discover-panel" aria-labelledby="find-golfers-heading">
          <h3 id="find-golfers-heading">Find Golfers</h3>
          <label className="portal-search-label portal-search-label--social">
            <span className="visually-hidden">Search golfers</span>
            <input
              type="search"
              className="portal-search-input"
              placeholder="Search by name, location, or home course…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="portal-empty portal-empty--inline portal-empty--discover">
            <p>{earlyStageCopy.discoverGolfersEmpty}</p>
          </div>
        </section>

        <section className="portal-discover-panel" aria-labelledby="popular-destinations-heading">
          <h3 id="popular-destinations-heading">Popular Destinations</h3>
          <div className="portal-empty portal-empty--inline portal-empty--discover">
            <p>{earlyStageCopy.popularDestinationsEmpty}</p>
          </div>
        </section>
      </div>
    </section>
  );
}
