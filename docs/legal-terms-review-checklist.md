# EliteTee Terms — internal legal review checklist

Internal only. Not published on `/terms`. Public draft banners and `[OWNER/LEGAL APPROVAL]` markers were removed from the member-facing Terms page for App Store Guideline 1.2 readiness. The published document version remains `2026-11-19` until a material legal change requires a bump and re-acceptance.

## Outstanding owner / counsel items

1. **Geographic restrictions** — Confirm whether membership or Services are limited by country/region beyond the age and curated-application rules already stated.
2. **Paid membership fees / refunds** — When (if) paid plans launch, add fee, billing, and refund/credit language. Current invitation/application model has no published paid plan.
3. **Marketing use of Member Content** — Confirm whether any promotional or marketing use beyond hosting/operating/moderating the Services is intended; current license is limited to operating, securing, moderating, and improving the Services (plus law/Privacy Policy).
4. **Disclaimer and liability caps** — Attorney review of §8 disclaimer and US $100 / 12-month fee caps for Florida consumer / LLC context.
5. **Venue specificity** — Confirm preferred Florida county/city for exclusive venue (current text: state or federal courts located in Florida).
6. **Arbitration / class-action waiver** — Decide whether to add arbitration and/or a class-action waiver.
7. **Business mailing address** — Publish official Florida business / registered-agent mailing address when approved. Do not publish a personal residential address without explicit approval. Public contact remains `membership@elitetee.club` until then.

## Change control

- Material edits to Terms text require bumping `ELITETEE_TERMS_VERSION` in `src/lib/termsOfUse.ts` (and the mobile mirror) and a new required acceptance flow.
- Do not reset existing acceptances without an intentional version bump and product plan.
