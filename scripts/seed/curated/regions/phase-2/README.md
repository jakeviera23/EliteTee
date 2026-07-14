# Phase 2 curated expansion (200 courses)

**Status:** Imported to production (199 inserted, 1 skipped duplicate)

## Batch summary

| Metric | Count |
|--------|------:|
| Seed records | 200 |
| Inserted | 199 |
| Skipped (duplicate) | 1 |
| Errors | 0 |

## Regional breakdown

| Region file | Courses |
|-------------|--------:|
| `united-states.json` | 55 |
| `united-kingdom-ireland.json` | 46 |
| `canada.json` | 21 |
| `australia-new-zealand.json` | 20 |
| `europe.json` | 32 |
| `asia.json` | 14 |
| `middle-east.json` | 5 |
| `other-destinations.json` | 7 |

## Commands

Regenerate JSON from source data:

```bash
node scripts/seed/curated/phase-2/build-phase-2.mjs
```

Dry-run import:

```bash
npx tsx scripts/import-curated-golf-courses.mjs --dry-run --manifest=scripts/seed/curated/manifest.phase-2.json
```

Live import:

```bash
npx tsx scripts/import-curated-golf-courses.mjs --manifest=scripts/seed/curated/manifest.phase-2.json
```

Metadata gap audit:

```bash
node scripts/seed/curated/phase-2/audit-metadata.mjs
```

## Skipped duplicate

**Kinloch Golf Club** (`kinloch-golf-club`) was skipped because a member-submitted row already exists:

- `kinloch-golf-club-manakin-sabot-va` (`source_name = member_submitted`)

Admin action: merge or replace the member-submitted row with curated metadata, or leave as-is.

## Manual enrichment queue

All 200 Phase 2 records include core directory fields (name, city, region, country, access, type, website, slug, tier, tags). None include:

- `architect`
- `year_opened`
- `holes`
- `latitude` / `longitude`

Run `audit-metadata.mjs` for the full per-course list.
