# EliteTee Design System v2.0

**Status:** Foundation created · **Not wired into the app yet**

This document defines the complete premium design language for EliteTee Version 2.0. No existing pages have been modified.

---

## Design direction

| Principle | Expression |
|-----------|------------|
| **Luxury** | Restrained gold accents, soft shadows, generous padding |
| **Minimal** | Hairline borders, limited color palette, no visual noise |
| **Modern** | Clean sans UI type, subtle blur nav, precise spacing grid |
| **Editorial** | Newsreader serif headlines, eyebrow labels, pull quotes |
| **Spacious** | Section padding increased ~15–20%, card padding up |
| **Sophisticated** | Muted antique gold `#A69470`, warm charcoal `#181715` |
| **Timeless** | No trendy gradients, no bright SaaS blue, no heavy radius |

**References:** Apple (clarity, system fonts), Aman (warmth, editorial calm), Porsche (precision, metrics), Arc Browser (sidebar, soft dark), Linear (micro-labels, hairlines).

---

## File structure (new — v2 only)

```
src/design-system/
├── index.css           ← single import when migration starts
├── tokens.css          ← colors, spacing, shadows, motion tokens
├── typography.css      ← .et-h1, .et-body, .et-eyebrow, etc.
├── layout.css          ← .et-container, .et-section, .et-stack
├── components.css      ← buttons, inputs, cards, badges, nav, dropdowns
├── states.css          ← loading, empty, success, error, toasts
├── motion.css          ← animations, reduced-motion safe
├── icons.css           ← SVG conventions, logo mark
└── DESIGN-SYSTEM.md    ← this file
```

**Not imported anywhere yet.** `main.tsx` still loads only `./index.css`.

---

## Color palette

### Dark app theme (member portal, private surfaces)

Apply with `class="et-theme-dark"` or `data-et-theme="dark"`.

| Token | v2 value | v1 (current) | Change |
|-------|----------|--------------|--------|
| Background base | `#181715` warm charcoal | `#090908` pure black | Warmer, less harsh |
| Background elevated | `#1F1D1B` | `#10100e` | Lifted panel tone |
| Background surface | `#262320` | `#141310` | Card surfaces |
| Text primary | `rgba(248,246,242,0.94)` | `#f0ede6` | Slightly softer |
| Text secondary | `rgba(248,246,242,0.68)` | `rgba(240,237,230,0.74)` | More hierarchy |
| **Gold accent** | `#A69470` | `#C4A962` | **Subtle antique gold** |
| Gold soft bg | `rgba(166,148,112,0.10)` | `rgba(196,169,98,0.12)` | Less yellow |
| Border | `rgba(248,246,242,0.06)` | `rgba(240,237,230,0.08)` | Hairline |

### Light editorial theme (public marketing site)

Apply with `class="et-theme-light"` or `data-et-theme="light"`.

| Token | v2 value | v1 (current) | Change |
|-------|----------|--------------|--------|
| Background base | `#F3F1EC` | `#F5F4F0` | Warmer ivory |
| Background paper | `#FAF8F4` | `#FAF9F6` | Slightly warmer |
| Text primary | `#1A1917` | `#1A1A18` | Neutral warm black |
| Text secondary | `#5C5954` | `#5C5C56` | Warmer gray |
| **Gold accent** | `#8F7D5C` | `#9A8448` / `#C4A962` | Muted, not bright |
| Forest accent | *(deprecated)* | `#2A3D32` | Replaced by gold + charcoal |

---

## Typography scale

**Fonts (unchanged):** Newsreader (serif) + Inter (sans) — already loaded in `index.html`.

| Class | Size | Use |
|-------|------|-----|
| `.et-display-1` | clamp(3rem → 5.5rem) | Hero headlines |
| `.et-display-2` | clamp(2.375rem → 3.875rem) | Section heroes |
| `.et-h1` | clamp(1.875rem → 2.625rem) | Page titles |
| `.et-h2` | clamp(1.5rem → 2.0625rem) | Section titles |
| `.et-h3` | clamp(1.25rem → 1.5rem) | Card titles |
| `.et-h4` | 1.125rem | Subheads |
| `.et-body-lg` | 1.0625rem | Lead paragraphs |
| `.et-body` | 1rem | Default body |
| `.et-body-sm` | 0.875rem | Meta, captions |
| `.et-eyebrow` | 0.6875rem uppercase | Section labels (with optional gold rule) |
| `.et-label` | 0.75rem uppercase | Form labels |
| `.et-caption` | 0.6875rem | Timestamps, counts |
| `.et-metric` | clamp(2rem → 2.75rem) serif | Stats (admin dashboard) |

**Hierarchy rule:** Serif for display & headings. Sans for UI, body, labels. Never bold headlines — use weight 300–400.

---

## Spacing system

4px base grid. Key tokens:

| Token | Value | Use |
|-------|-------|-----|
| `--et-space-4` | 1rem | Tight gaps |
| `--et-space-6` | 1.5rem | Default card padding |
| `--et-space-8` | 2rem | Spacious card padding |
| `--et-space-10` | 2.5rem | Section internal gaps |
| `--et-space-16` | 4rem | Large breaks |
| `--et-page-x` | clamp(1.5rem → 3.5rem) | Page horizontal padding |
| `--et-section-y` | clamp(5.5rem → 9rem) | **+15–20% vs v1** |

Utilities: `.et-stack-{n}`, `.et-grid--2/3/4`, `.et-split`, `.et-container`.

---

## Component reference

### Buttons (`.et-btn`)

| Variant | Class | When to use |
|---------|-------|-------------|
| Primary | `.et-btn--primary` | Main CTA |
| Secondary | `.et-btn--secondary` | Alternate actions |
| Ghost | `.et-btn--ghost` | Text links with underline |
| Gold | `.et-btn--gold` | Premium accent (sparingly) |
| Hero | `.et-btn--hero-primary` | On photography |
| Sizes | `.et-btn--sm`, `.et-btn--lg` | Contextual |

### Inputs (`.et-field`, `.et-input`, `.et-textarea`, `.et-select`)

- Default: inset background, hairline border, gold focus ring
- Underline: `.et-input--underline` for editorial forms
- Error: `.et-field--error` on wrapper

### Cards (`.et-card`)

- Default padding: `1.5rem` → `.et-card--spacious` at `2rem` / `2.5rem` desktop
- Interactive: `.et-card--interactive` with subtle lift on hover
- List grid: `.et-card-grid` for directory-style layouts

### Badges (`.et-badge`)

- Default, `.et-badge--gold`, `.et-badge--success`, `.et-badge--error`, `.et-badge--verified`

### Navigation

- Top bar: `.et-nav`, `.et-nav__link`
- Portal tabs: `.et-tabs`, `.et-tab`, `.et-tab__badge`
- Sidebar: `.et-sidebar`, `.et-sidebar__item`

### Dropdowns (`.et-dropdown`, `.et-dropdown__menu`, `.et-dropdown__item`)

### Chips (`.et-chip`) — filters, Ask EliteTee example prompts

---

## States

| State | Classes |
|-------|---------|
| Loading spinner | `.et-loading`, `.et-loading__spinner` |
| Logo breathe | `.et-loading__mark` |
| Skeleton | `.et-skeleton`, `.et-skeleton--text/title/avatar/card` |
| Empty | `.et-empty`, `.et-empty__title`, `.et-empty__body` |
| Success | `.et-alert--success`, `.et-success-panel` |
| Error | `.et-alert--error`, `.et-field--error` |
| Toast | `.et-toast` |

---

## Shadows & borders

| Token | Character |
|-------|-----------|
| `--et-border-hairline` | 6% opacity — default dividers |
| `--et-border-subtle` | 10% — inputs, cards |
| `--et-border-accent` | Gold at 24% — active states |
| `--et-shadow-md` | Soft lift + inner highlight |
| `--et-shadow-gold` | 1px gold glow ring |

No heavy drop shadows. No colored box shadows.

---

## Motion

| Token | Value |
|-------|-------|
| `--et-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--et-duration-base` | 320ms |
| Hover lift | 2–3px translateY |
| Page enter | `.et-animate-fade-up` with stagger delays |
| Reduced motion | All animations disabled via `prefers-reduced-motion` |

---

## Responsive behavior

- **Mobile (≤600px):** Full-width buttons in groups, 16px input font (no iOS zoom), tighter page padding
- **Tablet (≥768px):** 2-column card grids
- **Desktop (≥896px):** Nav links visible, split layouts, spacious card padding
- **Touch targets:** Minimum 44px height on interactive elements

---

## Icons

No icon library installed. Conventions:

- Wrap inline SVG in `.et-icon` (+ size modifiers)
- Stroke weight: 1.5px, round caps
- Colors: inherit, `.et-icon--muted`, `.et-icon--accent`
- Icon buttons: `.et-icon-btn`
- Logo: `.et-logo-mark` (CSS mask, gold or ivory)

---

## Exactly what will change (migration plan)

### Phase 0 — Foundation ✅ (this PR)

| Action | Files |
|--------|-------|
| Create design system | `src/design-system/*` (8 files) |
| **No page changes** | — |
| **No import added** | `main.tsx` unchanged |

### Phase 1 — Token bridge (when approved)

| Action | Files affected |
|--------|----------------|
| Import v2 system | `src/main.tsx` → add `import "./design-system/index.css"` |
| Map legacy CSS vars to v2 | `src/index.css` `:root` block |
| Bridge portal vars | `src/inside-elitetee.css`, `src/member-portal.css` |

**Legacy → v2 token mapping (proposed):**

```css
/* Bridge in index.css :root — keeps old pages working during migration */
--bg: var(--et-bg-base);               /* after .et-theme-light on body */
--ink: var(--et-text-primary);
--ink-muted: var(--et-text-secondary);
--inside-gold: var(--et-accent);
--inside-bg: var(--et-bg-base);
--portal-body: var(--et-text-secondary);
```

### Phase 2 — Public site (page-by-page)

| Page / area | Current CSS | Migration approach |
|-------------|-------------|-------------------|
| Home / hero | `index.css` `.hero-*`, `.nav` | Replace with `.et-nav`, `.et-btn--hero`, `.et-display-1` |
| Editorial sections | `.section`, `.editorial-*` | `.et-section`, `.et-container`, typography classes |
| Membership form | `.request-*`, `.btn` | `.et-field`, `.et-input--underline`, `.et-btn--primary` |
| Footer | `.footer` | `.et-container`, `.et-caption` |
| About / Request | `.about-*`, `.request-page` | Typography + spacing tokens |
| Directory (public) | `.directory-*` | `.et-card-grid`, `.et-card`, `.et-select` |

**Estimated:** ~2,800 lines in `index.css` refactored incrementally.

### Phase 3 — Member portal

| Area | Current CSS | Migration approach |
|------|-------------|-------------------|
| Portal shell | `member-portal.css` `.portal-page`, `.portal-top` | `.et-theme-dark`, `.et-nav`, `.et-tabs` |
| Feed / compose | `.portal-feed-*`, `.feed-card-*` | `.et-card--interactive`, `.et-stack-*` |
| Discover / profiles | `.portal-discover-*`, `.member-card-*` | `.et-card-grid`, `.et-badge--verified` |
| Messages | `.portal-messages-*` | `.et-card--flat`, `.et-body-sm` |
| Courses | `.courses-*`, `.golf-course-*` | `.et-card`, `.et-metric` for ratings |
| Ask EliteTee | `member-portal-ask.css` | `.et-chip`, `.et-field`, `.et-empty` |
| Admin | `AdminMembers.tsx` styles inline + portal CSS | `.et-alert`, `.et-metric`, `.et-tabs` |
| Loaders / toasts | `.portal-loader`, toast provider | `.et-loading__mark`, `.et-toast` |

**Estimated:** ~9,000 lines in `member-portal.css` + `inside-elitetee.css` refactored incrementally.

### Phase 4 — Components (optional React layer)

Future: extract repeated patterns into React components wrapping v2 classes:

- `<EtButton variant="primary" />`
- `<EtCard />`
- `<EtField />`
- `<EtEmptyState />`

Not required for Phase 1–3 — CSS classes work with existing JSX.

---

## Class naming convention

| Prefix | Meaning |
|--------|---------|
| `et-` | All v2 design system classes |
| `et-theme-dark` / `et-theme-light` | Theme scope on `<body>` or page root |
| `et-btn--*` | Button variants (BEM modifier) |
| `et-card--*` | Card variants |

**Coexistence:** v1 classes (`.portal-tab`, `.btn`, `.nav`) remain until each page migrates. No breaking renames until bridge layer is in place.

---

## Activation checklist (do not run until approved)

- [ ] Review this document + token values
- [ ] Approve color palette (warm charcoal + muted gold)
- [ ] Add `import "./design-system/index.css"` to `main.tsx`
- [ ] Add `et-theme-light` to public routes, `et-theme-dark` to portal routes
- [ ] Migrate one page as pilot (recommend: Ask EliteTee — smallest surface)
- [ ] Roll out remaining portal tabs
- [ ] Roll out public marketing pages
- [ ] Remove deprecated v1 tokens after full migration

---

## Quick visual reference

### Dark portal page shell (future)

```html
<body class="et-theme-dark">
  <div class="et-nav">...</div>
  <div class="et-tabs">...</div>
  <main class="et-container et-section">
    <p class="et-eyebrow et-eyebrow--line">Ask EliteTee</p>
    <h1 class="et-h1">Who should you meet?</h1>
    <div class="et-card et-card--spacious">...</div>
  </main>
</body>
```

### Light public section (future)

```html
<body class="et-theme-light">
  <section class="et-section et-section--lined">
    <div class="et-container">
      <p class="et-eyebrow">Membership</p>
      <h2 class="et-h2">Built for serious golfers.</h2>
      <p class="et-body-lg">...</p>
      <button class="et-btn et-btn--primary">Request Introduction</button>
    </div>
  </section>
</body>
```

---

## Summary

The v2 design system is **complete as a standalone foundation** — tokens, typography, spacing, every component category, states, motion, icons, and responsive rules.

**Nothing in the live app has changed yet.** When you're ready, we migrate page-by-page using the phase plan above, starting with a token bridge import and one pilot surface.
