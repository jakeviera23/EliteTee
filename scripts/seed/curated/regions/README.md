# Curated regional seed structure

EliteTee curated courses are organized in two layers:

| Layer | Path | Purpose |
|-------|------|---------|
| **Phase 0** | `phase-0/` | Verified starter library (58 courses today). Safe to import when approved. |
| **Expansion** | `regions/*.json` | Empty planning files for growth to ~500 courses. **Do not import until verified.** |

## Regional files (expansion)

| File | Regional goal | Phase 0 verified | Expansion slots |
|------|---------------|------------------|-----------------|
| `united-states.json` | 170 | 24 | 146 |
| `united-kingdom-ireland.json` | 60 | 15 | 45 |
| `canada.json` | 35 | 0 | 35 |
| `australia-new-zealand.json` | 40 | 4 | 36 |
| `europe.json` | 92 | 2 | 90 |
| `asia.json` | 45 | 2 | 43 |
| `middle-east.json` | 15 | 1 | 14 |
| `other-destinations.json` | 35 | 2 | 33 |

`foundation.json` (parent directory) holds 8 legacy EliteTee seed courses with ranking metadata.

**Total library target:** ~500 courses (58 phase 0 + ~442 expansion).

## Course record template

Copy the field shape from `_course-record.template.json` when adding a verified course:

- `name`, `country` — required before import
- `city`, `region`, `website`, `course_type`, `access_type` — add when verified
- `latitude`, `longitude`, `architect`, `year_opened`, `holes` — only with a primary source
- `elite_tier`, `curated_tags`, `featured_status` — EliteTee editorial classification

Leave unknown fields empty. Never guess coordinates or history.

## Manifests

| Manifest | Use |
|----------|-----|
| `../manifest.json` | Phase 0 import (current 58-course library) |
| `../manifest.expansion.json` | Expansion tracking only — empty until courses are verified |

## Workflow

1. Pick a course from `../expansion-roadmap.md` research queue.
2. Verify fields per `docs/curated-course-expansion-plan.md`.
3. Add the record to the correct regional expansion JSON file.
4. Run `--dry-run` import on that file only after review.
5. Import when `SUPABASE_SERVICE_ROLE_KEY` is configured and migration 047 is applied.

See `docs/curated-course-expansion-plan.md` for selection criteria and tier definitions.
