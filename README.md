# EliteTee

Editorial homepage for a private golf membership desk — discreet copy, no member photos, no famous-club claims.

## Run locally

```bash
cd elitetee
npm install
npm run sync-images   # optional: copy your ~/Downloads photos into public/images
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy on Vercel

1. Push this folder to GitHub (or import the repo in Vercel).
2. **Framework preset:** Vite (auto-detected). `vercel.json` is included.
3. Build downloads hero JPGs into `public/images/` and sets `VITE_IMAGE_SOURCE=local`.
4. Deploy — no secrets required.

**Default (no setup):** images load from Unsplash CDN at runtime.

**Self-hosted (recommended):** run `npm run sync-images`, commit `public/images/*.jpg`, and set `VITE_IMAGE_SOURCE=local` in Vercel project settings (or `.env.production`).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production bundle |
| `npm run fetch-images` | Download or copy hero JPGs into `public/images/` |
| `npm run preview` | Serve the production build locally |
| `npm run sync-images` | Copy five golf JPGs from `~/Downloads` |
| `npm run typecheck` | TypeScript only |

## Notes

- Example regions use fictional names (e.g. Northeast Club), not real partner affiliations.
- Golf-only photography (fairways, club grounds, understated travel)—no headshots.
- Request form opens the membership desk mailto for demo purposes.
