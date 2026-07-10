# Golf Course Import

EliteTee's course library lives in `public.golf_courses`. Browser clients can **read** courses via RLS; only server-side imports may **write**.

## Environment variables

Set these in `.env.local` for local import runs (never commit secrets):

| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | Yes | Same project URL as production |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Server only.** Never `VITE_*` |
| `GOLF_COURSE_PROVIDER_URL` | When importing | Provider REST base URL |
| `GOLF_COURSE_PROVIDER_API_KEY` | When importing | Provider API key |
| `GOLF_COURSE_PROVIDER_PAGE_SIZE` | No | Default `100` |
| `GOLF_COURSE_PROVIDER_RATE_MS` | No | Delay between pages, default `500` |
| `GOLF_COURSE_PROVIDER_NAME` | No | Stored in `source_name`, default `external_provider` |

The Vite app only needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Before first import

1. Run migration `025_golf_courses_library.sql` in Supabase SQL Editor.
2. Confirm `member_course_rounds` rows are intact (Ryan's reviews unchanged).
3. Configure your provider contract and API access.

## Adapt the normalizer

Edit `normalizeProviderCourse()` in `scripts/import-golf-courses.mjs` to match your provider's JSON schema. The default expects generic fields like `name`, `city`, `state`, `country`, `lat`, `lng`.

## Commands

```bash
# Preview without writing
node scripts/import-golf-courses.mjs --dry-run

# Full import
node scripts/import-golf-courses.mjs

# Limit pages while testing
node scripts/import-golf-courses.mjs --max-pages=5
```

## Upsert behavior

- Rows upsert by `external_id` (unique).
- Slug collisions append a short suffix.
- `source_updated_at` records provider freshness.

## Rate limits

HTTP `429` responses honor `Retry-After` and retry the same page.

## Supabase Edge Function (optional)

For scheduled imports, wrap the same logic in an Edge Function with secrets stored in Supabase project settings—not in the frontend bundle.

## Member round linking

Migration `025` adds nullable `golf_course_id` to `member_course_rounds` and runs a **safe backfill** that only sets `golf_course_id` when name/location confidence is high. Review text, dates, and `would_play_again` are never modified.

Unmatched legacy rounds remain visible in **Member Activity**.

## Course images

Only store `image_url` and optional `thumbnail_url` when the provider license allows it. Do not scrape copyrighted photos.

### Image metadata columns

| Column | Purpose |
|--------|---------|
| `image_url` | Full hero / detail image |
| `thumbnail_url` | Optional smaller image for search cards |
| `image_source` | `provider`, `admin`, `verified_rep`, etc. |
| `image_attribution` | Photo credit line |
| `image_license` | License reference |
| `image_updated_at` | Last image update timestamp |

### Admin / licensed image update (server-side)

```bash
node scripts/update-golf-course-image.mjs \
  --slug=bandon-dunes \
  --image-url=https://cdn.example.com/bandon-hero.jpg \
  --thumbnail-url=https://cdn.example.com/bandon-thumb.jpg \
  --image-source=admin \
  --image-attribution="Courtesy of Bandon Dunes" \
  --image-license="Licensed for EliteTee member portal"

# Preview only
node scripts/update-golf-course-image.mjs --slug=bandon-dunes --image-url=https://... --dry-run
```

Or: `npm run update:golf-course-image -- --slug=... --image-url=...`

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (never `VITE_*`).

The portal automatically displays `image_url` / `thumbnail_url` when present; otherwise it shows the branded initials placeholder.
