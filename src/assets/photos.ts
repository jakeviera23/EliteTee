/**
 * Hero images in public/images/ (run `npm run sync-images` or `npm run fetch-images`).
 */
const base = import.meta.env.BASE_URL;

function asset(path: string) {
  return `${base}${path.replace(/^\//, "")}`;
}

export const photos = {
  heroCoastal: asset("images/hero-coastal.jpg"),
  heroAerial: asset("images/hero-aerial.jpg"),
  heroSwing: asset("images/hero-swing.jpg"),
  heroSunset: asset("images/hero-sunset.jpg"),
  heroClubhouse: asset("images/hero-clubhouse.jpg"),
  clubhouseSunsetLuxury: asset("images/elitetee-clubhouse-sunset.png"),
  teeCloseupLuxury: asset("images/elitetee-tee-closeup.png"),
  clubhouseEveningLuxury: asset("images/elitetee-clubhouse-evening.png"),
  heroSwingOceanLuxury: asset("images/elitetee-hero-swing-ocean.png"),
  founderPortrait: asset("images/elitetee-founder.jpg"),
} as const;
