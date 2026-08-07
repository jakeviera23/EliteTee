/**
 * Hero images in public/images/ (run `npm run sync-images` or `npm run fetch-images`).
 *
 * Course heroes align with EliteTee visual asset labels:
 * - National Golf Links: windmill fairway
 * - Pebble Beach: coastal cliff green above the ocean
 * - St Andrews: classic heathland / links parkland
 * - Bandon Dunes: rolling dunes aerial
 * - Cabot Cliffs: dramatic Atlantic coastal cliffs
 * - Royal County Down: rugged coastal links dunes
 */
const base = import.meta.env.BASE_URL;

function asset(path: string) {
  return `${base}${path.replace(/^\//, "")}`;
}

export const photos = {
  // Homepage & marketing heroes
  heroCoastal: asset("images/hero-coastal.jpg"),
  heroAerial: asset("images/hero-aerial.jpg"),
  heroSwing: asset("images/hero-swing.jpg"),
  heroSunset: asset("images/hero-sunset.jpg"),
  heroClubhouse: asset("images/hero-clubhouse.jpg"),

  // Lifestyle & clubhouse
  clubhouseSunsetLuxury: asset("images/elitetee-clubhouse-sunset.png"),
  teeCloseupLuxury: asset("images/elitetee-tee-closeup.png"),
  clubhouseEveningLuxury: asset("images/elitetee-clubhouse-evening.png"),
  heroSwingOceanLuxury: asset("images/elitetee-hero-swing-ocean.png"),

  // Founder & profile
  founderPortrait: asset("images/elitetee-founder.jpg"),

  // Feed post examples
  coastAerial: asset("images/elitetee-coast-aerial.png"),
  swingHorizon: asset("images/elitetee-swing-horizon.png"),
  swingingNew: asset("images/elitetee-swinging-new.png"),

  // Course hero images — dedicated course photos in public/images/courses/
  courseNationalGolfLinks: asset("images/courses/national-golf-links.png"),
  coursePebbleBeach: asset("images/courses/pebble-beach.png"),
  courseStAndrews: asset("images/courses/st-andrews.png"),
  courseBandonDunes: asset("images/courses/bandon-dunes.png"),
  courseCabotCliffs: asset("images/courses/cabot-cliffs.png"),
  courseRoyalCountyDown: asset("images/courses/royal-county-down.png"),
  courseWingedFoot: asset("images/courses/winged-foot.png"),
  coursePineValley: asset("images/courses/pine-valley.png"),
  courseSeminole: asset("images/courses/seminole.png"),
  courseCypressPoint: asset("images/courses/cypress-point.png"),
  courseRoyalMelbourne: asset("images/courses/royal-melbourne.png"),

  // Regional / thumbnail references
  regionLondon: asset("images/region-london-heathland-club.png"),
  regionNortheast: asset("images/region-northeast-club.png"),
  regionScandinavian: asset("images/region-scandinavian-coastal-club.png"),
  regionSouthFlorida: asset("images/region-south-florida-club.png"),
} as const;

/** Course id → primary hero image */
export const coursePhotosById: Record<string, string> = {
  "course-ngla": photos.courseNationalGolfLinks,
  "course-pebble": photos.coursePebbleBeach,
  "course-standrews": photos.courseStAndrews,
  "course-bandon": photos.courseBandonDunes,
  "course-cabot": photos.courseCabotCliffs,
  "course-rcd": photos.courseRoyalCountyDown,
};

/** Course name → primary hero image (for feed posts) */
export const coursePhotosByName: Record<string, string> = {
  "National Golf Links of America": photos.courseNationalGolfLinks,
  "Pebble Beach Golf Links": photos.coursePebbleBeach,
  "St Andrews Links": photos.courseStAndrews,
  "Bandon Dunes": photos.courseBandonDunes,
  "Cabot Cliffs": photos.courseCabotCliffs,
  "Royal County Down": photos.courseRoyalCountyDown,
};

function normalizeCoursePhotoKey(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Bundled, approved visual references. Resort-wide imagery is intentionally
 * limited to courses at that same destination; unrelated courses retain the
 * branded fallback rather than showing a misleading photograph.
 */
const coursePhotosByNormalizedName: Record<string, string> = {
  "national golf links of america": photos.courseNationalGolfLinks,
  "pebble beach golf links": photos.coursePebbleBeach,
  "st andrews links": photos.courseStAndrews,
  "old course at st andrews": photos.courseStAndrews,
  "bandon dunes": photos.courseBandonDunes,
  "bandon dunes golf resort": photos.courseBandonDunes,
  "bandon dunes golf resort old macdonald": photos.courseBandonDunes,
  "old macdonald": photos.courseBandonDunes,
  "bandon trails": photos.courseBandonDunes,
  "pacific dunes": photos.courseBandonDunes,
  "cabot cliffs": photos.courseCabotCliffs,
  "royal county down": photos.courseRoyalCountyDown,
  "royal county down golf club": photos.courseRoyalCountyDown,
  "winged foot": photos.courseWingedFoot,
  "winged foot golf club": photos.courseWingedFoot,
  "pine valley": photos.coursePineValley,
  "pine valley golf club": photos.coursePineValley,
  "seminole": photos.courseSeminole,
  "seminole golf club": photos.courseSeminole,
  "cypress point": photos.courseCypressPoint,
  "cypress point club": photos.courseCypressPoint,
  "royal melbourne": photos.courseRoyalMelbourne,
  "royal melbourne golf club": photos.courseRoyalMelbourne,
};

export function getCoursePhoto(courseIdOrName: string): string | undefined {
  const value = courseIdOrName.trim();
  if (!value) return undefined;

  return (
    coursePhotosById[value] ??
    coursePhotosByName[value] ??
    coursePhotosByNormalizedName[normalizeCoursePhotoKey(value)]
  );
}
