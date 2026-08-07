import { useRef } from "react";
import { useDialogFocus } from "../../../hooks/useDialogFocus";
import type {
  DiscoverFilterOptions,
  DiscoverFilters,
  DiscoverSortOption,
} from "../../../lib/discoverDirectory";
import {
  DEFAULT_DISCOVER_FILTERS,
  DISCOVER_SORT_LABELS,
  countActiveDiscoverFilters,
} from "../../../lib/discoverDirectory";

type DiscoverFilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  filters: DiscoverFilters;
  onFiltersChange: (filters: DiscoverFilters) => void;
  filterOptions: DiscoverFilterOptions;
  sortBy: DiscoverSortOption;
  onSortChange: (value: DiscoverSortOption) => void;
};

function DrawerSelect({
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
    <label className="et-discover-drawer-field">
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

export function DiscoverFilterDrawer({
  open,
  onClose,
  filters,
  onFiltersChange,
  filterOptions,
  sortBy,
  onSortChange,
}: DiscoverFilterDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus({ active: open, dialogRef, onEscape: onClose });
  if (!open) return null;

  function updateFilter<Key extends keyof DiscoverFilters>(key: Key, value: DiscoverFilters[Key]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  const activeCount = countActiveDiscoverFilters(filters);

  return (
    <div className="et-discover-drawer-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="et-discover-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discover-filter-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="et-discover-drawer-head">
          <div>
            <p className="et-discover-eyebrow">Member Discovery</p>
            <h3 id="discover-filter-drawer-title">Filters</h3>
          </div>
          <button type="button" className="et-discover-drawer-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </header>

        <div className="et-discover-drawer-body">
          <label className="et-discover-drawer-field">
            <span>Search</span>
            <input
              type="search"
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder="Name, club, interest…"
            />
          </label>

          <DrawerSelect
            label="Location"
            value={filters.location}
            options={filterOptions.locations}
            onChange={(value) => updateFilter("location", value)}
            emptyLabel="Any location"
          />
          <DrawerSelect
            label="Club"
            value={filters.club}
            options={filterOptions.clubs}
            onChange={(value) => updateFilter("club", value)}
            emptyLabel="Any club"
          />
          <DrawerSelect
            label="City"
            value={filters.city}
            options={filterOptions.cities}
            onChange={(value) => updateFilter("city", value)}
            emptyLabel="Any city"
          />
          <DrawerSelect
            label="Region"
            value={filters.region}
            options={filterOptions.regions}
            onChange={(value) => updateFilter("region", value)}
            emptyLabel="Any region"
          />
          <DrawerSelect
            label="Country"
            value={filters.country}
            options={filterOptions.countries}
            onChange={(value) => updateFilter("country", value)}
            emptyLabel="Any country"
          />
          <DrawerSelect
            label="Industry"
            value={filters.industry}
            options={filterOptions.industries}
            onChange={(value) => updateFilter("industry", value)}
            emptyLabel="Any industry"
          />
          <DrawerSelect
            label="Golf interest"
            value={filters.golfInterest}
            options={filterOptions.golfInterests}
            onChange={(value) => updateFilter("golfInterest", value)}
            emptyLabel="Any golf interest"
          />
          <DrawerSelect
            label="Business interest"
            value={filters.businessInterest}
            options={filterOptions.businessInterests}
            onChange={(value) => updateFilter("businessInterest", value)}
            emptyLabel="Any business interest"
          />
          <DrawerSelect
            label="Travel destination"
            value={filters.travelDestination}
            options={filterOptions.travelDestinations}
            onChange={(value) => updateFilter("travelDestination", value)}
            emptyLabel="Any destination"
          />
          <label className="et-discover-drawer-field">
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

        <footer className="et-discover-drawer-foot">
          <button
            type="button"
            className="et-btn et-btn--ghost"
            onClick={() => onFiltersChange(DEFAULT_DISCOVER_FILTERS)}
          >
            Reset{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
          <button type="button" className="et-btn et-btn--forest" onClick={onClose}>
            Show results
          </button>
        </footer>
      </div>
    </div>
  );
}
