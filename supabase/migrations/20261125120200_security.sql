-- LENZI 0003 — identity, authorization helpers, RLS and tamper protection

create or replace function private.is_platform_owner(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'platform_owner'
      and p.status = 'active'
  );
$$;

revoke all on function private.is_platform_owner(uuid) from public;
grant execute on function private.is_platform_owner(uuid) to anon, authenticated, service_role;

create or replace function private.is_approved_driver(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.driver_profiles dp
    join public.profiles p on p.id = dp.user_id
    where dp.user_id = p_user_id
      and dp.approval_status = 'approved'
      and p.status = 'active'
  );
$$;

revoke all on function private.is_approved_driver(uuid) from public;
grant execute on function private.is_approved_driver(uuid) to authenticated, service_role;

create or replace function private.is_ride_participant(
  p_ride_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.rides r
    where r.id = p_ride_id
      and (r.passenger_id = p_user_id or r.driver_id = p_user_id)
  );
$$;

revoke all on function private.is_ride_participant(uuid, uuid) from public;
grant execute on function private.is_ride_participant(uuid, uuid) to authenticated, service_role;

create or replace function private.ride_is_active(p_ride_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.rides r
    where r.id = p_ride_id
      and r.status in ('accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
  );
$$;

revoke all on function private.ride_is_active(uuid) from public;
grant execute on function private.ride_is_active(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Account provisioning. Metadata may request passenger/driver, never owner.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.user_role;
  v_name text;
  v_phone text;
begin
  v_role := case
    when new.raw_user_meta_data ->> 'role' = 'driver' then 'driver'::public.user_role
    else 'passenger'::public.user_role
  end;

  v_name := nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), '');
  if v_name is not null and char_length(v_name) < 2 then
    v_name := null;
  end if;

  v_phone := case when new.phone ~ '^\+255[67][0-9]{8}$' then new.phone else null end;

  insert into public.profiles (id, role, phone, email, full_name, preferred_language, avatar_url)
  values (
    new.id,
    v_role,
    v_phone,
    new.email,
    v_name,
    case when new.raw_user_meta_data ->> 'language' = 'en' then 'en' else 'sw' end,
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  if v_role = 'driver' then
    insert into public.driver_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Backfill accounts that existed before this migration. Role stays passenger/driver only.
insert into public.profiles (id, role, phone, email, full_name, preferred_language, avatar_url)
select
  u.id,
  case when u.raw_user_meta_data ->> 'role' = 'driver' then 'driver'::public.user_role else 'passenger'::public.user_role end,
  case when u.phone ~ '^\+255[67][0-9]{8}$' then u.phone else null end,
  u.email,
  nullif(left(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), 120), ''),
  case when u.raw_user_meta_data ->> 'language' = 'en' then 'en' else 'sw' end,
  nullif(u.raw_user_meta_data ->> 'avatar_url', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

insert into public.driver_profiles (user_id)
select p.id
from public.profiles p
where p.role = 'driver'
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Column-level escalation guards
-- ---------------------------------------------------------------------------
create or replace function private.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() = old.id and not private.is_platform_owner(auth.uid()) then
    new.role := old.role;
    new.status := old.status;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function private.protect_profile_fields();

create or replace function private.protect_driver_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() = old.user_id and not private.is_platform_owner(auth.uid()) then
    new.approval_status := old.approval_status;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
    new.rejection_reason := old.rejection_reason;
    new.suspended_reason := old.suspended_reason;
    new.rating := old.rating;
    new.total_trips := old.total_trips;
    new.total_offers := old.total_offers;
    new.accepted_offers := old.accepted_offers;

    if old.approval_status <> 'approved' then
      new.availability := 'offline';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_driver_fields on public.driver_profiles;
create trigger protect_driver_fields
  before update on public.driver_profiles
  for each row execute function private.protect_driver_fields();

create or replace function private.protect_vehicle_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() = new.driver_id and not private.is_platform_owner(auth.uid()) then
      new.verification_status := 'pending';
    end if;
    return new;
  end if;

  if auth.uid() = old.driver_id and not private.is_platform_owner(auth.uid()) then
    new.verification_status := old.verification_status;
    new.driver_id := old.driver_id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_vehicle_fields on public.vehicles;
create trigger protect_vehicle_fields
  before insert or update on public.vehicles
  for each row execute function private.protect_vehicle_fields();

create or replace function private.prevent_ride_tampering()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status in ('completed', 'cancelled') and coalesce(auth.role(), '') <> 'service_role' then
    if new.final_fare is distinct from old.final_fare
      or new.commission_amount is distinct from old.commission_amount
      or new.driver_earnings is distinct from old.driver_earnings
      or new.fare_breakdown is distinct from old.fare_breakdown
      or new.driver_id is distinct from old.driver_id
      or new.vehicle_id is distinct from old.vehicle_id
      or new.estimated_distance_km is distinct from old.estimated_distance_km
      or new.estimated_fare is distinct from old.estimated_fare
      or new.payment_method is distinct from old.payment_method
      or new.discount_amount is distinct from old.discount_amount
      or new.cancellation_fee is distinct from old.cancellation_fee
      or new.completed_at is distinct from old.completed_at
      or new.cancelled_at is distinct from old.cancelled_at
    then
      raise exception 'Completed or cancelled ride financial records are immutable'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_ride_tampering on public.rides;
create trigger prevent_ride_tampering
  before update on public.rides
  for each row execute function private.prevent_ride_tampering();

-- ---------------------------------------------------------------------------
-- Audit log for sensitive owner actions
-- ---------------------------------------------------------------------------
create or replace function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.user_role;
  v_action text := coalesce(nullif(tg_argv[0], ''), lower(tg_op));
  v_before jsonb;
  v_after jsonb;
  v_entity_id text;
begin
  select p.role into v_role from public.profiles p where p.id = v_actor;

  if tg_op in ('UPDATE', 'DELETE') then
    v_before := to_jsonb(old);
    v_entity_id := to_jsonb(old) ->> 'id';
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_after := to_jsonb(new);
    v_entity_id := to_jsonb(new) ->> 'id';
  end if;

  insert into public.admin_audit_logs (
    actor_id, actor_role, action, entity_type, entity_id, before_data, after_data
  )
  values (
    v_actor,
    v_role,
    v_action,
    tg_table_name,
    v_entity_id,
    v_before,
    v_after
  );
  return null;
end;
$$;

do $$
declare
  t text;
  a text;
begin
  for t, a in
    select * from (values
      ('profiles', 'profile.changed'),
      ('driver_profiles', 'driver.profile_changed'),
      ('vehicles', 'vehicle.changed'),
      ('driver_documents', 'driver.document_reviewed'),
      ('fare_rules', 'fare_rule.changed'),
      ('platform_settings', 'platform_setting.changed'),
      ('promotions', 'promotion.changed'),
      ('payouts', 'payout.changed')
    ) as v(t, a)
  loop
    execute format('drop trigger if exists audit_change on public.%I', t);
    execute format(
      'create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change(%L)',
      t, a
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_documents enable row level security;
alter table public.service_types enable row level security;
alter table public.operating_areas enable row level security;
alter table public.fare_rules enable row level security;
alter table public.platform_settings enable row level security;
alter table public.promotions enable row level security;
alter table public.rides enable row level security;
alter table public.ride_offers enable row level security;
alter table public.ride_events enable row level security;
alter table public.ride_messages enable row level security;
alter table public.driver_locations enable row level security;
alter table public.payments enable row level security;
alter table public.driver_earnings enable row level security;
alter table public.payouts enable row level security;
alter table public.ratings enable row level security;
alter table public.promotion_redemptions enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.device_tokens enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.saved_places enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Profiles
drop policy if exists profiles_select_own_or_owner on public.profiles;
create policy profiles_select_own_or_owner on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.is_platform_owner());

drop policy if exists profiles_update_own_or_owner on public.profiles;
create policy profiles_update_own_or_owner on public.profiles
  for update to authenticated
  using (id = auth.uid() or private.is_platform_owner())
  with check (id = auth.uid() or private.is_platform_owner());

-- Driver profiles
drop policy if exists driver_profiles_select_own_or_owner on public.driver_profiles;
create policy driver_profiles_select_own_or_owner on public.driver_profiles
  for select to authenticated
  using (user_id = auth.uid() or private.is_platform_owner());

drop policy if exists driver_profiles_update_own_or_owner on public.driver_profiles;
create policy driver_profiles_update_own_or_owner on public.driver_profiles
  for update to authenticated
  using (user_id = auth.uid() or private.is_platform_owner())
  with check (user_id = auth.uid() or private.is_platform_owner());

drop policy if exists driver_profiles_owner_insert on public.driver_profiles;
create policy driver_profiles_owner_insert on public.driver_profiles
  for insert to authenticated
  with check (private.is_platform_owner());

-- Vehicles
drop policy if exists vehicles_select_own_or_owner on public.vehicles;
create policy vehicles_select_own_or_owner on public.vehicles
  for select to authenticated
  using (driver_id = auth.uid() or private.is_platform_owner());

drop policy if exists vehicles_insert_own on public.vehicles;
create policy vehicles_insert_own on public.vehicles
  for insert to authenticated
  with check (
    (driver_id = auth.uid() and verification_status = 'pending')
    or private.is_platform_owner()
  );

drop policy if exists vehicles_update_own_or_owner on public.vehicles;
create policy vehicles_update_own_or_owner on public.vehicles
  for update to authenticated
  using (driver_id = auth.uid() or private.is_platform_owner())
  with check (driver_id = auth.uid() or private.is_platform_owner());

drop policy if exists vehicles_delete_own_pending on public.vehicles;
create policy vehicles_delete_own_pending on public.vehicles
  for delete to authenticated
  using (
    (driver_id = auth.uid() and verification_status = 'pending')
    or private.is_platform_owner()
  );

-- Driver documents
drop policy if exists driver_documents_select_own_or_owner on public.driver_documents;
create policy driver_documents_select_own_or_owner on public.driver_documents
  for select to authenticated
  using (driver_id = auth.uid() or private.is_platform_owner());

drop policy if exists driver_documents_insert_own on public.driver_documents;
create policy driver_documents_insert_own on public.driver_documents
  for insert to authenticated
  with check (
    (driver_id = auth.uid() and status = 'pending')
    or private.is_platform_owner()
  );

drop policy if exists driver_documents_update_owner on public.driver_documents;
create policy driver_documents_update_owner on public.driver_documents
  for update to authenticated
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

-- Public catalogue
drop policy if exists service_types_read on public.service_types;
create policy service_types_read on public.service_types
  for select to anon, authenticated
  using (active or private.is_platform_owner());

drop policy if exists service_types_owner_write on public.service_types;
create policy service_types_owner_write on public.service_types
  for all to authenticated
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

drop policy if exists operating_areas_read on public.operating_areas;
create policy operating_areas_read on public.operating_areas
  for select to anon, authenticated
  using (active or private.is_platform_owner());

drop policy if exists operating_areas_owner_write on public.operating_areas;
create policy operating_areas_owner_write on public.operating_areas
  for all to authenticated
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

-- Fare rules are never exposed to passengers or drivers. Quote via RPC.
drop policy if exists fare_rules_owner_all on public.fare_rules;
create policy fare_rules_owner_all on public.fare_rules
  for all to authenticated
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

-- Platform settings
drop policy if exists platform_settings_read on public.platform_settings;
create policy platform_settings_read on public.platform_settings
  for select to anon, authenticated
  using (is_public or private.is_platform_owner());

drop policy if exists platform_settings_owner_write on public.platform_settings;
create policy platform_settings_owner_write on public.platform_settings
  for all to authenticated
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

-- Promotions
drop policy if exists promotions_read_active on public.promotions;
create policy promotions_read_active on public.promotions
  for select to anon, authenticated
  using (
    private.is_platform_owner()
    or (
      active
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
      and (usage_limit is null or used_count < usage_limit)
    )
  );

drop policy if exists promotions_owner_write on public.promotions;
create policy promotions_owner_write on public.promotions
  for all to authenticated
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

-- Rides: reads only. All mutations go through validated functions.
drop policy if exists rides_select_participant on public.rides;
create policy rides_select_participant on public.rides
  for select to authenticated
  using (
    passenger_id = auth.uid()
    or driver_id = auth.uid()
    or private.is_platform_owner()
  );

drop policy if exists rides_owner_update on public.rides;
create policy rides_owner_update on public.rides
  for update to authenticated
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

-- Ride offers
drop policy if exists ride_offers_select_driver_or_owner on public.ride_offers;
create policy ride_offers_select_driver_or_owner on public.ride_offers
  for select to authenticated
  using (driver_id = auth.uid() or private.is_platform_owner());

-- Ride events
drop policy if exists ride_events_select_participant on public.ride_events;
create policy ride_events_select_participant on public.ride_events
  for select to authenticated
  using (private.is_ride_participant(ride_id) or private.is_platform_owner());

-- Ride messages
drop policy if exists ride_messages_select_participant on public.ride_messages;
create policy ride_messages_select_participant on public.ride_messages
  for select to authenticated
  using (private.is_ride_participant(ride_id) or private.is_platform_owner());

drop policy if exists ride_messages_insert_participant on public.ride_messages;
create policy ride_messages_insert_participant on public.ride_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and private.is_ride_participant(ride_id)
    and exists (
      select 1 from public.rides r
      where r.id = ride_id
        and r.status in ('accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
    )
  );

-- Driver locations: current position only, and only for an active assigned ride.
drop policy if exists driver_locations_select_authorized on public.driver_locations;
create policy driver_locations_select_authorized on public.driver_locations
  for select to authenticated
  using (
    driver_id = auth.uid()
    or private.is_platform_owner()
    or exists (
      select 1 from public.rides r
      where r.driver_id = driver_locations.driver_id
        and r.passenger_id = auth.uid()
        and r.status in ('accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
    )
  );

drop policy if exists driver_locations_write_own on public.driver_locations;
create policy driver_locations_write_own on public.driver_locations
  for insert to authenticated
  with check (driver_id = auth.uid() and private.is_approved_driver(auth.uid()));

drop policy if exists driver_locations_update_own on public.driver_locations;
create policy driver_locations_update_own on public.driver_locations
  for update to authenticated
  using (driver_id = auth.uid() and private.is_approved_driver(auth.uid()))
  with check (driver_id = auth.uid() and private.is_approved_driver(auth.uid()));

-- Payments
drop policy if exists payments_select_authorized on public.payments;
create policy payments_select_authorized on public.payments
  for select to authenticated
  using (
    payer_id = auth.uid()
    or private.is_platform_owner()
    or exists (
      select 1 from public.rides r
      where r.id = payments.ride_id and r.driver_id = auth.uid()
    )
  );

-- Earnings
drop policy if exists driver_earnings_select_own_or_owner on public.driver_earnings;
create policy driver_earnings_select_own_or_owner on public.driver_earnings
  for select to authenticated
  using (driver_id = auth.uid() or private.is_platform_owner());

-- Payouts
drop policy if exists payouts_select_own_or_owner on public.payouts;
create policy payouts_select_own_or_owner on public.payouts
  for select to authenticated
  using (driver_id = auth.uid() or private.is_platform_owner());

drop policy if exists payouts_owner_write on public.payouts;
create policy payouts_owner_write on public.payouts
  for all to authenticated
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

-- Ratings
drop policy if exists ratings_select_involved on public.ratings;
create policy ratings_select_involved on public.ratings
  for select to authenticated
  using (
    passenger_id = auth.uid()
    or driver_id = auth.uid()
    or private.is_platform_owner()
  );

-- Redemptions
drop policy if exists promotion_redemptions_select_own on public.promotion_redemptions;
create policy promotion_redemptions_select_own on public.promotion_redemptions
  for select to authenticated
  using (user_id = auth.uid() or private.is_platform_owner());

-- Notifications
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or private.is_platform_owner());

drop policy if exists notifications_update_read_own on public.notifications;
create policy notifications_update_read_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notification_deliveries_owner on public.notification_deliveries;
create policy notification_deliveries_owner on public.notification_deliveries
  for all to authenticated
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

-- Device tokens
drop policy if exists device_tokens_own on public.device_tokens;
create policy device_tokens_own on public.device_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Support
drop policy if exists support_tickets_select_own_or_owner on public.support_tickets;
create policy support_tickets_select_own_or_owner on public.support_tickets
  for select to authenticated
  using (user_id = auth.uid() or private.is_platform_owner());

drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own on public.support_tickets
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and assigned_to is null);

drop policy if exists support_tickets_owner_update on public.support_tickets;
create policy support_tickets_owner_update on public.support_tickets
  for update to authenticated
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages
  for select to authenticated
  using (
    private.is_platform_owner()
    or exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id and t.user_id = auth.uid()
        and (not support_messages.is_internal)
    )
  );

drop policy if exists support_messages_insert on public.support_messages;
create policy support_messages_insert on public.support_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      private.is_platform_owner()
      or (
        not is_internal
        and exists (
          select 1 from public.support_tickets t
          where t.id = support_messages.ticket_id and t.user_id = auth.uid()
        )
      )
    )
  );

-- Saved places
drop policy if exists saved_places_own on public.saved_places;
create policy saved_places_own on public.saved_places
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Audit logs
drop policy if exists admin_audit_logs_owner_read on public.admin_audit_logs;
create policy admin_audit_logs_owner_read on public.admin_audit_logs
  for select to authenticated
  using (private.is_platform_owner());

-- Base grants. RLS remains the access-control layer.
grant usage on schema public to anon, authenticated;
grant select on public.service_types, public.operating_areas, public.promotions, public.platform_settings to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
