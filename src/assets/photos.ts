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

  // Course hero images (match asset sheet subtitles)
  courseNationalGolfLinks: asset("images/course-national-golf-links.png"),
  coursePebbleBeach: asset("images/hero-coastal.jpg"),
  courseStAndrews: asset("images/region-london-heathland-club.png"),
  courseBandonDunes: asset("images/hero-aerial.jpg"),
  courseCabotCliffs: asset("images/elitetee-coast-aerial.png"),
  courseRoyalCountyDown: asset("images/region-scandinavian-coastal-club.png"),

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

export function getCoursePhoto(courseIdOrName: string): string | undefined {
  return coursePhotosById[courseIdOrName] ?? coursePhotosByName[courseIdOrName];
}
