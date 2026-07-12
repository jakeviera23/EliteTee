export type ParsedCourseLocation = {
  city: string;
  region: string;
  country: string;
  confidence: "high" | "medium" | "low";
  source: "structured" | "comma" | "us_suffix" | "empty";
};

const US_STATE_NAMES: Record<string, string> = {
  alabama: "Alabama",
  alaska: "Alaska",
  arizona: "Arizona",
  arkansas: "Arkansas",
  california: "California",
  colorado: "Colorado",
  connecticut: "Connecticut",
  delaware: "Delaware",
  florida: "Florida",
  georgia: "Georgia",
  hawaii: "Hawaii",
  idaho: "Idaho",
  illinois: "Illinois",
  indiana: "Indiana",
  iowa: "Iowa",
  kansas: "Kansas",
  kentucky: "Kentucky",
  louisiana: "Louisiana",
  maine: "Maine",
  maryland: "Maryland",
  massachusetts: "Massachusetts",
  michigan: "Michigan",
  minnesota: "Minnesota",
  mississippi: "Mississippi",
  missouri: "Missouri",
  montana: "Montana",
  nebraska: "Nebraska",
  nevada: "Nevada",
  "new hampshire": "New Hampshire",
  "new jersey": "New Jersey",
  "new mexico": "New Mexico",
  "new york": "New York",
  "north carolina": "North Carolina",
  "north dakota": "North Dakota",
  ohio: "Ohio",
  oklahoma: "Oklahoma",
  oregon: "Oregon",
  pennsylvania: "Pennsylvania",
  "rhode island": "Rhode Island",
  "south carolina": "South Carolina",
  "south dakota": "South Dakota",
  tennessee: "Tennessee",
  texas: "Texas",
  utah: "Utah",
  vermont: "Vermont",
  virginia: "Virginia",
  washington: "Washington",
  "west virginia": "West Virginia",
  wisconsin: "Wisconsin",
  wyoming: "Wyoming",
  "district of columbia": "District of Columbia",
};

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function titleCaseRegion(value: string): string {
  const lower = value.trim().toLowerCase();
  if (US_STATE_NAMES[lower]) return US_STATE_NAMES[lower];
  if (/^[a-z]{2}$/i.test(value.trim())) return value.trim().toUpperCase();
  return value
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : ""))
    .join(" ");
}

function parseCommaSeparatedLocation(raw: string): ParsedCourseLocation | null {
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      city: "",
      region: "",
      country: "",
      confidence: "low",
      source: "empty",
    };
  }

  if (parts.length === 1) {
    return null;
  }

  if (parts.length === 2) {
    return {
      city: parts[0] ?? "",
      region: titleCaseRegion(parts[1] ?? ""),
      country: "United States",
      confidence: "high",
      source: "comma",
    };
  }

  return {
    city: parts[0] ?? "",
    region: titleCaseRegion(parts[parts.length - 2] ?? ""),
    country: parts[parts.length - 1] ?? "",
    confidence: "high",
    source: "comma",
  };
}

function parseUsSuffixLocation(raw: string): ParsedCourseLocation | null {
  const trimmed = normalizeWhitespace(raw);
  if (!trimmed) return null;

  const tokens = trimmed.split(" ");
  if (tokens.length < 2) return null;

  const lastToken = tokens[tokens.length - 1] ?? "";

  if (/^[a-z]{2}$/i.test(lastToken)) {
    const city = tokens.slice(0, -1).join(" ");
    return {
      city,
      region: lastToken.toUpperCase(),
      country: "United States",
      confidence: "high",
      source: "us_suffix",
    };
  }

  for (let wordCount = 1; wordCount <= 3; wordCount += 1) {
    const regionCandidate = tokens.slice(-wordCount).join(" ").toLowerCase();
    const canonical = US_STATE_NAMES[regionCandidate];
    if (!canonical) continue;

    const city = tokens.slice(0, -wordCount).join(" ").trim();
    if (!city) return null;

    return {
      city,
      region: canonical,
      country: "United States",
      confidence: wordCount === 1 ? "high" : "medium",
      source: "us_suffix",
    };
  }

  return null;
}

/** Best-effort US-focused parser for legacy single-string course locations. */
export function parseLegacyCourseLocation(raw: string | null | undefined): ParsedCourseLocation {
  const trimmed = normalizeWhitespace(raw ?? "");
  if (!trimmed) {
    return {
      city: "",
      region: "",
      country: "",
      confidence: "low",
      source: "empty",
    };
  }

  const commaParsed = parseCommaSeparatedLocation(trimmed);
  if (commaParsed) return commaParsed;

  const suffixParsed = parseUsSuffixLocation(trimmed);
  if (suffixParsed) return suffixParsed;

  return {
    city: trimmed,
    region: "",
    country: "",
    confidence: "low",
    source: "empty",
  };
}

export function buildCourseLocationSnapshot(parts: {
  city: string;
  region: string;
  country: string;
}): string {
  return [parts.city, parts.region, parts.country].map((part) => part.trim()).filter(Boolean).join(", ");
}

export function mergeStructuredCourseLocation(input: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  fallbackLocation?: string | null;
}): ParsedCourseLocation {
  const city = input.city?.trim() ?? "";
  const region = input.region?.trim() ?? "";
  const country = input.country?.trim() ?? "";

  if (city || region || country) {
    return {
      city,
      region,
      country,
      confidence: region && country ? "high" : region || country ? "medium" : "low",
      source: "structured",
    };
  }

  return parseLegacyCourseLocation(input.fallbackLocation);
}
