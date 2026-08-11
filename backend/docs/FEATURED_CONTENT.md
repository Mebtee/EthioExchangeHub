# Featured Content / Featured Advertisement

The homepage hero can show a single admin-controlled campaign ("featured
content"). This document explains how eligibility works and how to seed a
local test fixture.

## Behavior

- Public: `GET /api/v1/featured` returns the **single currently-eligible**
  campaign, or `data: null` when nothing qualifies. The frontend renders no
  card in that case.
- Public: `POST /api/v1/featured/:id/click` appends an anonymous click record
  (campaign id + destination type + timestamp; no IP, no personal data).
- Admin (requires `bearerAuth` + admin role):
  - `GET /api/v1/admin/featured` — every campaign with its aggregate click count
  - `POST /api/v1/admin/featured` — create
  - `GET /api/v1/admin/featured/:id` — get one
  - `PATCH /api/v1/admin/featured/:id` — update
  - `DELETE /api/v1/admin/featured/:id` — delete

## The eligibility rule

A campaign is eligible when **all** of these hold (enforced by
`FeaturedContentService.getActiveFeaturedContent`):

1. `is_active = true`
2. `start_at IS NULL OR start_at <= now()`
3. `end_at IS NULL OR end_at >= now()`

Eligible campaigns are ordered by `display_order` ascending, then
`created_at` descending; the first row wins. Scheduled campaigns are simply
rows with a future `start_at` — they become eligible automatically when their
window opens, with no scraper or cron involvement.

The `featured_content` table only stores data; every selection rule lives in
the service layer.

## Local test fixture

The table is never seeded with example advertisements. To exercise the card
locally, insert a fixture in the Supabase SQL editor (or via the admin API):

```sql
INSERT INTO public.featured_content (
  title, description, image_url, advertiser_name, badge_text, cta_text,
  destination_url, destination_type, image_alt, is_active, display_order,
  feature_1_icon, feature_1_title, feature_1_description
) VALUES (
  'Awash Bank — Back-to-School Offer',
  'Student account promotions for the new term.',
  'https://cdn.example.com/awash-school.jpg',
  'Awash Bank',
  'SPONSORED',
  'View Offer',
  '/offers/awash-school',
  'internal',
  'Awash Bank back-to-school promotion',
  true,
  0,
  'graduation-cap', 'Zero balance', 'No minimum balance required.'
);
```

To test scheduling, add a `start_at`/`end_at`:

```sql
-- Starts in 1 hour, ends in 2 days.
INSERT INTO public.featured_content (
  title, image_url, destination_url, destination_type,
  start_at, end_at, is_active, display_order
) VALUES (
  'Limited-time offer',
  'https://cdn.example.com/limited.jpg',
  'https://example.com/limited',
  'external',
  now() + interval '1 hour',
  now() + interval '2 days',
  true,
  0
);
```

## Notes

- Click counts aggregate in `featured_content_clicks` (append-only; no
  update/delete surface in the API).
- Deactivating every campaign (or setting an expired `end_at`) makes the
  homepage render without a card — a graceful empty state.
