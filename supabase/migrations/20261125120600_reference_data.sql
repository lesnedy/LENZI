-- LENZI 0007 — production reference data (no fares, no demo accounts)
-- Fares are intentionally NOT seeded. The platform owner must research and
-- configure local prices through the admin dashboard before rides are enabled.

insert into public.service_types (id, code, name_sw, name_en, description_sw, description_en, seats, active, sort_order)
values
  (
    '00000000-0000-4000-8000-000000000101',
    'boda_boda', 'Boda Boda', 'Boda Boda',
    'Haraka kwa safari fupi na barabara nyembamba.',
    'Fast for short trips and narrow streets.', 1, true, 10
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'bajaji', 'Bajaji', 'Bajaji',
    'Nafasi ya kati kwa safari za mjini na mizigo midogo.',
    'The middle ground for town trips and small luggage.', 3, true, 20
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    'car', 'Magari', 'Cars',
    'Faraja zaidi kwa familia, mizigo na safari ndefu.',
    'More comfort for families, luggage and longer journeys.', 4, true, 30
  )
on conflict (code) do update
set name_sw = excluded.name_sw,
    name_en = excluded.name_en,
    description_sw = excluded.description_sw,
    description_en = excluded.description_en,
    seats = excluded.seats,
    sort_order = excluded.sort_order;

-- Approximate Chunya town centre for initial setup. The owner must verify and
-- adjust the service boundary before launch; this is not a routing polygon.
insert into public.operating_areas (
  id, name, district, region, country, center, radius_m, active
)
values (
  '00000000-0000-4000-8000-000000000201',
  'Chunya mjini',
  'Chunya',
  'Mbeya',
  'Tanzania',
  extensions.ST_SetSRID(extensions.ST_MakePoint(33.4167, -8.5333), 4326)::extensions.geography,
  20000,
  true
)
on conflict (id) do update
set name = excluded.name,
    district = excluded.district,
    region = excluded.region,
    center = excluded.center;

insert into public.platform_settings (key, value, description, is_public)
values
  ('matching.radius_km', '7'::jsonb, 'Initial driver discovery radius in kilometres.', false),
  ('matching.offer_limit', '5'::jsonb, 'Maximum number of drivers offered one ride at a time.', false),
  ('matching.offer_ttl_seconds', '45'::jsonb, 'Seconds before a ride offer expires.', false),
  ('pricing.road_factor', '1.35'::jsonb, 'Straight-line distance multiplier used until routing is configured.', false),
  ('pricing.average_speed_kmh', '28'::jsonb, 'Fallback average speed for duration estimates.', false),
  ('pricing.free_waiting_minutes', '3'::jsonb, 'Free waiting period after driver arrival.', false),
  ('payments.enabled_methods', '["cash"]'::jsonb, 'Payment methods exposed to clients. Mobile money remains disabled until provider integration is verified.', true),
  ('payments.mobile_money_configured', 'false'::jsonb, 'Must be true only after sandbox and live provider verification.', true),
  ('support.email', 'null'::jsonb, 'Owner-configured support email. Placeholder until set.', true),
  ('app.operating_status', '"pilot"', 'Current operating mode shown in admin tooling.', false)
on conflict (key) do nothing;

-- The owner should set these before launch:
--   update public.platform_settings set value = '"support@example.tz"'::jsonb where key = 'support.email';
