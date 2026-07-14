# EliteTee Curated Course Expansion Plan

Expand the curated golf course library from **58 verified courses** (phase 0) to approximately **500 high-value courses** using manual research and editorial standards — not paid bulk providers.

**Status:** Planning only. Expansion regional files are empty. Do not import until each course is individually verified.

## Library structure

```
scripts/seed/curated/
  foundation.json                    # 8 legacy EliteTee seeds (verified)
  manifest.json                      # Phase 0 import manifest (58 courses)
  manifest.expansion.json            # Expansion tracking (planning)
  expansion-roadmap.md               # Tier priorities + first 100 research queue
  schema.json
  courses.template.csv
  regions/
    README.md
    _course-record.template.json     # Field shape for new records
    united-states.json               # Expansion slot (empty)
    united-kingdom-ireland.json
    canada.json
    australia-new-zealand.json
    europe.json
    asia.json
    middle-east.json
    other-destinations.json
    phase-0/                         # Verified starter data — safe to import
      united-states.json
      united-kingdom-ireland.json
      ...
```

| Layer | Purpose | Import |
|-------|---------|--------|
| `foundation.json` + `regions/phase-0/` | Verified starter library | `manifest.json` |
| `regions/*.json` (parent) | Expansion planning slots | `manifest.expansion.json` when populated |

## How courses are selected

A course is eligible for the curated library when it meets **at least one** of the following signals and passes verification:

### Inclusion signals

1. **Global recognition** — Widely cited as a world top-100 course, Ryder Cup / major / Open Championship host, or equivalent national championship venue.
2. **Architectural significance** — Golden Age, strategic links, or a landmark design by a recognized architect with documented influence.
3. **Elite private standing** — Consistently ranked among the best private clubs in its country or region, with documented tournament or invitation history.
4. **Destination gravity** — A primary reason golfers travel to a region (resort, links pilgrimage, sandbelt, desert destination, etc.).
5. **Member value** — Strong fit for EliteTee members: aspirational, bucket-list, or high-signal for concierge and trip planning.

### Exclusion signals

- Unverifiable identity (name ambiguity, closed club, or no authoritative source).
- Duplicate of an existing row (same course under a different name without `legacy_external_id` resolution).
- Driving range, nine-hole-only, or par-3 facilities unless historically exceptional.
- Courses added solely to inflate count without editorial merit.

### Regional balance

Target distribution (~500 total):

| Region | Goal | Phase 0 | Expansion slots |
|--------|------|---------|-----------------|
| United States | 170 | 24 | 146 |
| United Kingdom & Ireland | 60 | 15 | 45 |
| Canada | 35 | 0 | 35 |
| Australia & New Zealand | 40 | 4 | 36 |
| Europe (continental) | 92 | 2 | 90 |
| Asia | 45 | 2 | 43 |
| Middle East | 15 | 1 | 14 |
| Other destination golf | 35 | 2 | 33 |
| **Foundation overlap** | 8 | 8 | — |
| **Total** | **~500** | **58** | **442** |

Foundation courses (e.g. Pebble Beach, Cabot Cliffs) count toward regional totals but live in `foundation.json` for legacy enrichment.

### Selection workflow

1. Nominate from `expansion-roadmap.md` or regional gap analysis.
2. Assign a **provisional** `elite_tier` (see below).
3. Research required fields per verification standard.
4. Add to the correct regional expansion JSON `courses[]` array.
5. `--dry-run` import on that file; fix validation errors.
6. Editorial review; import when approved.
7. Publish from `draft` when ready for the member portal.

## Elite tier definitions

Tiers classify **editorial importance** for EliteTee — not handicap difficulty or green fees.

| Tier | `elite_tier` value | Definition | Typical signals |
|------|-------------------|------------|-----------------|
| **Tier 1** | `global_icon` | Universally recognized bucket-list courses; define the sport's geography and history. | Major/Open hosts, world top-50 lists, iconic public or private landmarks. |
| **Tier 2** | `elite_private` | Best-in-class private clubs with national or international standing; limited or no public access. | Top private rankings, historic member clubs, invitation / tour venues. |
| **Tier 3** | `destination` | Primary travel destinations — resort, links clusters, or regional pilgrimage courses. | Resort anchors, destination rankings, trip-planning draw. |
| **Tier 4** | `notable` | Strong regional championship or architecturally important courses worth curated presence. | State/provincial championships, strong second-tier national rankings. |
| **Tier 5** | `member_course` | High-quality member clubs with curated value but narrower national profile. | Excellent private or semi-private clubs; member-relevant, not global icons. |

`featured_status`:

- `featured` — Surfaces in editorial highlights (use sparingly: icons, new flagship destinations).
- `standard` — Default for most curated courses.

`curated_tags` (multi-select):

| Tag | Use when |
|-----|----------|
| `historic` | Documented historic club or design era |
| `championship` | Hosts or has hosted significant professional events |
| `links` | True links or links-style coastal course |
| `resort` | Resort-anchored golf experience |
| `architecturally_significant` | Landmark architect or design school |
| `bucket_list` | Aspirational travel course for members |
| `private` | Private or members-only access |
| `public_access` | Meaningful public or visitor access |

## Required verification standard

Every course in an expansion file must satisfy this bar **before import**.

### Minimum required (import-blocking)

| Field | Standard |
|-------|----------|
| `name` | Official course name as used by the club or governing body |
| `country` | Full country name (e.g. `United States`, not `US`) |
| `external_id` or `slug` | Stable `elitetee-curated-{slug}` after slug is confirmed |

### Strongly preferred (add before import when possible)

| Field | Standard |
|-------|----------|
| `city`, `region` | Match club postal address or official site |
| `website` | Official club or resort URL (not booking aggregators) |
| `course_type` | Editorial classification: `links`, `parkland`, `desert`, `mountain`, `heathland`, etc. |
| `access_type` | `private`, `public`, `resort`, `semi_private` |
| `elite_tier` | Assigned per definitions above |

### Verified-only (never guess)

| Field | Acceptable sources |
|-------|-------------------|
| `latitude`, `longitude` | Club website, Google Maps pin at clubhouse/course entrance, or governing-body directory |
| `architect` | Club history page, USGA/R&A records, recognized architecture references |
| `year_opened` | Club history page or authoritative golf archive |
| `holes` | Official scorecard (typically `18`) |

### Ranking metadata

- `elite_tier`, `curated_tags`, `featured_status` are **EliteTee editorial** decisions.
- Must be consistent with tier definitions; document rationale in PR or review notes when ambiguous.
- Invalid enum values are rejected at import.

### Source hierarchy

1. Official club or resort website
2. National/regional golf union or federation directory
3. R&A / USGA championship venue records
4. Established architecture references (e.g. club history, documented design credits)
5. Reputable published course rankings (for nomination only — still verify identity fields)

Do **not** use booking sites, scraped aggregators, or AI-generated summaries as primary sources for coordinates, architect, or year opened.

## When fields should remain blank

Leave fields **empty or null** when:

| Field | Leave blank when |
|-------|------------------|
| `latitude`, `longitude` | No confirmed pin; do not geocode from city name alone |
| `architect` | Multiple architects, unclear credit, or disputed attribution |
| `year_opened` | Renovation vs original opening is unclear; only year is ambiguous |
| `holes` | Not confirmed (don't default to 18) |
| `website` | No official site; use empty rather than a third-party URL |
| `city`, `region` | Course spans jurisdictions or address is unpublished (rare for private clubs) |
| `course_type`, `access_type` | Genuinely unclear after research |
| `elite_tier` | Eligible course but tier not yet reviewed — **prefer holding import** until tier is assigned |
| `curated_tags` | No tags clearly apply; empty array is valid |
| `featured_status` | Empty defaults to `standard` at enrichment time, or leave null |
| `legacy_external_id` | Only set when enriching an existing `elitetee_seed` row |

**Rule:** An incomplete but honest record is better than a complete but fabricated one.

## Prioritized expansion roadmap

See `scripts/seed/curated/expansion-roadmap.md` for tier-ordered priorities and the **first 100 courses** recommended for research (names only — no seed data until verified).

### Phase sequence

| Phase | Focus | Target count |
|-------|-------|--------------|
| **Phase 0** (complete) | Verified starter library | 58 |
| **Phase 1** | Tier 1 global icons + top Tier 2 private gaps | +100 → ~158 |
| **Phase 2** | Tier 3 destination clusters (Bandon, Streamsong, Scotland, sandbelt) | +120 → ~278 |
| **Phase 3** | Tier 4 notable championship venues by region | +120 → ~398 |
| **Phase 4** | Tier 4–5 member courses and remaining regional balance | +102 → ~500 |

## Import commands (when ready)

```bash
# Phase 0 only (current verified library)
npm run import:curated-golf-courses -- --dry-run --manifest=scripts/seed/curated/manifest.json

# Single expansion file (after verification)
npm run import:curated-golf-courses -- --dry-run --file=scripts/seed/curated/regions/united-states.json
```

Requires migration `047` applied and `SUPABASE_SERVICE_ROLE_KEY` configured.

## Related docs

- [Curated golf course seed](./curated-golf-course-seed.md) — import mechanics and field reference
- [Golf course import pipeline](./golf-course-import.md) — staged provider pipeline
- `scripts/seed/curated/regions/README.md` — regional file layout
