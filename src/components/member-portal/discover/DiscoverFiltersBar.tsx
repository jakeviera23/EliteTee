import type {
  DiscoverFilterOptions,
  DiscoverFilters,
  DiscoverSortOption,
} from "../../../lib/discoverDirectory";
import { DISCOVER_SORT_LABELS, countActiveDiscoverFilters } from "../../../lib/discoverDirectory";

type DiscoverFiltersBarProps = {
  filters: DiscoverFilters;
  onFiltersChange: (filters: DiscoverFilters) => void;
  filterOptions: DiscoverFilterOptions;
  sortBy: DiscoverSortOption;
  onSortChange: (value: DiscoverSortOption) => void;
  onOpenMobileFilters: () => void;
};

function FilterSelect({
  label,
  value,
  options,
  onChange,
  emptyLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  emptyLabel: string;
}) {
  return (
    <label className="et-discover-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DiscoverFiltersBar({
  filters,
  onFiltersChange,
  filterOptions,
  sortBy,
  onSortChange,
  onOpenMobileFilters,
}: DiscoverFiltersBarProps) {
  const activeCount = countActiveDiscoverFilters(filters);

  function updateFilter<Key extends keyof DiscoverFilters>(key: Key, value: DiscoverFilters[Key]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="et-discover-filters">
      <label className="et-discover-search">
        <span className="visually-hidden">Search members</span>
        <span className="et-discover-search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          value={filters.query}
          onChange={(event) => updateFilter("query", event.target.value)}
          placeholder="Search members, clubs, places, interests…"
        />
      </label>

      <div className="et-discover-filters-toolbar">
        <div className="et-discover-filters-desktop">
          <FilterSelect
            label="Location"
            value={filters.location}
            options={filterOptions.locations}
            onChange={(value) => updateFilter("location", value)}
            emptyLabel="Any location"
          />
          <FilterSelect
            label="Club"
            value={filters.club}
            options={filterOptions.clubs}
            onChange={(value) => updateFilter("club", value)}
            emptyLabel="Any club"
          />
          <label className="et-discover-filter">
            <span>Sort</span>
            <select
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value as DiscoverSortOption)}
            >
              {Object.entries(DISCOVER_SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          className="et-btn et-btn--secondary et-discover-filters-mobile-trigger"
          onClick={onOpenMobileFilters}
        >
          All filters{activeCount > 0 ? ` · ${activeCount}` : ""}
        </button>
      </div>
    </div>
  );
}
