/**
 * Original golf photography from ~/Downloads (bundled at build via @local).
 * Run `npm run sync-images` to copy into public/images/ for static hosting.
 */
import heroCoastal from "@local/andrew-rice-waE_CT2q8Os-unsplash.jpg?url";
import heroAerial from "@local/andrew-anderson-CtyC2JjLhVg-unsplash.jpg?url";
import heroSwing from "@local/peter-drew-YBRMHuQIk2Q-unsplash.jpg?url";
import heroSunset from "@local/benny-hassum-c6UloF3fF4U-unsplash.jpg?url";
import heroClubhouse from "@local/avansear-3NpJk7j20HY-unsplash.jpg?url";

export const photos = {
  /** Hero — coastal fairway */
  heroCoastal,
  /** On the walk — aerial bunkers */
  heroAerial,
  /** Between rounds — swing / sky */
  heroSwing,
  /** Example host regions — sunset green */
  heroSunset,
  /** Club grounds — clubhouse */
  heroClubhouse,
} as const;
