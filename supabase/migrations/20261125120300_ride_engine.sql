-- LENZI 0004 — fare engine, atomic driver matching, ride state machine and payments

create or replace function private.setting_numeric(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select (value #>> '{}')::numeric from public.platform_settings where key = p_key),
    p_default
  );
$$;

revoke all on function private.setting_numeric(text, numeric) from public;
grant execute on function private.setting_numeric(text, numeric) to authenticated, service_role;

create or replace function private.notify_user(
  p_user_id uuid,
  p_type text,
  p_title_sw text,
  p_title_en text,
  p_body_sw text,
  p_body_en text,
  p_data jsonb default '{}'::jsonb,
  p_push boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (user_id, type, title_sw, title_en, body_sw, body_en, data, channel)
  values (p_user_id, p_type, p_title_sw, p_title_en, p_body_sw, p_body_en, p_data, 'in_app')
  returning id into v_notification_id;

  if p_push then
    insert into public.notification_deliveries (notification_id, channel)
    values (v_notification_id, 'push');
  end if;
end;
$$;

revoke all on function private.notify_user(uuid, text, text, text, text, text, jsonb, boolean) from public;
grant execute on function private.notify_user(uuid, text, text, text, text, text, jsonb, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Server-authoritative quote
-- ---------------------------------------------------------------------------
create or replace function public.quote_ride(
  p_service_type_id uuid,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_pickup extensions.geography;
  v_dropoff extensions.geography;
  v_area public.operating_areas%rowtype;
  v_rule public.fare_rules%rowtype;
  v_service public.service_types%rowtype;
  v_road_factor numeric := private.setting_numeric('pricing.road_factor', 1.35);
  v_avg_speed numeric := private.setting_numeric('pricing.average_speed_kmh', 28);
  v_distance numeric;
  v_duration integer;
  v_base numeric;
  v_distance_fare numeric;
  v_time_fare numeric;
  v_subtotal numeric;
  v_before_discount numeric;
  v_total numeric;
  v_commission numeric;
  v_minimum_applied boolean;
begin
  if p_pickup_lat is null or p_pickup_lng is null or p_dropoff_lat is null or p_dropoff_lng is null then
    raise exception 'Pickup and dropoff coordinates are required' using errcode = '22023';
  end if;

  if p_pickup_lat not between -90 and 90 or p_dropoff_lat not between -90 and 90
    or p_pickup_lng not between -180 and 180 or p_dropoff_lng not between -180 and 180 then
    raise exception 'Invalid coordinates' using errcode = '22023';
  end if;

  select * into v_service
  from public.service_types
  where id = p_service_type_id and active;

  if not found then
    raise exception 'Service type is not available' using errcode = 'P0001';
  end if;

  v_pickup := extensions.ST_SetSRID(extensions.ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::extensions.geography;
  v_dropoff := extensions.ST_SetSRID(extensions.ST_MakePoint(p_dropoff_lng, p_dropoff_lat), 4326)::extensions.geography;

  select * into v_area
  from public.operating_areas oa
  where oa.active
    and (
      (oa.boundary is not null and extensions.ST_Contains(oa.boundary, v_pickup))
      or extensions.ST_DWithin(oa.center, v_pickup, oa.radius_m)
    )
  order by extensions.ST_Distance(oa.center, v_pickup)
  limit 1;

  if not found then
    raise exception 'LENZI is not yet available at this pickup location' using errcode = 'P0001';
  end if;

  select * into v_rule
  from public.fare_rules fr
  where fr.service_type_id = p_service_type_id
    and fr.operating_area_id = v_area.id
    and fr.active
    and fr.effective_from <= now()
    and (fr.effective_to is null or fr.effective_to > now())
  order by fr.version desc
  limit 1;

  if not found then
    raise exception 'Fare is not configured for this service in %', v_area.name using errcode = 'P0001';
  end if;

  v_distance := round((extensions.ST_Distance(v_pickup, v_dropoff) / 1000.0) * v_road_factor, 2);
  v_duration := greatest(1, ceil((v_distance / greatest(v_avg_speed, 5)) * 60)::integer);

  if v_distance > 500 then
    raise exception 'Journey distance is outside the supported range' using errcode = '22023';
  end if;

  v_base := round(v_rule.base_fare);
  v_distance_fare := round(v_distance * v_rule.per_km);
  v_time_fare := round(v_duration * v_rule.per_minute);
  v_subtotal := v_base + v_distance_fare + v_time_fare;
  v_minimum_applied := v_subtotal < v_rule.minimum_fare;
  v_before_discount := greatest(v_subtotal, v_rule.minimum_fare);
  v_total := ceil(v_before_discount / v_rule.rounding_increment) * v_rule.rounding_increment;
  v_commission := round(v_total * v_rule.commission_rate);

  return jsonb_build_object(
    'serviceTypeId', v_service.id,
    'serviceCode', v_service.code,
    'operatingAreaId', v_area.id,
    'fareRuleId', v_rule.id,
    'distanceKm', v_distance,
    'durationMinutes', v_duration,
    'estimateSource', 'server_haversine_fallback',
    'currency', 'TZS',
    'fareBreakdown', jsonb_build_object(
      'currency', 'TZS',
      'baseFare', v_base,
      'distanceFare', v_distance_fare,
      'timeFare', v_time_fare,
      'waitingFare', 0,
      'waitingMinutes', 0,
      'subtotal', v_subtotal,
      'discount', 0,
      'total', v_total,
      'minimumApplied', v_minimum_applied,
      'commissionRate', v_rule.commission_rate,
      'commissionAmount', v_commission,
      'driverEarnings', v_total - v_commission,
      'ruleId', v_rule.id,
      'ruleVersion', v_rule.version
    ),
    'total', v_total
  );
end;
$$;

revoke all on function public.quote_ride(uuid, double precision, double precision, double precision, double precision) from public;
grant execute on function public.quote_ride(uuid, double precision, double precision, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- Matching
-- ---------------------------------------------------------------------------
create or replace function private.dispatch_ride(p_ride_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_ride public.rides%rowtype;
  v_radius_m numeric := private.setting_numeric('matching.radius_km', 7) * 1000;
  v_limit integer := greatest(1, least(20, private.setting_numeric('matching.offer_limit', 5)::integer));
  v_ttl integer := greatest(15, least(180, private.setting_numeric('matching.offer_ttl_seconds', 45)::integer));
  v_code public.vehicle_category;
  v_count integer := 0;
  v_driver record;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found or v_ride.status <> 'searching' then
    return 0;
  end if;

  select code into v_code from public.service_types where id = v_ride.service_type_id;

  for v_driver in
    select dp.user_id, v.id as vehicle_id, p.full_name
    from public.driver_profiles dp
    join public.profiles p on p.id = dp.user_id and p.status = 'active'
    join lateral (
      select veh.id
      from public.vehicles veh
      where veh.driver_id = dp.user_id
        and veh.category = v_code
        and veh.active
        and veh.verification_status = 'approved'
      order by veh.created_at asc
      limit 1
    ) v on true
    where dp.approval_status = 'approved'
      and dp.availability = 'online'
      and dp.current_location is not null
      and extensions.ST_DWithin(dp.current_location, v_ride.pickup, v_radius_m)
      and not exists (
        select 1 from public.rides active_ride
        where active_ride.driver_id = dp.user_id
          and active_ride.status in ('accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
      )
      and not exists (
        select 1 from public.ride_offers existing_offer
        where existing_offer.ride_id = v_ride.id
          and existing_offer.driver_id = dp.user_id
      )
    order by
      extensions.ST_Distance(dp.current_location, v_ride.pickup) asc,
      dp.rating desc nulls last,
      dp.total_trips desc
    limit v_limit
  loop
    insert into public.ride_offers (ride_id, driver_id, vehicle_id, expires_at)
    values (
      v_ride.id,
      v_driver.user_id,
      v_driver.vehicle_id,
      now() + make_interval(secs => v_ttl)
    )
    on conflict (ride_id, driver_id) do nothing;

    if found then
      v_count := v_count + 1;
      update public.driver_profiles
      set total_offers = total_offers + 1
      where user_id = v_driver.user_id;

      perform private.notify_user(
        v_driver.user_id,
        'ride_offer',
        'Safari mpya karibu nawe',
        'New ride nearby',
        'Ombi jipya la safari linakusubiri. Fungua LENZI kuona maelezo.',
        'A new ride request is waiting. Open LENZI to view the details.',
        jsonb_build_object('rideId', v_ride.id, 'expiresInSeconds', v_ttl)
      );
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function private.dispatch_ride(uuid) from public;
grant execute on function private.dispatch_ride(uuid) to service_role;

create or replace function public.request_ride(
  p_service_type_id uuid,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_pickup_address text,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_dropoff_address text,
  p_payment_method public.payment_method default 'cash',
  p_client_request_id uuid default null,
  p_promotion_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_existing public.rides%rowtype;
  v_quote jsonb;
  v_breakdown jsonb;
  v_promotion public.promotions%rowtype;
  v_discount numeric := 0;
  v_total numeric;
  v_commission numeric;
  v_ride public.rides%rowtype;
  v_client_id uuid := coalesce(p_client_request_id, extensions.gen_random_uuid());
  v_offer_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.status <> 'active' then
    raise exception 'Account is not active' using errcode = '42501';
  end if;

  select * into v_existing
  from public.rides
  where passenger_id = v_uid and client_request_id = v_client_id;

  if found then
    return public.get_ride_detail(v_existing.id);
  end if;

  if exists (
    select 1 from public.rides
    where passenger_id = v_uid
      and status in ('requested', 'searching', 'accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
  ) then
    raise exception 'You already have an active ride' using errcode = 'P0001';
  end if;

  v_quote := public.quote_ride(
    p_service_type_id, p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng
  );
  v_total := (v_quote ->> 'total')::numeric;
  v_breakdown := v_quote -> 'fareBreakdown';

  if p_promotion_code is not null and trim(p_promotion_code) <> '' then
    select * into v_promotion
    from public.promotions
    where code = upper(trim(p_promotion_code))
      and active
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
    for update;

    if not found then
      raise exception 'Promotion code is not valid' using errcode = 'P0001';
    end if;

    if v_promotion.service_type_id is not null and v_promotion.service_type_id <> p_service_type_id then
      raise exception 'Promotion does not apply to this service' using errcode = 'P0001';
    end if;

    if v_promotion.operating_area_id is not null and v_promotion.operating_area_id <> (v_quote ->> 'operatingAreaId')::uuid then
      raise exception 'Promotion does not apply to this area' using errcode = 'P0001';
    end if;

    if v_promotion.usage_limit is not null and v_promotion.used_count >= v_promotion.usage_limit then
      raise exception 'Promotion has reached its usage limit' using errcode = 'P0001';
    end if;

    if (
      select count(*) from public.promotion_redemptions pr
      where pr.promotion_id = v_promotion.id and pr.user_id = v_uid
    ) >= v_promotion.per_user_limit then
      raise exception 'Promotion has already been used' using errcode = 'P0001';
    end if;

    if v_total >= v_promotion.minimum_fare then
      v_discount := case
        when v_promotion.discount_type = 'percentage'
          then least(
            floor(v_total * v_promotion.discount_value / 100),
            coalesce(v_promotion.max_discount, v_total)
          )
        else least(v_promotion.discount_value, v_total)
      end;
    end if;
  end if;

  v_discount := greatest(0, least(v_discount, v_total));
  v_total := v_total - v_discount;
  v_commission := round(v_total * (v_breakdown ->> 'commissionRate')::numeric);
  v_breakdown := v_breakdown || jsonb_build_object(
    'discount', v_discount,
    'total', v_total,
    'commissionAmount', v_commission,
    'driverEarnings', v_total - v_commission
  );

  insert into public.rides (
    client_request_id, passenger_id, service_type_id, operating_area_id, fare_rule_id,
    status, pickup, pickup_address, dropoff, dropoff_address,
    estimated_distance_km, estimated_duration_min, estimate_source,
    fare_breakdown, estimated_fare, payment_method, promotion_id, discount_amount
  )
  values (
    v_client_id, v_uid, p_service_type_id,
    (v_quote ->> 'operatingAreaId')::uuid,
    (v_quote ->> 'fareRuleId')::uuid,
    'searching',
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::extensions.geography,
    trim(p_pickup_address),
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_dropoff_lng, p_dropoff_lat), 4326)::extensions.geography,
    trim(p_dropoff_address),
    (v_quote ->> 'distanceKm')::numeric,
    (v_quote ->> 'durationMinutes')::integer,
    v_quote ->> 'estimateSource',
    v_breakdown,
    v_total,
    p_payment_method,
    v_promotion.id,
    v_discount
  )
  returning * into v_ride;

  if v_promotion.id is not null and v_discount > 0 then
    insert into public.promotion_redemptions (promotion_id, user_id, ride_id, discount_amount)
    values (v_promotion.id, v_uid, v_ride.id, v_discount);

    update public.promotions
    set used_count = used_count + 1
    where id = v_promotion.id;
  end if;

  perform private.notify_user(
    v_uid,
    'ride_searching',
    'Tunatafuta dereva',
    'Finding your driver',
    'Tunawasiliana na madereva waliokaribu. Tafadhali subiri.',
    'We are contacting nearby drivers. Please wait.',
    jsonb_build_object('rideId', v_ride.id)
  );

  v_offer_count := private.dispatch_ride(v_ride.id);

  if v_offer_count = 0 then
    update public.rides
    set status = 'no_driver_found'
    where id = v_ride.id and status = 'searching';

    perform private.notify_user(
      v_uid,
      'no_driver_found',
      'Hakuna dereva aliyepatikana',
      'No driver found',
      'Hatukuweza kupata dereva karibu. Tafadhali jaribu tena baadaye.',
      'We could not find a nearby driver. Please try again shortly.',
      jsonb_build_object('rideId', v_ride.id)
    );
  end if;

  return public.get_ride_detail(v_ride.id);
end;
$$;

revoke all on function public.request_ride(uuid, double precision, double precision, text, double precision, double precision, text, public.payment_method, uuid, text) from public;
grant execute on function public.request_ride(uuid, double precision, double precision, text, double precision, double precision, text, public.payment_method, uuid, text) to authenticated;

create or replace function public.get_nearby_driver_counts(
  p_lat double precision,
  p_lng double precision
)
returns table (category public.vehicle_category, available_drivers bigint)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_point extensions.geography;
  v_radius_m numeric := private.setting_numeric('matching.radius_km', 7) * 1000;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_point := extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography;

  return query
  select v.category, count(distinct dp.user_id)
  from public.driver_profiles dp
  join public.vehicles v on v.driver_id = dp.user_id
    and v.active and v.verification_status = 'approved'
  where dp.approval_status = 'approved'
    and dp.availability = 'online'
    and dp.current_location is not null
    and extensions.ST_DWithin(dp.current_location, v_point, v_radius_m)
    and not exists (
      select 1 from public.rides r
      where r.driver_id = dp.user_id
        and r.status in ('accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
    )
  group by v.category;
end;
$$;

revoke all on function public.get_nearby_driver_counts(double precision, double precision) from public;
grant execute on function public.get_nearby_driver_counts(double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- Ride state machine guards + automatic event log
-- ---------------------------------------------------------------------------
create or replace function private.validate_ride_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_allowed boolean;
  v_actor_allowed boolean := false;
begin
  if new.status = old.status then
    return new;
  end if;

  v_allowed := case old.status
    when 'requested' then new.status in ('searching', 'cancelled', 'no_driver_found')
    when 'searching' then new.status in ('accepted', 'cancelled', 'no_driver_found')
    when 'accepted' then new.status in ('driver_arriving', 'cancelled', 'disputed')
    when 'driver_arriving' then new.status in ('driver_arrived', 'cancelled', 'disputed')
    when 'driver_arrived' then new.status in ('in_progress', 'cancelled', 'disputed')
    when 'in_progress' then new.status in ('completed', 'disputed')
    when 'completed' then new.status in ('disputed')
    when 'cancelled' then new.status in ('disputed')
    when 'no_driver_found' then false
    when 'disputed' then new.status in ('completed', 'cancelled')
    else false
  end;

  if not v_allowed then
    raise exception 'Illegal ride transition from % to %', old.status, new.status
      using errcode = 'P0001';
  end if;

  if v_uid is null
    or coalesce(auth.role(), '') = 'service_role'
    or private.is_platform_owner(v_uid)
  then
    return new;
  end if;

  if v_uid = old.passenger_id then
    v_actor_allowed :=
      (new.status in ('cancelled', 'no_driver_found') and old.status in ('requested', 'searching', 'accepted', 'driver_arriving', 'driver_arrived'))
      or (new.status = 'searching' and old.status = 'requested')
      or (new.status = 'disputed' and old.status in ('completed', 'cancelled'));
  elsif v_uid = coalesce(old.driver_id, new.driver_id) then
    v_actor_allowed :=
      new.status in ('driver_arriving', 'driver_arrived', 'in_progress', 'completed')
      or (new.status = 'cancelled' and old.status in ('accepted', 'driver_arriving', 'driver_arrived'));
  end if;

  if not v_actor_allowed then
    raise exception 'You are not allowed to perform this ride transition' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_ride_status_transition on public.rides;
create trigger validate_ride_status_transition
  before update of status on public.rides
  for each row execute function private.validate_ride_status_transition();

create or replace function private.log_ride_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if tg_op = 'INSERT' then
    insert into public.ride_events (ride_id, event_type, actor_id, actor_role, to_status, metadata)
    values (
      new.id,
      'ride_created',
      v_uid,
      case
        when private.is_platform_owner(v_uid) then 'platform_owner'
        when v_uid = new.passenger_id then 'passenger'
        else 'system'
      end,
      new.status,
      jsonb_build_object('source', 'backend')
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    v_role := case
      when private.is_platform_owner(v_uid) then 'platform_owner'
      when v_uid = new.passenger_id then 'passenger'
      when v_uid = new.driver_id then 'driver'
      else 'system'
    end;

    insert into public.ride_events (ride_id, event_type, actor_id, actor_role, from_status, to_status)
    values (new.id, 'ride_' || new.status::text, v_uid, v_role, old.status, new.status);
  end if;

  return new;
end;
$$;

drop trigger if exists log_ride_event on public.rides;
create trigger log_ride_event
  after insert or update of status on public.rides
  for each row execute function private.log_ride_event();

-- ---------------------------------------------------------------------------
-- Driver operations
-- ---------------------------------------------------------------------------
create or replace function public.set_location_consent(p_consent boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.driver_profiles where user_id = v_uid) then
    raise exception 'Driver profile not found' using errcode = 'P0001';
  end if;

  update public.driver_profiles
  set location_consent_at = case when p_consent then now() else null end,
      availability = case when p_consent then availability else 'offline' end
  where user_id = v_uid;

  if not p_consent then
    delete from public.driver_locations where driver_id = v_uid;
  end if;

  return jsonb_build_object('consent', p_consent);
end;
$$;

revoke all on function public.set_location_consent(boolean) from public;
grant execute on function public.set_location_consent(boolean) to authenticated;

create or replace function public.set_driver_availability(p_availability public.driver_availability)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_driver public.driver_profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_availability = 'busy' then
    raise exception 'Busy status is managed by the ride engine' using errcode = '22023';
  end if;

  select * into v_driver from public.driver_profiles where user_id = v_uid for update;
  if not found then
    raise exception 'Driver profile not found' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.rides
    where driver_id = v_uid
      and status in ('accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
  ) then
    raise exception 'Complete or cancel your active ride before changing availability' using errcode = 'P0001';
  end if;

  if p_availability = 'online' then
    if v_driver.approval_status <> 'approved' then
      raise exception 'Driver is not approved' using errcode = '42501';
    end if;

    if v_driver.location_consent_at is null then
      raise exception 'Location consent is required before going online' using errcode = 'P0001';
    end if;

    if not exists (
      select 1 from public.vehicles
      where driver_id = v_uid and active and verification_status = 'approved'
    ) then
      raise exception 'No approved active vehicle' using errcode = 'P0001';
    end if;
  end if;

  update public.driver_profiles
  set availability = p_availability,
      last_online_at = case when p_availability = 'online' then now() else last_online_at end
  where user_id = v_uid;

  if p_availability = 'offline' then
    delete from public.driver_locations where driver_id = v_uid;
  end if;

  return jsonb_build_object('availability', p_availability);
end;
$$;

revoke all on function public.set_driver_availability(public.driver_availability) from public;
grant execute on function public.set_driver_availability(public.driver_availability) to authenticated;

create or replace function public.update_driver_location(
  p_lat double precision,
  p_lng double precision,
  p_heading numeric default null,
  p_speed_mps numeric default null,
  p_accuracy_m numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_driver public.driver_profiles%rowtype;
  v_point extensions.geography;
  v_existing public.driver_locations%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Invalid coordinates' using errcode = '22023';
  end if;

  select * into v_driver from public.driver_profiles where user_id = v_uid;
  if not found or v_driver.approval_status <> 'approved' then
    raise exception 'Driver is not approved' using errcode = '42501';
  end if;

  if v_driver.location_consent_at is null then
    raise exception 'Location consent has not been granted' using errcode = '42501';
  end if;

  if v_driver.availability not in ('online', 'busy') then
    raise exception 'Location updates require online availability' using errcode = 'P0001';
  end if;

  v_point := extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography;

  select * into v_existing from public.driver_locations where driver_id = v_uid;
  if found then
    if now() - v_existing.updated_at < interval '4 seconds'
      and extensions.ST_Distance(v_existing.location, v_point) < 25
    then
      return jsonb_build_object('accepted', false, 'reason', 'throttled');
    end if;
  end if;

  insert into public.driver_locations (driver_id, location, heading, speed_mps, accuracy_m, recorded_at)
  values (v_uid, v_point, p_heading, p_speed_mps, p_accuracy_m, now())
  on conflict (driver_id) do update
  set location = excluded.location,
      heading = excluded.heading,
      speed_mps = excluded.speed_mps,
      accuracy_m = excluded.accuracy_m,
      recorded_at = excluded.recorded_at,
      updated_at = now();

  update public.driver_profiles
  set current_location = v_point,
      location_updated_at = now()
  where user_id = v_uid;

  return jsonb_build_object('accepted', true);
end;
$$;

revoke all on function public.update_driver_location(double precision, double precision, numeric, numeric, numeric) from public;
grant execute on function public.update_driver_location(double precision, double precision, numeric, numeric, numeric) to authenticated;

create or replace function public.accept_ride_offer(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides%rowtype;
  v_offer public.ride_offers%rowtype;
  v_driver public.driver_profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_driver from public.driver_profiles where user_id = v_uid for update;
  if not found or v_driver.approval_status <> 'approved' or v_driver.availability <> 'online' then
    raise exception 'Driver is not available to accept rides' using errcode = 'P0001';
  end if;

  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found or v_ride.status <> 'searching' then
    raise exception 'Ride is no longer available' using errcode = 'P0001';
  end if;

  select * into v_offer
  from public.ride_offers
  where ride_id = p_ride_id and driver_id = v_uid and status = 'pending'
  for update;

  if not found then
    raise exception 'Ride offer not found' using errcode = 'P0001';
  end if;

  if v_offer.expires_at <= now() then
    update public.ride_offers set status = 'expired', responded_at = now() where id = v_offer.id;
    raise exception 'Ride offer has expired' using errcode = 'P0001';
  end if;

  update public.ride_offers
  set status = 'accepted', responded_at = now()
  where id = v_offer.id;

  update public.ride_offers
  set status = 'withdrawn', responded_at = now()
  where ride_id = p_ride_id and id <> v_offer.id and status = 'pending';

  update public.driver_profiles
  set availability = 'busy',
      accepted_offers = accepted_offers + 1
  where user_id = v_uid;

  update public.rides
  set driver_id = v_uid,
      vehicle_id = v_offer.vehicle_id,
      status = 'accepted',
      accepted_at = now()
  where id = p_ride_id;

  perform private.notify_user(
    v_ride.passenger_id,
    'driver_assigned',
    'Dereva amepatikana',
    'Driver assigned',
    'Dereva wako anakuja. Unaweza kufuatilia safari kwenye LENZI.',
    'Your driver is on the way. Track the ride in LENZI.',
    jsonb_build_object('rideId', p_ride_id, 'driverId', v_uid)
  );

  return public.get_ride_detail(p_ride_id);
end;
$$;

revoke all on function public.accept_ride_offer(uuid) from public;
grant execute on function public.accept_ride_offer(uuid) to authenticated;

create or replace function public.decline_ride_offer(p_ride_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_remaining integer;
  v_dispatched integer;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.ride_offers
  set status = 'declined', responded_at = now()
  where ride_id = p_ride_id and driver_id = v_uid and status = 'pending';

  if not found then
    raise exception 'Ride offer not found' using errcode = 'P0001';
  end if;

  select count(*) into v_remaining
  from public.ride_offers
  where ride_id = p_ride_id and status = 'pending' and expires_at > now();

  if v_remaining = 0 then
    v_dispatched := private.dispatch_ride(p_ride_id);
    if v_dispatched = 0 then
      update public.rides
      set status = 'no_driver_found'
      where id = p_ride_id and status = 'searching';
    end if;
  end if;

  return jsonb_build_object('declined', true, 'remainingOffers', v_remaining, 'newOffers', v_dispatched);
end;
$$;

revoke all on function public.decline_ride_offer(uuid, text) from public;
grant execute on function public.decline_ride_offer(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Lifecycle transitions
-- ---------------------------------------------------------------------------
create or replace function public.mark_driver_arriving(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides%rowtype;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found or v_ride.driver_id <> v_uid then
    raise exception 'Ride not found' using errcode = '42501';
  end if;
  if v_ride.status <> 'accepted' then
    raise exception 'Ride is not awaiting driver arrival' using errcode = 'P0001';
  end if;

  update public.rides set status = 'driver_arriving' where id = p_ride_id;

  perform private.notify_user(
    v_ride.passenger_id, 'driver_arriving',
    'Dereva anakuja', 'Driver on the way',
    'Dereva wako anaendesha kuelekea mahali ulipo.',
    'Your driver is heading to your pickup point.',
    jsonb_build_object('rideId', p_ride_id)
  );

  return public.get_ride_detail(p_ride_id);
end;
$$;

create or replace function public.mark_driver_arrived(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides%rowtype;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found or v_ride.driver_id <> v_uid then
    raise exception 'Ride not found' using errcode = '42501';
  end if;
  if v_ride.status <> 'driver_arriving' then
    raise exception 'Ride is not in transit to pickup' using errcode = 'P0001';
  end if;

  update public.rides set status = 'driver_arrived', arrived_at = now() where id = p_ride_id;

  perform private.notify_user(
    v_ride.passenger_id, 'driver_arrived',
    'Dereva amefika', 'Driver has arrived',
    'Dereva wako amefika mahali pa kukuchukua.',
    'Your driver has arrived at the pickup point.',
    jsonb_build_object('rideId', p_ride_id)
  );

  return public.get_ride_detail(p_ride_id);
end;
$$;

create or replace function public.start_ride(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides%rowtype;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found or v_ride.driver_id <> v_uid then
    raise exception 'Ride not found' using errcode = '42501';
  end if;
  if v_ride.status <> 'driver_arrived' then
    raise exception 'Passenger pickup has not been confirmed' using errcode = 'P0001';
  end if;

  update public.rides set status = 'in_progress', started_at = now() where id = p_ride_id;

  perform private.notify_user(
    v_ride.passenger_id, 'ride_started',
    'Safari imeanza', 'Ride started',
    'Safari yako imeanza. Fika salama.',
    'Your ride has started. Travel safely.',
    jsonb_build_object('rideId', p_ride_id)
  );

  return public.get_ride_detail(p_ride_id);
end;
$$;

create or replace function public.complete_ride(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides%rowtype;
  v_rule public.fare_rules%rowtype;
  v_free_wait numeric := private.setting_numeric('pricing.free_waiting_minutes', 3);
  v_wait_minutes numeric := 0;
  v_wait_charge numeric := 0;
  v_final numeric;
  v_commission numeric;
  v_earnings numeric;
  v_breakdown jsonb;
  v_provider public.payment_provider;
begin
  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found or v_ride.driver_id <> v_uid then
    raise exception 'Ride not found' using errcode = '42501';
  end if;
  if v_ride.status <> 'in_progress' then
    raise exception 'Ride is not in progress' using errcode = 'P0001';
  end if;

  select * into v_rule from public.fare_rules where id = v_ride.fare_rule_id;

  if v_ride.arrived_at is not null and v_ride.started_at is not null then
    v_wait_minutes := greatest(
      0,
      ceil(extract(epoch from (v_ride.started_at - v_ride.arrived_at)) / 60) - v_free_wait
    );
  end if;

  v_wait_charge := round(v_wait_minutes * v_rule.waiting_per_minute);
  v_final := v_ride.estimated_fare + v_wait_charge;
  v_commission := round(v_final * v_rule.commission_rate);
  v_earnings := v_final - v_commission;
  v_breakdown := v_ride.fare_breakdown || jsonb_build_object(
    'waitingMinutes', v_wait_minutes,
    'waitingFare', v_wait_charge,
    'total', v_final,
    'commissionAmount', v_commission,
    'driverEarnings', v_earnings
  );

  update public.rides
  set status = 'completed',
      final_fare = v_final,
      commission_amount = v_commission,
      driver_earnings = v_earnings,
      fare_breakdown = v_breakdown,
      completed_at = now()
  where id = p_ride_id;

  update public.driver_profiles
  set availability = 'online', total_trips = total_trips + 1
  where user_id = v_uid;

  v_provider := case v_ride.payment_method
    when 'cash' then 'cash'::public.payment_provider
    when 'mpesa' then 'mpesa'::public.payment_provider
    when 'airtel_money' then 'airtel'::public.payment_provider
    when 'mixx_by_yas' then 'mixx'::public.payment_provider
  end;

  insert into public.payments (
    ride_id, payer_id, method, provider, amount, status, idempotency_key
  )
  values (
    p_ride_id, v_ride.passenger_id, v_ride.payment_method, v_provider, v_final, 'pending',
    'ride:' || p_ride_id::text || ':fare'
  )
  on conflict (idempotency_key) do nothing;

  insert into public.driver_earnings (
    driver_id, ride_id, gross_amount, commission_amount, net_amount, status
  )
  values (v_uid, p_ride_id, v_final, v_commission, v_earnings, 'pending')
  on conflict (ride_id) do nothing;

  perform private.notify_user(
    v_ride.passenger_id, 'ride_completed',
    'Umefika salama', 'You have arrived',
    'Safari yako imekamilika. Tafadhali lipa na umpe dereva alama.',
    'Your ride is complete. Please pay and rate your driver.',
    jsonb_build_object('rideId', p_ride_id, 'fare', v_final, 'paymentMethod', v_ride.payment_method)
  );

  return public.get_ride_detail(p_ride_id);
end;
$$;

create or replace function public.confirm_cash_payment(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides%rowtype;
  v_payment public.payments%rowtype;
begin
  select * into v_ride from public.rides where id = p_ride_id;
  if not found or v_ride.driver_id <> v_uid then
    raise exception 'Ride not found' using errcode = '42501';
  end if;
  if v_ride.status <> 'completed' then
    raise exception 'Ride is not completed' using errcode = 'P0001';
  end if;
  if v_ride.payment_method <> 'cash' then
    raise exception 'This ride is not a cash payment' using errcode = 'P0001';
  end if;

  select * into v_payment
  from public.payments
  where ride_id = p_ride_id and method = 'cash'
  order by created_at desc limit 1
  for update;

  if not found then
    raise exception 'Payment record not found' using errcode = 'P0001';
  end if;

  if v_payment.status <> 'paid' then
    update public.payments
    set status = 'paid', paid_at = now(), transaction_reference = coalesce(transaction_reference, 'cash:' || p_ride_id::text)
    where id = v_payment.id;

    update public.driver_earnings
    set status = 'available', available_at = now()
    where ride_id = p_ride_id;
  end if;

  return jsonb_build_object('paymentId', v_payment.id, 'status', 'paid');
end;
$$;

create or replace function public.cancel_ride(p_ride_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides%rowtype;
  v_rule public.fare_rules%rowtype;
  v_fee numeric := 0;
  v_is_owner boolean := private.is_platform_owner(auth.uid());
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_ride from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'Ride not found' using errcode = '42501';
  end if;

  if not v_is_owner and v_uid <> v_ride.passenger_id and v_uid <> v_ride.driver_id then
    raise exception 'Ride not found' using errcode = '42501';
  end if;

  if v_ride.status in ('completed', 'cancelled', 'no_driver_found') then
    raise exception 'Ride cannot be cancelled in its current state' using errcode = 'P0001';
  end if;

  if v_uid = v_ride.passenger_id and v_ride.status = 'in_progress' then
    raise exception 'Contact support to end an in-progress ride' using errcode = 'P0001';
  end if;

  if v_uid = v_ride.driver_id and v_ride.status = 'in_progress' then
    raise exception 'Contact support to end an in-progress ride' using errcode = 'P0001';
  end if;

  if v_uid = v_ride.passenger_id and v_ride.status = 'driver_arrived' then
    select * into v_rule from public.fare_rules where id = v_ride.fare_rule_id;
    v_fee := coalesce(v_rule.cancellation_fee, 0);
  end if;

  update public.rides
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_uid,
      cancellation_reason = nullif(left(trim(coalesce(p_reason, '')), 500), ''),
      cancellation_fee = v_fee
  where id = p_ride_id;

  update public.ride_offers
  set status = 'withdrawn', responded_at = now()
  where ride_id = p_ride_id and status = 'pending';

  if v_ride.driver_id is not null then
    update public.driver_profiles
    set availability = 'online'
    where user_id = v_ride.driver_id;
  end if;

  if v_fee > 0 then
    insert into public.payments (ride_id, payer_id, method, provider, amount, status, idempotency_key)
    values (
      p_ride_id, v_ride.passenger_id, v_ride.payment_method,
      case v_ride.payment_method
        when 'cash' then 'cash'::public.payment_provider
        when 'mpesa' then 'mpesa'::public.payment_provider
        when 'airtel_money' then 'airtel'::public.payment_provider
        when 'mixx_by_yas' then 'mixx'::public.payment_provider
      end,
      v_fee, 'pending', 'ride:' || p_ride_id::text || ':cancellation'
    )
    on conflict (idempotency_key) do nothing;
  end if;

  if (case when v_uid = v_ride.passenger_id then v_ride.driver_id else v_ride.passenger_id end) is not null then
    perform private.notify_user(
      case when v_uid = v_ride.passenger_id then v_ride.driver_id else v_ride.passenger_id end,
      'ride_cancelled',
      'Safari imeghairiwa', 'Ride cancelled',
      'Safari imeghairiwa. Fungua LENZI kuona maelezo.',
      'The ride was cancelled. Open LENZI for details.',
      jsonb_build_object('rideId', p_ride_id, 'cancelledBy', v_uid)
    );
  end if;

  return public.get_ride_detail(p_ride_id);
end;
$$;

create or replace function public.rate_ride(
  p_ride_id uuid,
  p_stars smallint,
  p_comment text default null,
  p_tags text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides%rowtype;
  v_avg numeric;
  v_rating_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_stars not between 1 and 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = '22023';
  end if;

  select * into v_ride from public.rides where id = p_ride_id;
  if not found or v_ride.passenger_id <> v_uid then
    raise exception 'Ride not found' using errcode = '42501';
  end if;
  if v_ride.status <> 'completed' or v_ride.driver_id is null then
    raise exception 'Only completed rides can be rated' using errcode = 'P0001';
  end if;

  insert into public.ratings (ride_id, passenger_id, driver_id, stars, comment, tags)
  values (p_ride_id, v_uid, v_ride.driver_id, p_stars, nullif(left(trim(coalesce(p_comment, '')), 1000), ''), coalesce(p_tags, '{}'))
  returning id into v_rating_id;

  select round(avg(stars)::numeric, 2) into v_avg
  from public.ratings where driver_id = v_ride.driver_id;

  update public.driver_profiles set rating = v_avg where user_id = v_ride.driver_id;

  return jsonb_build_object('ratingId', v_rating_id, 'driverRating', v_avg);
exception
  when unique_violation then
    raise exception 'This ride has already been rated' using errcode = 'P0001';
end;
$$;

revoke all on function public.mark_driver_arriving(uuid) from public;
revoke all on function public.mark_driver_arrived(uuid) from public;
revoke all on function public.start_ride(uuid) from public;
revoke all on function public.complete_ride(uuid) from public;
revoke all on function public.confirm_cash_payment(uuid) from public;
revoke all on function public.cancel_ride(uuid, text) from public;
revoke all on function public.rate_ride(uuid, smallint, text, text[]) from public;

grant execute on function public.mark_driver_arriving(uuid) to authenticated;
grant execute on function public.mark_driver_arrived(uuid) to authenticated;
grant execute on function public.start_ride(uuid) to authenticated;
grant execute on function public.complete_ride(uuid) to authenticated;
grant execute on function public.confirm_cash_payment(uuid) to authenticated;
grant execute on function public.cancel_ride(uuid, text) to authenticated;
grant execute on function public.rate_ride(uuid, smallint, text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Participant-safe ride projection
-- ---------------------------------------------------------------------------
create or replace function public.get_ride_detail(p_ride_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides%rowtype;
  v_counterpart jsonb;
  v_driver_location jsonb;
  v_events jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_ride from public.rides where id = p_ride_id;
  if not found then
    raise exception 'Ride not found' using errcode = '42501';
  end if;

  if v_uid <> v_ride.passenger_id
    and v_uid <> coalesce(v_ride.driver_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and not private.is_platform_owner(v_uid)
  then
    raise exception 'Ride not found' using errcode = '42501';
  end if;

  if v_uid = v_ride.passenger_id then
    select jsonb_build_object(
      'role', 'driver',
      'id', p.id,
      'fullName', p.full_name,
      'avatarUrl', p.avatar_url,
      'phone', p.phone,
      'rating', dp.rating,
      'totalTrips', dp.total_trips,
      'vehicle', case when v.id is null then null else jsonb_build_object(
        'id', v.id, 'category', v.category, 'make', v.make, 'model', v.model,
        'color', v.color, 'plateNumber', v.plate_number
      ) end
    )
    into v_counterpart
    from public.profiles p
    join public.driver_profiles dp on dp.user_id = p.id
    left join public.vehicles v on v.id = v_ride.vehicle_id
    where p.id = v_ride.driver_id;
  else
    select jsonb_build_object(
      'role', 'passenger',
      'id', p.id,
      'fullName', p.full_name,
      'avatarUrl', p.avatar_url,
      'phone', p.phone
    )
    into v_counterpart
    from public.profiles p
    where p.id = v_ride.passenger_id;
  end if;

  if v_uid = v_ride.passenger_id
    and v_ride.driver_id is not null
    and v_ride.status in ('accepted', 'driver_arriving', 'driver_arrived', 'in_progress')
  then
    select jsonb_build_object(
      'lat', extensions.ST_Y(dl.location::extensions.geometry),
      'lng', extensions.ST_X(dl.location::extensions.geometry),
      'heading', dl.heading,
      'recordedAt', dl.recorded_at
    )
    into v_driver_location
    from public.driver_locations dl
    where dl.driver_id = v_ride.driver_id;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'eventType', e.event_type,
      'fromStatus', e.from_status,
      'toStatus', e.to_status,
      'createdAt', e.created_at
    ) order by e.created_at
  ), '[]'::jsonb)
  into v_events
  from public.ride_events e
  where e.ride_id = p_ride_id;

  return jsonb_build_object(
    'id', v_ride.id,
    'status', v_ride.status,
    'passengerId', v_ride.passenger_id,
    'driverId', v_ride.driver_id,
    'vehicleId', v_ride.vehicle_id,
    'serviceTypeId', v_ride.service_type_id,
    'operatingAreaId', v_ride.operating_area_id,
    'pickup', jsonb_build_object(
      'lat', extensions.ST_Y(v_ride.pickup::extensions.geometry),
      'lng', extensions.ST_X(v_ride.pickup::extensions.geometry),
      'address', v_ride.pickup_address
    ),
    'dropoff', jsonb_build_object(
      'lat', extensions.ST_Y(v_ride.dropoff::extensions.geometry),
      'lng', extensions.ST_X(v_ride.dropoff::extensions.geometry),
      'address', v_ride.dropoff_address
    ),
    'estimatedDistanceKm', v_ride.estimated_distance_km,
    'estimatedDurationMinutes', v_ride.estimated_duration_min,
    'estimateSource', v_ride.estimate_source,
    'fareBreakdown', v_ride.fare_breakdown,
    'estimatedFare', v_ride.estimated_fare,
    'finalFare', v_ride.final_fare,
    'currency', v_ride.currency,
    'paymentMethod', v_ride.payment_method,
    'paymentStatus', (
      select pm.status from public.payments pm
      where pm.ride_id = v_ride.id
      order by pm.created_at desc limit 1
    ),
    'requestedAt', v_ride.requested_at,
    'acceptedAt', v_ride.accepted_at,
    'arrivedAt', v_ride.arrived_at,
    'startedAt', v_ride.started_at,
    'completedAt', v_ride.completed_at,
    'cancelledAt', v_ride.cancelled_at,
    'cancellationFee', v_ride.cancellation_fee,
    'counterpart', v_counterpart,
    'driverLocation', v_driver_location,
    'events', v_events
  );
end;
$$;

revoke all on function public.get_ride_detail(uuid) from public;
grant execute on function public.get_ride_detail(uuid) to authenticated;

-- Scheduled matching expiry. Invoke from a protected cron/Edge Function.
create or replace function public.expire_stale_offers()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ride_id uuid;
  v_ride_ids uuid[];
  v_expired integer := 0;
  v_dispatched integer;
  v_pending integer;
begin
  select coalesce(array_agg(distinct ride_id), '{}'::uuid[])
  into v_ride_ids
  from public.ride_offers
  where status = 'pending' and expires_at <= now();

  update public.ride_offers
  set status = 'expired', responded_at = now()
  where status = 'pending' and expires_at <= now();

  get diagnostics v_expired = row_count;

  foreach v_ride_id in array v_ride_ids
  loop
    select count(*) into v_pending
    from public.ride_offers
    where ride_id = v_ride_id and status = 'pending' and expires_at > now();

    if v_pending = 0 and exists (
      select 1 from public.rides where id = v_ride_id and status = 'searching'
    ) then
      v_dispatched := private.dispatch_ride(v_ride_id);
      if v_dispatched = 0 then
        update public.rides set status = 'no_driver_found'
        where id = v_ride_id and status = 'searching';
      end if;
    end if;
  end loop;

  return v_expired;
end;
$$;

revoke all on function public.expire_stale_offers() from public;
grant execute on function public.expire_stale_offers() to service_role;

-- ---------------------------------------------------------------------------
-- Driver offer inbox
-- A driver with a pending offer is not yet a ride participant, so the ride row
-- is not readable under RLS. This projection exposes only what is needed to
-- accept or decline, and only to the offered driver.
-- ---------------------------------------------------------------------------
create or replace function public.get_driver_offers()
returns table (
  offer_id uuid,
  ride_id uuid,
  expires_at timestamptz,
  status public.ride_offer_status,
  service_code public.vehicle_category,
  pickup_address text,
  dropoff_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_lat double precision,
  dropoff_lng double precision,
  distance_km numeric,
  duration_min integer,
  estimated_fare numeric,
  payment_method public.payment_method
)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not private.is_approved_driver(v_uid) then
    raise exception 'Driver is not approved' using errcode = '42501';
  end if;

  return query
  select
    o.id,
    o.ride_id,
    o.expires_at,
    o.status,
    st.code,
    r.pickup_address,
    r.dropoff_address,
    extensions.ST_Y(r.pickup::extensions.geometry),
    extensions.ST_X(r.pickup::extensions.geometry),
    extensions.ST_Y(r.dropoff::extensions.geometry),
    extensions.ST_X(r.dropoff::extensions.geometry),
    r.estimated_distance_km,
    r.estimated_duration_min,
    r.estimated_fare,
    r.payment_method
  from public.ride_offers o
  join public.rides r on r.id = o.ride_id
  join public.service_types st on st.id = r.service_type_id
  where o.driver_id = v_uid
    and o.status = 'pending'
    and o.expires_at > now()
    and r.status = 'searching'
  order by o.expires_at asc;
end;
$$;

revoke all on function public.get_driver_offers() from public;
grant execute on function public.get_driver_offers() to authenticated;
