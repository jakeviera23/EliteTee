const US_STATE_CANONICAL: Record<string, string> = {
  AL: "Alabama",
  ALABAMA: "Alabama",
  AK: "Alaska",
  ALASKA: "Alaska",
  AZ: "Arizona",
  ARIZONA: "Arizona",
  AR: "Arkansas",
  ARKANSAS: "Arkansas",
  CA: "California",
  CALIFORNIA: "California",
  CO: "Colorado",
  COLORADO: "Colorado",
  CT: "Connecticut",
  CONNECTICUT: "Connecticut",
  DE: "Delaware",
  DELAWARE: "Delaware",
  FL: "Florida",
  FLORIDA: "Florida",
  GA: "Georgia",
  GEORGIA: "Georgia",
  HI: "Hawaii",
  HAWAII: "Hawaii",
  ID: "Idaho",
  IDAHO: "Idaho",
  IL: "Illinois",
  ILLINOIS: "Illinois",
  IN: "Indiana",
  INDIANA: "Indiana",
  IA: "Iowa",
  IOWA: "Iowa",
  KS: "Kansas",
  KANSAS: "Kansas",
  KY: "Kentucky",
  KENTUCKY: "Kentucky",
  LA: "Louisiana",
  LOUISIANA: "Louisiana",
  ME: "Maine",
  MAINE: "Maine",
  MD: "Maryland",
  MARYLAND: "Maryland",
  MA: "Massachusetts",
  MASSACHUSETTS: "Massachusetts",
  MI: "Michigan",
  MICHIGAN: "Michigan",
  MN: "Minnesota",
  MINNESOTA: "Minnesota",
  MS: "Mississippi",
  MISSISSIPPI: "Mississippi",
  MO: "Missouri",
  MISSOURI: "Missouri",
  MT: "Montana",
  MONTANA: "Montana",
  NE: "Nebraska",
  NEBRASKA: "Nebraska",
  NV: "Nevada",
  NEVADA: "Nevada",
  NH: "New Hampshire",
  "NEW HAMPSHIRE": "New Hampshire",
  NJ: "New Jersey",
  "NEW JERSEY": "New Jersey",
  NM: "New Mexico",
  "NEW MEXICO": "New Mexico",
  NY: "New York",
  "NEW YORK": "New York",
  NC: "North Carolina",
  "NORTH CAROLINA": "North Carolina",
  ND: "North Dakota",
  "NORTH DAKOTA": "North Dakota",
  OH: "Ohio",
  OHIO: "Ohio",
  OK: "Oklahoma",
  OKLAHOMA: "Oklahoma",
  OR: "Oregon",
  OREGON: "Oregon",
  PA: "Pennsylvania",
  PENNSYLVANIA: "Pennsylvania",
  RI: "Rhode Island",
  "RHODE ISLAND": "Rhode Island",
  SC: "South Carolina",
  "SOUTH CAROLINA": "South Carolina",
  SD: "South Dakota",
  "SOUTH DAKOTA": "South Dakota",
  TN: "Tennessee",
  TENNESSEE: "Tennessee",
  TX: "Texas",
  TEXAS: "Texas",
  UT: "Utah",
  UTAH: "Utah",
  VT: "Vermont",
  VERMONT: "Vermont",
  VA: "Virginia",
  VIRGINIA: "Virginia",
  WA: "Washington",
  WASHINGTON: "Washington",
  WV: "West Virginia",
  "WEST VIRGINIA": "West Virginia",
  WI: "Wisconsin",
  WISCONSIN: "Wisconsin",
  WY: "Wyoming",
  WYOMING: "Wyoming",
  DC: "District of Columbia",
  "DISTRICT OF COLUMBIA": "District of Columbia",
};

/** Mirrors directory visibility in search_golf_courses (migration 048+). */
export function isCourseVisibleInDirectory(course: {
  lifecycle_status?: string | null;
  source_name?: string | null;
}): boolean {
  return course.lifecycle_status === "published" || course.source_name === "elitetee_curated";
}

export function normalizeCourseLocationQuery(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const canonical = US_STATE_CANONICAL[trimmed.toUpperCase()];
  if (canonical) return canonical;

  return trimmed
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : ""))
    .join(" ");
}

export function expandCourseLocationSearchTerms(raw: string): string[] {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return [];

  const terms = new Set<string>();
  terms.add(trimmed.toLowerCase());

  const canonical = US_STATE_CANONICAL[trimmed.toUpperCase()];
  if (canonical) {
    terms.add(canonical.toLowerCase());
  }

  const normalized = normalizeCourseLocationQuery(trimmed);
  if (normalized) {
    terms.add(normalized.toLowerCase());
  }

  return [...terms];
}
