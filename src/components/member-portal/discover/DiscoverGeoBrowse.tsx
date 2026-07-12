import type { DiscoverFilters, DiscoverGeoGroup } from "../../../lib/discoverDirectory";

type DiscoverGeoBrowseProps = {
  groups: DiscoverGeoGroup[];
  onApplyFilter: (filters: Partial<DiscoverFilters>) => void;
};

export function DiscoverGeoBrowse({ groups, onApplyFilter }: DiscoverGeoBrowseProps) {
  if (groups.length === 0) return null;

  return (
    <section className="et-discover-geo" aria-labelledby="discover-geo-heading">
      <div className="et-discover-geo-head">
        <h3 id="discover-geo-heading" className="et-discover-section-title">
          Browse by location
        </h3>
        <p className="et-discover-section-lead">
          Explore members by city, region, country, and travel plans.
        </p>
      </div>
      <ul className="et-discover-geo-list">
        {groups.map((group) => (
          <li key={`${group.filterKey}:${group.filterValue}`}>
            <button
              type="button"
              className="et-discover-geo-chip"
              onClick={() =>
                onApplyFilter({
                  city: group.filterKey === "city" ? group.filterValue : "",
                  region: group.filterKey === "region" ? group.filterValue : "",
                  country: group.filterKey === "country" ? group.filterValue : "",
                  travelDestination:
                    group.filterKey === "travelDestination" ? group.filterValue : "",
                })
              }
            >
              <span>{group.label}</span>
              <span className="et-discover-geo-count">{group.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
