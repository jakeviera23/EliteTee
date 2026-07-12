# EliteTee Product Roadmap

**Document type:** Internal product strategy  
**Audience:** Founders, product, engineering, design  
**Horizon:** Multi-year  
**Status:** Living document

---

## Vision

EliteTee is building the world's highest-quality golf network — a private, trusted environment where serious golfers discover exceptional courses, form meaningful connections, travel with intention, and share authentic experiences from the game.

The long-term product is not a social feed with a course list attached. It is an **intelligent golf network** where:

- The **course library** is authoritative, global, and maintained by EliteTee.
- **Members** are verified participants with real identities, clubs, interests, and travel intent.
- **Experiences** — rounds, ratings, reviews, and photos — are the primary member contribution and the atomic unit of value across the product.

Over time, EliteTee should help a member answer questions that matter in golf and in life around golf:

- Where should I play, and why?
- Who in this network has been there, and what did they think?
- Who should I meet — locally, at my club, or where I am traveling?
- How do I get a thoughtful introduction without cold outreach?

The network earns trust through quality of people, quality of data, and quality of design — not through volume, virality, or invented content. AI supports discovery and organization; it does not replace member authenticity or EliteTee's responsibility for canonical course knowledge.

Success looks like a member opening EliteTee before a trip, after a round, or when seeking a connection — and finding information that is accurate, personal, and actionable.

---

## Product Philosophy

### Courses are permanent

Golf courses are durable entities. Pebble Beach, Royal County Down, and a member's home club exist independent of any single member's activity. EliteTee owns and curates the **global course library** as platform infrastructure — ingested from trusted sources, deduplicated, enriched under license, and updated on a schedule.

Members do not create courses. They select from the library or request additions through a controlled process. This prevents duplicate records, inconsistent naming, unlicensed metadata, and the gradual erosion of search and recommendation quality.

### Members are permanent

Members are long-lived identities in the network. Profiles, clubs, regions, interests, and connection history accumulate over years. EliteTee optimizes for **relationship depth** — introductions, messages, repeat interactions — not follower counts or ephemeral engagement.

### Experiences create the value

An **Experience** is a member's documented round at a course: rating, review, photos, played date, would-play-again, and optional notes. It belongs to **both** the member and the course.

One Experience powers:

- **Feed** — social proof and discovery of people and places
- **Member Profile** — personal golf history and credibility
- **Course Detail** — aggregated intelligence and editorial proof
- **Ask EliteTee** — retrieval and reasoning over real activity
- **Statistics** — ratings, recommend %, activity timelines
- **Recommendations** — deterministic and, later, intelligent matching
- **Future travel planning** — where members have been and intend to go

Experiences are member-authored. Courses are platform-authored. The separation keeps accountability clear and scales cleanly.

### AI organizes; it does not invent

EliteTee AI assists with search, summarization, matching, moderation support, and admin efficiency. It operates on **stored member data, course library data, and explicit member input**. It does not fabricate course facts, reviews, relationships, or introductions.

When data is insufficient, the product says so — and routes the member to human pathways (requests, introductions, messages) rather than filling gaps with generated content.

### Why this architecture scales

| Approach | Limit |
|----------|-------|
| Member-created courses | Duplicates, bad geodata, licensing risk, broken search at 10k+ courses |
| Free-text course names in posts | Orphan content, no aggregation, no Course Detail integrity |
| AI-generated course facts | Legal exposure, loss of trust, unmaintainable corrections |
| **Canonical library + Experiences** | Clean FK graph, reliable aggregates, one ingestion pipeline, clear moderation boundaries |

Designing for **tens of thousands of courses** and **thousands of members** requires stable identifiers, server-side intelligence, and a single source of truth — not organic schema growth from user submissions.

---

## Core Objects

### Courses

**Owner:** EliteTee (platform)

**Definition:** A canonical record in the global golf course library — identity, location, classification, media, and lifecycle metadata.

**Responsibilities:**

- Provide stable `id` and `slug` for URLs and foreign keys
- Supply structured location (city, region, country, coordinates)
- Hold licensed imagery and attribution
- Surface aggregated Experience statistics (avg rating, recommend %, member count, latest activity)
- Support search, browse, related-course logic, and future map layers

**Relationships:**

- One Course → many Experiences
- One Course → many Experience photos (via Experiences)
- One Course → zero or many aliases (deduplication / legacy slug redirects)
- Courses do not belong to members

**Future expansion:**

- Architect and design metadata (when licensed or verified)
- Multi-course facilities (e.g., resort with multiple tracks)
- Seasonal access notes, booking links (partner integrations)
- Editorial tiers: flagship, member-played, requested-not-yet-ingested
- Course request queue fulfillment from member submissions (admin-approved only)

**Explicit non-goals:**

- Member INSERT/UPDATE on course rows
- Scraping club websites for facts or images
- User-generated course records

---

### Members

**Owner:** The member (identity); EliteTee (platform access and verification)

**Definition:** An approved portal participant with profile, club affiliation, location, interests, travel intent, and network permissions.

**Responsibilities:**

- Represent identity: name, club, location, interests, current request
- Control privacy-appropriate visibility within the private network
- Participate in Messages and Introductions under platform rules
- Contribute Experiences; never canonical course records

**Relationships:**

- One Member → many Experiences
- One Member → many Feed posts (often linked to Experiences)
- One Member ↔ many Members (messages, introductions, future follows)
- Members link to Courses only through Experiences

**Future expansion:**

- Verification tiers (founding, verified, partner)
- Club affiliation depth (primary + additional clubs)
- Travel calendar / planned trips (with consent)
- Reputation signals derived from Experience quality and connection behavior — not gamified points
- Professional accounts (Phase 6)

---

### Experiences

**Owner:** The member who played the round

**Also belongs to:** The Course (as aggregated history and social proof)

**Definition:** A structured record of a member's round at a specific course — the only member-created entity that attaches to the course library.

**Core fields (current and near-term):**

- `golf_course_id` (required) — FK to canonical Course
- `played_on`, `course_rating`, `note`, `would_play_again`
- Photos (member-uploaded, moderated)
- Optional denormalized snapshot of course name/location at time of play (historical integrity)

**Responsibilities:**

- Power Feed posts (`round-review` and linked content)
- Populate Course Detail reviews and photo galleries
- Populate Member Profile activity history
- Feed Ask EliteTee retrieval (`ai_members_by_course`, round summaries)
- Drive directory statistics and featured sections

**Relationships:**

- Many Experiences → one Course
- Many Experiences → one Member
- Zero or one Feed post per Experience (linked via `member_course_round_id` today)
- One Experience → many photos

**Future expansion:**

- Playing partners (with consent)
- Round type (casual, tournament, travel)
- Weather / conditions (member-reported only)
- Collections ("Scotland 2027 trip" grouping)
- Experience editing audit trail (already begun)
- Explicit separation from free-text Feed posts — all course-attributed social content should resolve to an Experience

**Rule:** No Experience without a Course. Unmatched course desire flows to **course request**, not course creation.

---

# Phase 1 — Founding Member Launch

**Goal:** Charge founding members with confidence. The portal feels complete, premium, secure, and coherent — even with a small library and early community.

**Exit criteria:** End-to-end member journey works on desktop and mobile; admin can operate the network; no critical security or data-integrity gaps; design system applied consistently across primary surfaces.

### Portal foundation

- Warm-light design system (ivory base, forest green actions, gold accents, editorial typography)
- Responsive shell: desktop tabs, mobile bottom nav, accessible focus and touch targets
- Founding member positioning and onboarding clarity
- Privacy copy and portal access gating (`portal_access_enabled`)

### Feed

- Composer for member posts; round-review path linked to Experiences where possible
- Feed cards: hero media, ratings, course links, member identity
- Secure owner-only post editing (round-linked and caption edits)
- Pagination and loading states
- Empty states for early community

### Discover

- Member exploration: search, filters, featured sections, geographic browse
- Deterministic match reasons (shared region, interests, travel)
- Introduction request and profile navigation from cards
- Message entry where permitted

### Courses

- Directory: search, filters, geographic grouping, featured sections
- Course cards with real aggregates (members played, ratings, recommend %)
- Pagination / load more
- Links to Course Detail

### Course Detail

- Editorial course profile: hero, stats, reviews, members who played, gallery, related courses
- Ask EliteTee entry with prefilled course questions
- Add Experience (Add Course Played) from course context
- Graceful empty states; no invented facts

### Profiles

- Member public profile route with return navigation context
- Own profile: dossier, experiences, feed posts, edit flows
- Club avatar, verification/founding badges where applicable

### Messages

- Inbox, conversations, unread counts
- New conversation from Discover and course contexts
- Private, member-to-member only

### Introductions

- Request, pending, accepted, declined flows
- Integration with Discover and Ask EliteTee suggestions (manual request — no auto-intro)

### Ask EliteTee

- Private concierge tab: member discovery, course discovery, introduction *suggestions*
- Server-side edge function; retrieval from directory + Experiences only
- Feedback loop for response quality
- Admin operations visibility (AI settings, usage)

### Onboarding

- Invite signup path
- Profile completion prompts
- Founding welcome and early-community copy
- Clear explanation of what members can contribute (Experiences, not Courses)

### Admin

- Member approval and portal access
- AI operations dashboard (Phase 1 baseline)
- Foundation for course library admin (Phase 3)

### Moderation

- Experience photo moderation fields
- Feed post editing constraints (owner-only)
- Course imagery attribution on library rows
- Path to AI-assisted moderation queues (Phase 2)

### Security

- RLS on all member tables; courses read-only from client
- No service role or provider keys in frontend
- Protected routes; admin route separation
- Introduction and messaging permission boundaries

### Editing

- Feed post edit (owner-only, RPC-enforced)
- Course round / Experience field edits aligned with feed sync
- Profile self-update

### Responsive design

- Single-column mobile layouts for Feed, Discover, Courses, Course Detail
- Filter drawers on mobile
- 44px+ touch targets; no horizontal overflow on primary flows

### Phase 1 explicit deferrals

- Global course ingestion at scale (Phase 3)
- Map mode (Phase 4)
- Member-created courses (retire in Phase 3 migration)
- Premium tiers and partnerships (Phase 6)

---

# Phase 2 — Intelligence

**Goal:** Make the network feel intelligently helpful without compromising trust. AI **retrieves, ranks, summarizes, and suggests** — always grounded in EliteTee data.

Architecture principle: **deterministic logic first; AI second.** Rules handle filtering, eligibility, and safety; models handle language, ranking nuance, and summarization.

### Intelligent member recommendations

- Extend Discover "Suggested for You" with richer deterministic signals (shared courses via Experience overlap, travel overlap, club proximity)
- Optional AI reranking of shortlists with explainable reason chips
- Never recommend members the viewer cannot message or request introduction to

### Course recommendations

- Related courses (deterministic: geography, type, access, rating proximity)
- "Members like you also played" from Experience overlap patterns
- Ask EliteTee course discovery intents

### AI concierge (Ask EliteTee evolution)

- Multi-turn context within session (not fabricated memory)
- Course-scoped questions: who played, what members say, who to contact, similar courses
- Travel-aware prompts when member profile includes `traveling_to`
- Insufficient-data responses with actionable next steps

### Travel suggestions

- Surface members traveling to regions the viewer cares about
- Surface courses with strong Experience signals in destinations viewer names in profile
- No external flight/hotel booking in Phase 2 — suggestions only

### Review summaries

- Course Detail: AI summary of member reviews **only from stored review text**
- Clearly labeled; updates when new Experiences arrive
- Admin toggle per course or globally

### Duplicate detection

- Admin-facing duplicate course candidates during ingestion
- Experience-spam or duplicate post detection (supporting moderation)

### Smarter search

- Trigram / full-text search on course library
- Member search improvements (synonyms, club aliases)
- Query understanding in Ask EliteTee (intent classification — already started)

### AI moderation

- Photo and text classification queues for admin review
- Flagging, not auto-removal, for ambiguous cases
- Audit log of AI moderation decisions

### Admin insights

- Dashboards: Ask EliteTee usage, failed queries, insufficient-data rates
- Member activity health, course coverage gaps (courses with zero Experiences in key regions)
- Course request queue volume and fulfillment time

**Phase 2 non-goals:** Autonomous introductions, generated reviews, external web browsing for live news/scores/weather unless explicitly licensed and scoped.

---

# Phase 3 — Global Course Library

**Goal:** EliteTee maintains a comprehensive, trustworthy worldwide course database. Members contribute Experiences only.

This phase implements the canonical library architecture described in the course architecture audit: ingestion pipelines, deduplication, licensing, and retirement of member course creation.

### Course ingestion

- Scheduled provider sync (delta + full)
- Staging tables before publish
- Import batch audit logs
- Admin publish workflow for new regions

### Trusted data sources

- Contracted golf data providers (primary)
- EliteTee editorial seed for flagship properties
- Admin manual entry for edge cases
- **Member course requests** → admin approval queue (never auto-create)

No recommendation to scrape club websites, Google Maps, or social media for course records or images.

### AI enrichment

- Offline enrichment jobs: description drafts, classification suggestions, alias candidates
- Admin approval required before publish
- `enrichment_version` for reproducibility
- Enrichment never overwrites locked editorial fields

### Deduplication

- `external_id` as primary key from provider
- Fuzzy name + location matching
- Alias table for alternate names
- Admin merge tool with Experience repointing
- Legacy member-submitted course consolidation

### Images

- Licensed provider images with attribution and license fields
- EliteTee CDN copy where contract permits
- Admin image manager
- Member Experience photos as **fallback** hero only (existing pattern)
- Branded placeholder when no licensed image

### Metadata

- Structured location, classification, holes, access type
- Optional architect/design fields when licensed
- Coordinates for future map phase
- Source provenance on every row

### Updates

- Provider delta sync on schedule
- `source_record_hash` to skip no-op writes
- Slug stability; redirects via aliases after merges
- Experience snapshots preserve historical course name at time of play

### Licensing

- Contract inventory per provider
- Per-image license and attribution required
- No redistribution of raw provider dumps
- Legal review before new source onboarding

### Quality control

- Coverage metrics by country/region
- Minimum data completeness thresholds before `published`
- Member-facing "request a course" with SLA targets
- Hidden/merged lifecycle states

### Member experience (product)

- Add Experience: search-only course picker; required `golf_course_id`
- Remove manual course creation and `find_or_create` member path
- Course Detail and directory show library-unified courses (no "member submitted" badge)
- Ask EliteTee: "not in library yet" + request flow

---

# Phase 4 — Maps

**Goal:** Spatial exploration of courses and members — a premium travel-discovery layer built on Phase 3 geodata and Experience density.

Conceptual only in planning; implementation follows library completeness in key markets.

### Interactive world map

- Pan/zoom canvas with course pins weighted by Experience activity
- Performance: clustering at low zoom, detail at high zoom
- Accessible list alternative for map content (no map-only exclusives)

### Country browsing

- Tap country → region list → course list
- Aligns with Courses directory geography model

### State and region browsing

- US states, UK counties, provinces, etc.
- Consistent with structured `region` on course records

### Course exploration

- Map pin → course preview card → Course Detail
- Filter: type, access, rating, members played

### Member exploration

- Opt-in location visibility only
- "Members in this region" with privacy controls
- No precise home address plotting

### Travel mode

- Member sets travel destination → map highlights courses with network Experiences
- Overlap with Discover "Traveling Soon"

### Future filters

- Access type, course type, rating thresholds, "members I know played here"
- Time-based: recently reviewed courses

### Future clustering

- Server-side cluster aggregates for map performance
- Heat layer from Experience density (anonymized aggregates)

### Future golf passport

- Personal map of courses played (from member's Experiences)
- Regions/countries covered
- Shareable summary (optional, member-controlled)
- Distinct from legacy localStorage bucket list — driven by Experience FK graph

---

# Phase 5 — Community

**Goal:** Deepen retention and relationship formation beyond 1:1 messages and introductions.

### Events

- Member-organized outings (informal)
- EliteTee-curated virtual events (e.g., major watch, architecture discussion)
- RSVP with clear privacy defaults

### Group trips

- Shared trip objects linking destinations, dates, members, candidate courses
- Experiences tagged to trip context
- No payment processing in early versions

### Saved collections

- Member-curated lists of courses (uses canonical course IDs)
- Replaces legacy demo bucket-list localStorage pattern
- Optional sharing within network

### Bucket lists

- "Want to play" separate from "played" (Experiences)
- Progress toward goals; passport integration

### Favorite regions

- Member preference for discovery and Ask EliteTee personalization
- Deterministic first; AI-assisted second

### Club pages

- Aggregate public-safe profile of members listing a primary club
- Club logo, member count, recent Experiences at club's home course(s)
- Partner-controlled club pages in Phase 6

### Follow members

- Lightweight asymmetric follow for Feed prioritization
- **Connections** (mutual intro/message history) remain higher trust tier
- No public follower counts as primary metric

### Activity

- Network activity digest (new Experiences from relevant members, new members in region)
- Respect notification preferences

### Notifications

- In-app and email for messages, introductions, mentions, trip activity
- No engagement-bait patterns

---

# Phase 6 — Business

**Goal:** Sustainable revenue aligned with member value — not advertising-driven attention economics.

Advertising is **not** the primary business model. Revenue should reinforce trust and quality.

### Founding memberships

- Early cohort pricing, locked benefits
- Founding member number as identity (already in product)
- Transition path to standard membership

### Professional accounts

- Coaches, architects, photographers, travel advisors
- Verified professional badge, enhanced profile, analytics on their public Experiences
- Strict separation from fake "influencer" dynamics

### Club partnerships

- Official club pages, member verification via club roster
- Sponsored placement in **directory editorial zones** — clearly labeled, limited inventory
- No pay-to-rank in Ask EliteTee results

### Travel partners

- Preferred agencies, tee-time services, accommodation (referral or rev-share)
- Deep links only with disclosure; Experiences remain member-authored

### Premium concierge

- Human + AI tier for trip planning, introduction facilitation
- Higher-touch introduction routing for premium members
- Still no invented facts; premium is service intensity, not fiction

### Analytics

- Aggregate course and member activity dashboards for partners (anonymized)
- Member-facing personal stats (rounds, countries, ratings history)

### API opportunities

- Read-only course library API for licensed partners
- Experience aggregates with strict privacy and rate limits
- No API that exposes private messages or PII without consent

### Enterprise opportunities

- Private network instances for invitational clubs or corporate golf communities
- Shared core library; isolated member graphs
- Enterprise admin and SSO

---

# Technical Principles

These rules apply across all phases. They exist to preserve trust, security, and velocity as the team and codebase grow.

### Single source of truth

- **Courses:** `golf_courses` (platform-owned)
- **Experiences:** `member_course_rounds` (member-owned; rename to `member_experiences` when migrated)
- **Aggregates:** computed from Experiences via RPC, not duplicated client-side
- One Experience should power Feed, Profile, and Course Detail — avoid parallel free-text course references

### Server-side AI

- Ask EliteTee and enrichment run in Edge Functions / backend
- Models never receive service role keys; clients invoke vetted endpoints only
- Prompt and retrieval versions logged for debugging

### No client API keys

- Provider keys, service role, and enrichment secrets stay server-side
- Frontend uses anon key + RLS only

### RLS first

- Every member table has explicit policies
- Courses: SELECT for portal members; writes via service role / admin only
- Test policies against realistic auth scenarios

### Deterministic logic before AI

- Filters, eligibility, related courses, Discover match reasons: rule-based first
- AI layers on top for language, ranking, summarization — not replacement

### Shared components

- Design system scoped CSS (`.et-feed`, `.et-courses`, `.et-discover`, `.et-course-detail`)
- Reuse `CourseImage`, member identity, rating formatters, directory cards
- Dark island for Ask EliteTee intentional; elsewhere warm-light portal theme

### Design system

- Editorial serif headings, forest green primary actions, gold verification accents, slate metadata
- Soft-white cards, subtle borders, no dark dashboard cards on portal surfaces
- Premium empty states — no dash rows or generic error boxes

### Testing

- Unit tests for deterministic libs (filters, related courses, ratings, directory grouping)
- RPC contract tests where feasible
- Build must pass before merge to main

### Performance

- Paginate directory and feed; lazy-load non-hero images
- Index course search for 10k+ rows (trigram / tsvector)
- Avoid refetching full member directory on every Discover filter keystroke (debounce + memoize)

### Accessibility

- Semantic headings, keyboard-accessible modals/drawers/galleries
- Visible focus, readable contrast, reduced-motion respect
- Meaningful button labels ("Request Introduction", not "Go")

### Security

- Owner-only edit RPCs enforced server-side
- No email or private application data in Discover/Course Detail
- Introduction and messaging permission checks on every action
- Audit admin actions on course merges and member access changes

---

# Guiding Principles

1. **Members create Experiences, not Courses.**

2. **EliteTee owns the course library; members own their rounds.**

3. **AI assists, never invents member facts or course facts.**

4. **Trust is more valuable than growth.**

5. **Quality beats quantity** — in members, courses, and posts.

6. **Connections beat followers.**

7. **Design for ten thousand courses, not fifty.**

8. **Build for years, not weeks.**

9. **Every feature should make relationships stronger.**

10. **Every screen should feel premium.**

11. **One Experience powers every surface** — Feed, Profile, Course Detail, Ask EliteTee.

12. **If data is missing, show an honest empty state** — not placeholders or fabrication.

13. **Deterministic before intelligent** — rules earn the right to model assistance.

14. **Server-side truth; client-side presentation.**

15. **Licensed data only** — no scraping, no stolen images, no guessed architect lists.

16. **Privacy defaults protect members** — especially location and travel.

17. **Introductions are deliberate** — never auto-created by AI.

18. **The Feed is curated community, not an algorithmic attention trap.**

19. **Admin tooling is product** — ingestion, moderation, and merge tools ship with features they enable.

20. **Charge members when the portal earns it** — Phase 1 completeness before Phase 6 monetization expansion.

---

## Document maintenance

- Update this roadmap when phases complete or priorities shift.
- Link implementation specs (migrations, architecture audits) from phase sections as they are written.
- Review quarterly against actual shipped work and member feedback.

**Related internal docs (when present):**

- Course library architecture & migration plan (canonical library audit)
- `docs/golf-course-import.md` (ingestion runbook)

---

*EliteTee — the world's highest-quality golf network.*
