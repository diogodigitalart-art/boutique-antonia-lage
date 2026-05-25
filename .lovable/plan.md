# Plan: Four new features

This is a large scope (4 substantial features touching DB, admin, frontend, emails). Here's how I'll ship it.

## 1. Tailoring service — "Arranjos e Costura"

**DB**: Add `experience_tailoring_price` to `settings` table (default 15). Extend `reservations.experience_details` JSONB to hold `{ alteration_type, garment_description, garment_source }` for this experience.

**Frontend**:
- Add "Arranjos e Costura" as a third experience on `/experiencias` (alongside existing Boutique Privada / Personal Styling).
- Extend `ReservationModal` to collect alteration_type (radio), garment_description (text), garment_source (radio) when `itemName === "Arranjos e Costura"`.
- Enforce 5-day minimum advance in the slot picker for this experience.

**Admin**: `/admin/reservas` Experiências tab — show the extra fields when item is tailoring. Settings page: input for tailoring base price.

## 2. Google review request — 24h delayed email

**DB**: New `review_requests` table (`id, user_id, order_id, reservation_id, type, scheduled_for, sent_at, created_at`). Add `google_review_url` to settings.

**Triggers**:
- When admin sets order status → "Entregue" or reservation status → "Concluída" (new status to add to validator), insert a `review_requests` row with `scheduled_for = now() + 24h`.
- Add "Concluída" to `validate_reservation_status` allowed values.

**Send mechanism**: New server function `processReviewRequestQueue` that selects pending rows where `scheduled_for <= now() AND sent_at IS NULL`, sends via Resend connector, marks sent. Triggered on admin panel load (cheap; called from `/admin` root component as fire-and-forget).

**Email**: Warm PT copy with big "Deixar uma review no Google" CTA → `google_review_url` setting.

**Admin settings**: Add "Google Review URL" field in `/admin/configuracoes`.

## 3. Weekly editorial — "Esta semana na Boutique"

**DB**: New `editorial_posts` table (`id, title, quote, video_url, featured_product_ids text[], teaser_text, publish_date, is_published, created_at, updated_at`). RLS: public can read published; admin full CRUD.

**Frontend**:
- New `EditorialSection` component on homepage: latest published post with title, quote, embedded video (YouTube/Instagram parser), 2-4 product cards, teaser at bottom.
- New `/editorial` route: grid of all published posts newest first, each linking to `/editorial/$id` detail page.

**Admin**: New `/admin/editorial` route + sidebar link. CRUD form with title, quote, video URL, product multi-select (from existing products), teaser, publish date, publish toggle.

## 4. Out-of-stock waitlist

**DB**: New `waitlist` table (`id, product_id uuid, size text, email, user_id nullable, created_at, notified_at nullable`). RLS: anyone can insert their own; admin can read all; users can read their own.

**Product detail**: Replace 0-stock size button with greyed "Esgotado — Avisar-me". Click → modal with email (prefilled), confirm.

**Restock notification**: In product save server function, diff old vs new sizes. For each size that went from available=0 to available>0, fetch waitlist entries with `notified_at IS NULL`, send Resend email per entry, mark notified.

**Admin /admin/produtos**: query waitlist counts grouped by product, show small badge on rows with `count > 0`.

## Implementation order

1. **Migration 1**: tailoring price setting + reservation status enum extension + `review_requests` + `editorial_posts` + `waitlist` + `google_review_url` setting — single migration.
2. Tailoring (frontend + admin)
3. Editorial (DB-driven, admin + homepage + archive)
4. Waitlist (product page modal + restock hook in product save + admin badge)
5. Review request system (status hooks + queue processor + Resend email + settings)

## Technical notes

- All emails use existing Resend connector (`RESEND_API_KEY` already present, `from: Boutique Antónia Lage <onboarding@resend.dev>` unless a verified domain is set — I'll reuse whatever the existing email-sending code uses).
- The 24h delay "trigger on admin load" approach is documented as a limitation; works fine for low-volume boutique.
- All new admin routes follow existing `admin_.*.tsx` pattern.
- Video embed: YouTube URLs → `youtube.com/embed/{id}` iframe; Instagram → use their embed iframe pattern.

## Scope confirmation

This is roughly 15–20 new/edited files and 1 DB migration. Want me to proceed end-to-end, or tackle features one at a time so you can review between each?
