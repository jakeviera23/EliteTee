import { useEffect } from "react";
import type { CourseDirectoryFilters, CourseFilterOptions, CourseSortOption } from "../../lib/courseDirectory";
import { COURSE_SORT_LABELS, countActiveFilters } from "../../lib/courseDirectory";

type CourseFilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  filters: CourseDirectoryFilters;
  onFiltersChange: (filters: CourseDirectoryFilters) => void;
  filterOptions: CourseFilterOptions;
  sortBy: CourseSortOption;
  onSortChange: (value: CourseSortOption) => void;
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
    <label className="et-courses-drawer-field">
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

export function CourseFilterDrawer({
  open,
  onClose,
  filters,
  onFiltersChange,
  filterOptions,
  sortBy,
  onSortChange,
}: CourseFilterDrawerProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function updateFilter<Key extends keyof CourseDirectoryFilters>(
    key: Key,
    value: CourseDirectoryFilters[Key],
  ) {
    const next = { ...filters, [key]: value };
    if (key === "country") {
      next.region = "";
      next.city = "";
    } else if (key === "region") {
      next.city = "";
    }
    onFiltersChange(next);
  }

  return (
    <div className="et-courses-drawer-backdrop" role="presentation" onClick={onClose}>
      <div
        className="et-courses-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="courses-filter-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="et-courses-drawer-head">
          <h2 id="courses-filter-drawer-title">Filter courses</h2>
          <button type="button" className="et-courses-drawer-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </header>

        <div className="et-courses-drawer-body">
          <DrawerSelect
            label="Country"
            value={filters.country}
            options={filterOptions.countries}
            onChange={(value) => updateFilter("country", value)}
            emptyLabel="All countries"
          />
          <DrawerSelect
            label="Region"
            value={filters.region}
            options={filterOptions.regions}
            onChange={(value) => updateFilter("region", value)}
            emptyLabel="All regions"
          />
          <DrawerSelect
            label="City / destination"
            value={filters.city}
            options={filterOptions.cities}
            onChange={(value) => updateFilter("city", value)}
            emptyLabel="All cities"
          />
          <DrawerSelect
            label="Course type"
            value={filters.courseType}
            options={filterOptions.courseTypes}
            onChange={(value) => updateFilter("courseType", value)}
            emptyLabel="All types"
          />
          <DrawerSelect
            label="Access type"
            value={filters.accessType}
            options={filterOptions.accessTypes}
            onChange={(value) => updateFilter("accessType", value)}
            emptyLabel="All access"
          />
          <label className="et-courses-drawer-field">
            <span>Sort</span>
            <select
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value as CourseSortOption)}
            >
              {(Object.keys(COURSE_SORT_LABELS) as CourseSortOption[]).map((option) => (
                <option key={option} value={option}>
                  {COURSE_SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <footer className="et-courses-drawer-foot">
          {countActiveFilters(filters) > 0 ? (
            <button
              type="button"
              className="et-btn et-btn--secondary et-courses-drawer-clear"
              onClick={() =>
                onFiltersChange({
                  country: "",
                  region: "",
                  city: "",
                  courseType: "",
                  accessType: "",
                })
              }
            >
              Clear filters
            </button>
          ) : null}
          <button type="button" className="et-btn et-btn--primary" onClick={onClose}>
            Show results
          </button>
        </footer>
      </div>
    </div>
  );
}
