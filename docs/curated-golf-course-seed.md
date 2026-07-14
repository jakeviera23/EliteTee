# EliteTee Curated Golf Course Seed

High-quality golf course seeds for EliteTee without paid data providers. Curated files use `source_name = elitetee_curated` and import through the existing staged pipeline (`course_import_batches` + `course_import_records`).

## Principles

- **No fabricated data.** Only include fields you can verify. Leave unknown fields empty.
- **Stable IDs.** Default `external_id` format: `elitetee-curated-{slug}`.
- **Legacy enrichment.** Use `legacy_external_id` to update existing `elitetee_seed` rows instead of creating duplicates.
- **Draft lifecycle.** New curated imports are inserted as `lifecycle_status = draft` until published.

## Seed file structure

```
scripts/seed/curated/
  schema.json                 # JSON schema for wrapped seed files
  courses.template.csv          # CSV header template (includes ranking fields)
  manifest.json                 # Phase 0 import manifest (58 verified courses)
  manifest.expansion.json       # Expansion planning manifest (empty until verified)
  expansion-roadmap.md          # Tier priorities + first 100 research queue
  foundation.json               # Legacy EliteTee seed courses (8)
  regions/
    README.md
    _course-record.template.json
    united-states.json          # Expansion slots (empty — planning only)
    united-kingdom-ireland.json
    canada.json
    australia-new-zealand.json
    europe.json
    asia.json
    middle-east.json
    other-destinations.json
    phase-0/                    # Verified starter data — import via manifest.json
      united-states.json
      united-kingdom-ireland.json
      ...
```

See [Curated course expansion plan](./curated-course-expansion-plan.md) for selection criteria, tier definitions, and the path to ~500 courses.

### JSON format

Wrapped file (recommended for regional packs):

```json
{
  "version": 1,
  "source_name": "elitetee_curated",
  "region": "United States",
  "courses": [
    {
      "name": "Pebble Beach Golf Links",
      "slug": "pebble-beach-golf-links",
      "city": "Pebble Beach",
      "region": "California",
      "country": "United States",
      "website": "https://www.pebblebeach.com",
      "course_type": "links",
      "access_type": "public"
    }
  ]
}
```

A plain JSON array of course objects is also supported.

### CSV format

```csv
external_id,legacy_external_id,name,slug,city,region,country,latitude,longitude,website,course_type,access_type,holes,architect,year_opened
```

Lines starting with `#` are ignored. Empty cells are treated as unknown.

### Supported fields

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Course name |
| `country` | Yes | Full country name preferred |
| `external_id` | No | Defaults to `elitetee-curated-{slug}` |
| `legacy_external_id` | No | Existing row to enrich (e.g. `elitetee-seed-pebble`) |
| `slug` | No | Defaults from name |
| `city`, `region` | No | |
| `latitude`, `longitude` | No | Only when verified |
| `website` | No | Official course URL only |
| `course_type`, `access_type` | No | e.g. `links`, `private` |
| `holes` | No | Typically `18` when known |
| `architect`, `year_opened` | No | Applied after staged import when present |
| `elite_tier` | No | `global_icon`, `elite_private`, `destination`, `notable`, `member_course` |
| `curated_tags` | No | Array or comma-separated CSV of curated tags |
| `featured_status` | No | `featured` or `standard` |

### Curated ranking metadata

EliteTee uses internal ranking fields on `golf_courses` to classify important courses before UI work ships:

| Field | Values |
|-------|--------|
| `elite_tier` | `global_icon`, `elite_private`, `destination`, `notable`, `member_course` |
| `curated_tags` | `historic`, `championship`, `links`, `resort`, `architecturally_significant`, `bucket_list`, `private`, `public_access` |
| `featured_status` | `featured`, `standard` |

Unknown or invalid ranking values are rejected during import validation. Empty values are stored as `NULL` / `[]`.

Provider imports do not write these fields. They are applied only by the curated seed importer after the staged pipeline completes.

## Duplicate handling

Before staging, each record is resolved against existing `golf_courses`:

1. **`legacy_external_id`** — update the matching legacy seed row.
2. **Existing `external_id` or `slug`** — update that row.
3. **Name + location duplicate against `elitetee_seed` / `elitetee_curated`** — update the matched EliteTee row.
4. **Duplicate against another provider** — skip (logged as `skipped`).
5. **Otherwise** — import as a new curated course (`elitetee-curated-{slug}`).

This keeps the eight migration `025` seeds enrichable via `foundation.json` without creating a second Pebble Beach row.

## Commands

```bash
# Preview the full curated manifest (no database writes)
npm run import:curated-golf-courses -- --dry-run --manifest=scripts/seed/curated/manifest.json

# Import only the foundation pack
npm run import:curated-golf-courses -- --file=scripts/seed/curated/foundation.json

# Import a regional JSON pack (phase 0 verified data)
npm run import:curated-golf-courses -- --file=scripts/seed/curated/regions/phase-0/united-states.json

# Import every JSON/CSV file in a directory
npm run import:curated-golf-courses -- --dir=scripts/seed/curated/regions

# CSV import
npm run import:curated-golf-courses -- --file=scripts/seed/curated/my-courses.csv
```

Live imports require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

## Staged pipeline compatibility

Curated imports use the same RPC flow as `scripts/import-golf-courses.mjs`:

1. `service_import_create_course_batch`
2. `service_import_stage_course_record`
3. `service_import_process_course_record`
4. `service_import_finalize_course_batch`

`architect`, `year_opened`, `elite_tier`, `curated_tags`, and `featured_status` are written after processing when provided, using existing `golf_courses` columns.

## Growing to ~500 courses

1. Research courses from `scripts/seed/curated/expansion-roadmap.md`.
2. Verify fields per `docs/curated-course-expansion-plan.md`.
3. Add records to regional expansion JSON files under `scripts/seed/curated/regions/` (not `phase-0/`).
4. Leave coordinates, architect, and year opened empty until verified.
5. Run `--dry-run` on the expansion file, then import after editorial review.
6. Publish approved courses from `draft` to `published` when ready for the member portal.

Phase 0 includes **58** verified courses (`foundation.json` + `regions/phase-0/`). Expansion files are empty planning slots toward ~500.

## Related docs

- [Curated course expansion plan](./curated-course-expansion-plan.md)
- [Golf course import pipeline](./golf-course-import.md)
- Migration `045` / `046` / `047` — import batches, duplicate detection, draft lifecycle, curated ranking
