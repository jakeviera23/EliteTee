import type { DiscoverFilters, DiscoverGeoGroup } from "../../../lib/discoverDirectory";

type DiscoverGeoBrowseProps = {
  groups: DiscoverGeoGroup[];
  onApplyFilter: (filters: Partial<DiscoverFilters>) => void;
};

export function DiscoverGeoBrowse({ groups, onApplyFilter }: DiscoverGeoBrowseProps) {
  const featuredGroups = groups.slice(0, 5);
  if (featuredGroups.length === 0) return null;

  return (
    <section className="et-discover-geo" aria-label="Popular member locations">
      <p className="et-discover-geo-label">Explore places</p>
      <ul className="et-discover-geo-list">
        {featuredGroups.map((group) => (
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
              <span>{group.label.replace(/^(City|Region|Country|Travel):\s*/, "")}</span>
              <span className="et-discover-geo-count">{group.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
