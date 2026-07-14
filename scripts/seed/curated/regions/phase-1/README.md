# Phase 1 curated expansion batch

First **100** premium courses from `expansion-roadmap.md`, verified for identity fields and editorial ranking metadata.

| Region | File | Courses |
|--------|------|---------|
| United States | `united-states.json` | 48 |
| United Kingdom & Ireland | `united-kingdom-ireland.json` | 17 |
| Canada | `canada.json` | 8 |
| Australia & New Zealand | `australia-new-zealand.json` | 9 |
| Europe | `europe.json` | 6 |
| Asia | `asia.json` | 6 |
| Middle East | `middle-east.json` | 2 |
| Other destinations | `other-destinations.json` | 4 |

## Import

```bash
# Preview (no database writes)
npx tsx scripts/import-curated-golf-courses.mjs --dry-run --manifest=scripts/seed/curated/manifest.phase-1.json

# Live import (requires SUPABASE_SERVICE_ROLE_KEY + migration 047)
npx tsx scripts/import-curated-golf-courses.mjs --manifest=scripts/seed/curated/manifest.phase-1.json
```

## Regenerate from source

Course records are defined in `scripts/seed/curated/phase-1/build-phase-1.mjs`. After edits:

```bash
node scripts/seed/curated/phase-1/build-phase-1.mjs
```

## Verification standard

- **Included:** official name, city, region, country, website (when confirmed), `course_type`, `access_type`, `elite_tier`, `curated_tags`, `featured_status`
- **Architect / year_opened:** only when stated on official club or resort pages
- **Omitted unless verified:** `latitude`, `longitude`, `holes`, `website` (private clubs without public sites)

See `docs/curated-course-expansion-plan.md` for full criteria.
