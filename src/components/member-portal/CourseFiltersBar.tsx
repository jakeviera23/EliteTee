import type { CourseDirectoryFilters, CourseFilterOptions, CourseSortOption } from "../../lib/courseDirectory";
import { COURSE_SORT_LABELS, countActiveFilters } from "../../lib/courseDirectory";

type CourseFiltersBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  filters: CourseDirectoryFilters;
  onFiltersChange: (filters: CourseDirectoryFilters) => void;
  filterOptions: CourseFilterOptions;
  sortBy: CourseSortOption;
  onSortChange: (value: CourseSortOption) => void;
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
    <label className="et-courses-filter">
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

export function CourseFiltersBar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  filterOptions,
  sortBy,
  onSortChange,
  onOpenMobileFilters,
}: CourseFiltersBarProps) {
  const activeFilterCount = countActiveFilters(filters);

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

  function clearFilters() {
    onFiltersChange({
      country: "",
      region: "",
      city: "",
      courseType: "",
      accessType: "",
    });
  }

  return (
    <div className="et-courses-filters">
      <label className="et-courses-search">
        <span className="visually-hidden">Search courses</span>
        <span className="et-courses-search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search courses and destinations…"
          autoComplete="off"
        />
      </label>

      <div className="et-courses-filters-toolbar">
        <button
          type="button"
          className="et-btn et-btn--secondary et-courses-filters-mobile-trigger"
          onClick={onOpenMobileFilters}
          aria-haspopup="dialog"
        >
          All filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>

        <div className="et-courses-filters-desktop" role="group" aria-label="Course filters">
          <FilterSelect
            label="Country"
            value={filters.country}
            options={filterOptions.countries}
            onChange={(value) => updateFilter("country", value)}
            emptyLabel="All countries"
          />
          <FilterSelect
            label="Course type"
            value={filters.courseType}
            options={filterOptions.courseTypes}
            onChange={(value) => updateFilter("courseType", value)}
            emptyLabel="All types"
          />
          <label className="et-courses-filter">
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

        {activeFilterCount > 0 ? (
          <button type="button" className="et-courses-filters-clear" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
