-- LENZI 0005 — owner bootstrap, admin operations, payment settlement and reporting

-- ---------------------------------------------------------------------------
-- Secure initial owner bootstrap.
-- Executable only by service_role / postgres. Never exposed through the API.
-- Run once from the Supabase SQL editor:
--   select private.bootstrap_platform_owner('<auth-user-uuid>');
-- ---------------------------------------------------------------------------
create or replace function private.bootstrap_platform_owner(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Auth user not found' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.profiles where role = 'platform_owner') then
    raise exception 'A platform owner already exists' using errcode = 'P0001';
  end if;

  update public.profiles
  set role = 'platform_owner', status = 'active'
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found. Sign the user up first.' using errcode = 'P0001';
  end if;

  insert into public.admin_audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (
    p_user_id, 'platform_owner', 'owner.bootstrapped', 'profiles', p_user_id::text,
    jsonb_build_object('userId', p_user_id, 'method', 'service_role_bootstrap')
  );

  return jsonb_build_object('ok', true, 'ownerId', p_user_id);
end;
$$;

revoke all on function private.bootstrap_platform_owner(uuid) from public;
revoke all on function private.bootstrap_platform_owner(uuid) from anon, authenticated;
grant execute on function private.bootstrap_platform_owner(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Driver verification and suspension
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_driver(
  p_driver_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_driver public.driver_profiles%rowtype;
  v_vehicle_count integer;
  v_required_docs integer;
  v_reason text := nullif(left(trim(coalesce(p_reason, '')), 1000), '');
begin
  if not private.is_platform_owner(v_owner) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  if p_action not in ('approve', 'reject', 'suspend', 'reinstate') then
    raise exception 'Unsupported review action' using errcode = '22023';
  end if;

  select * into v_driver from public.driver_profiles where user_id = p_driver_id for update;
  if not found then
    raise exception 'Driver not found' using errcode = 'P0001';
  end if;

  if p_action = 'approve' then
    select count(*) into v_vehicle_count
    from public.vehicles
    where driver_id = p_driver_id and active;

    select count(distinct document_type) into v_required_docs
    from public.driver_documents
    where driver_id = p_driver_id
      and document_type in ('national_id', 'driving_licence', 'vehicle_registration');

    if v_vehicle_count = 0 then
      raise exception 'Driver must have at least one active vehicle' using errcode = 'P0001';
    end if;

    if v_required_docs < 3 then
      raise exception 'Identity, licence and vehicle registration documents are required' using errcode = 'P0001';
    end if;

    update public.driver_profiles
    set approval_status = 'approved',
        approved_at = now(),
        approved_by = v_owner,
        rejection_reason = null,
        suspended_reason = null
    where user_id = p_driver_id;

    update public.driver_documents
    set status = 'approved', reviewed_by = v_owner, reviewed_at = now()
    where driver_id = p_driver_id and status = 'pending';

    update public.vehicles
    set verification_status = 'approved'
    where driver_id = p_driver_id and active and verification_status = 'pending';

    perform private.notify_user(
      p_driver_id,
      'driver_approved',
      'Usajili wako umeidhinishwa',
      'Your driver account is approved',
      'Karibu LENZI. Unaweza kuanza kupokea safari ukiwa mtandaoni.',
      'Welcome to LENZI. You can now go online and receive ride requests.',
      jsonb_build_object('driverId', p_driver_id)
    );
  elsif p_action = 'reject' then
    if v_reason is null then
      raise exception 'A rejection reason is required' using errcode = '22023';
    end if;

    update public.driver_profiles
    set approval_status = 'rejected',
        availability = 'offline',
        rejection_reason = v_reason
    where user_id = p_driver_id;

    delete from public.driver_locations where driver_id = p_driver_id;

    perform private.notify_user(
      p_driver_id,
      'driver_rejected',
      'Usajili wako haujaidhinishwa',
      'Your driver application was not approved',
      'Tafadhali fungua LENZI kuona sababu na hatua zinazofuata.',
      'Open LENZI to review the reason and next steps.',
      jsonb_build_object('driverId', p_driver_id, 'reason', v_reason)
    );
  elsif p_action = 'suspend' then
    if v_reason is null then
      raise exception 'A suspension reason is required' using errcode = '22023';
    end if;

    update public.driver_profiles
    set approval_status = 'suspended',
        availability = 'offline',
        suspended_reason = v_reason
    where user_id = p_driver_id;

    delete from public.driver_locations where driver_id = p_driver_id;

    perform private.notify_user(
      p_driver_id,
      'driver_suspended',
      'Akaunti yako imesimamishwa',
      'Your account has been suspended',
      'Wasiliana na msaada wa LENZI kwa maelezo zaidi.',
      'Contact LENZI support for more information.',
      jsonb_build_object('driverId', p_driver_id, 'reason', v_reason)
    );
  elsif p_action = 'reinstate' then
    update public.driver_profiles
    set approval_status = 'approved',
        approved_at = coalesce(approved_at, now()),
        approved_by = v_owner,
        suspended_reason = null,
        rejection_reason = null
    where user_id = p_driver_id;

    perform private.notify_user(
      p_driver_id,
      'driver_reinstated',
      'Akaunti yako imerejeshwa',
      'Your account has been reinstated',
      'Unaweza kurejea mtandaoni kupokea safari.',
      'You can go online and receive rides again.',
      jsonb_build_object('driverId', p_driver_id)
    );
  end if;

  return jsonb_build_object('ok', true, 'driverId', p_driver_id, 'action', p_action);
end;
$$;

revoke all on function public.admin_review_driver(uuid, text, text) from public;
grant execute on function public.admin_review_driver(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Fare versioning
-- ---------------------------------------------------------------------------
create or replace function public.admin_publish_fare_rule(
  p_service_type_id uuid,
  p_operating_area_id uuid,
  p_base_fare numeric,
  p_per_km numeric,
  p_per_minute numeric,
  p_minimum_fare numeric,
  p_waiting_per_minute numeric,
  p_cancellation_fee numeric,
  p_commission_rate numeric,
  p_rounding_increment integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_version integer;
  v_rule public.fare_rules%rowtype;
begin
  if not private.is_platform_owner(v_owner) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.service_types where id = p_service_type_id and active) then
    raise exception 'Service type is not active' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.operating_areas where id = p_operating_area_id and active) then
    raise exception 'Operating area is not active' using errcode = 'P0001';
  end if;

  if least(
    p_base_fare, p_per_km, p_per_minute, p_minimum_fare,
    p_waiting_per_minute, p_cancellation_fee
  ) < 0 then
    raise exception 'Fares cannot be negative' using errcode = '22023';
  end if;

  if p_commission_rate not between 0 and 1 then
    raise exception 'Commission rate must be between 0 and 1' using errcode = '22023';
  end if;

  if p_rounding_increment is null or p_rounding_increment <= 0 or p_rounding_increment > 10000 then
    raise exception 'Invalid rounding increment' using errcode = '22023';
  end if;

  update public.fare_rules
  set active = false, effective_to = now()
  where service_type_id = p_service_type_id
    and operating_area_id = p_operating_area_id
    and active
    and effective_to is null;

  select coalesce(max(version), 0) + 1 into v_version
  from public.fare_rules
  where service_type_id = p_service_type_id and operating_area_id = p_operating_area_id;

  insert into public.fare_rules (
    service_type_id, operating_area_id, base_fare, per_km, per_minute,
    minimum_fare, waiting_per_minute, cancellation_fee, commission_rate,
    rounding_increment, version, created_by
  )
  values (
    p_service_type_id, p_operating_area_id, p_base_fare, p_per_km, p_per_minute,
    p_minimum_fare, p_waiting_per_minute, p_cancellation_fee, p_commission_rate,
    p_rounding_increment, v_version, v_owner
  )
  returning * into v_rule;

  return jsonb_build_object(
    'id', v_rule.id,
    'version', v_rule.version,
    'serviceTypeId', v_rule.service_type_id,
    'operatingAreaId', v_rule.operating_area_id,
    'commissionRate', v_rule.commission_rate,
    'roundingIncrement', v_rule.rounding_increment
  );
end;
$$;

revoke all on function public.admin_publish_fare_rule(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, numeric, integer) from public;
grant execute on function public.admin_publish_fare_rule(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, numeric, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Payout tracking
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_payout(
  p_payout_id uuid,
  p_action text,
  p_reference text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_payout public.payouts%rowtype;
begin
  if not private.is_platform_owner(v_owner) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  if p_action not in ('processing', 'paid', 'rejected', 'failed') then
    raise exception 'Unsupported payout action' using errcode = '22023';
  end if;

  select * into v_payout from public.payouts where id = p_payout_id for update;
  if not found then
    raise exception 'Payout not found' using errcode = 'P0001';
  end if;

  update public.payouts
  set status = p_action::public.payout_status,
      reference = coalesce(nullif(trim(p_reference), ''), reference),
      notes = coalesce(nullif(trim(p_notes), ''), notes),
      processed_at = case when p_action in ('paid', 'rejected', 'failed') then now() else processed_at end,
      processed_by = case when p_action in ('paid', 'rejected', 'failed') then v_owner else processed_by end
  where id = p_payout_id;

  perform private.notify_user(
    v_payout.driver_id,
    'payout_' || p_action,
    'Taarifa ya malipo',
    'Payout update',
    'Hali ya malipo yako imebadilika. Fungua LENZI kuona maelezo.',
    'Your payout status has changed. Open LENZI for details.',
    jsonb_build_object('payoutId', p_payout_id, 'status', p_action)
  );

  return jsonb_build_object('ok', true, 'payoutId', p_payout_id, 'status', p_action);
end;
$$;

revoke all on function public.admin_review_payout(uuid, text, text, text) from public;
grant execute on function public.admin_review_payout(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Dashboard metrics and time series
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not private.is_platform_owner(auth.uid()) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totalPassengers', (select count(*) from public.profiles where role = 'passenger'),
    'totalDrivers', (select count(*) from public.profiles where role = 'driver'),
    'pendingDrivers', (select count(*) from public.driver_profiles where approval_status = 'pending'),
    'approvedDrivers', (select count(*) from public.driver_profiles where approval_status = 'approved'),
    'onlineDrivers', (select count(*) from public.driver_profiles where availability in ('online', 'busy') and approval_status = 'approved'),
    'activeRides', (select count(*) from public.rides where status in ('requested', 'searching', 'accepted', 'driver_arriving', 'driver_arrived', 'in_progress')),
    'completedRides', (select count(*) from public.rides where status = 'completed'),
    'cancelledRides', (select count(*) from public.rides where status = 'cancelled'),
    'grossBookingValue', coalesce((select sum(final_fare) from public.rides where status = 'completed'), 0),
    'platformRevenue', coalesce((select sum(commission_amount) from public.rides where status = 'completed'), 0),
    'driverEarnings', coalesce((select sum(driver_earnings) from public.rides where status = 'completed'), 0),
    'pendingPayouts', coalesce((select sum(amount) from public.payouts where status in ('requested', 'processing')), 0)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_metrics() from public;
grant execute on function public.admin_dashboard_metrics() to authenticated;

create or replace function public.admin_revenue_series(p_days integer default 14)
returns table (
  day date,
  completed_rides bigint,
  gross numeric,
  commission numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_platform_owner(auth.uid()) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  if p_days < 1 or p_days > 365 then
    raise exception 'p_days must be between 1 and 365' using errcode = '22023';
  end if;

  return query
  select
    d::date as day,
    count(r.id) as completed_rides,
    coalesce(sum(r.final_fare), 0) as gross,
    coalesce(sum(r.commission_amount), 0) as commission
  from generate_series(
    (now() at time zone 'Africa/Dar_es_Salaam')::date - (p_days - 1),
    (now() at time zone 'Africa/Dar_es_Salaam')::date,
    interval '1 day'
  ) d
  left join public.rides r
    on r.status = 'completed'
    and (r.completed_at at time zone 'Africa/Dar_es_Salaam')::date = d::date
  group by d
  order by d;
end;
$$;

revoke all on function public.admin_revenue_series(integer) from public;
grant execute on function public.admin_revenue_series(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Payment provider settlement boundary
-- These functions are called only by a trusted Edge Function using service_role.
-- ---------------------------------------------------------------------------
create or replace function private.settle_payment(
  p_payment_id uuid,
  p_status public.payment_status,
  p_provider_reference text default null,
  p_failure_code text default null,
  p_failure_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_ride public.rides%rowtype;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0001';
  end if;

  if v_payment.status = 'paid' and p_status = 'paid' then
    return jsonb_build_object('paymentId', v_payment.id, 'status', 'paid', 'idempotent', true);
  end if;

  if p_status not in ('processing', 'paid', 'failed', 'refunded', 'partially_refunded') then
    raise exception 'Unsupported payment status' using errcode = '22023';
  end if;

  update public.payments
  set status = p_status,
      provider_reference = coalesce(p_provider_reference, provider_reference),
      failure_code = p_failure_code,
      failure_message = p_failure_message,
      paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else paid_at end
  where id = p_payment_id;

  if p_status = 'paid' then
    update public.driver_earnings
    set status = 'available', available_at = now()
    where ride_id = v_payment.ride_id;

    select * into v_ride from public.rides where id = v_payment.ride_id;

    perform private.notify_user(
      v_ride.passenger_id,
      'payment_confirmed',
      'Malipo yamethibitishwa',
      'Payment confirmed',
      'Malipo ya safari yako yamethibitishwa.',
      'Your ride payment has been confirmed.',
      jsonb_build_object('rideId', v_payment.ride_id, 'paymentId', v_payment.id)
    );
  end if;

  return jsonb_build_object('paymentId', v_payment.id, 'status', p_status);
end;
$$;

revoke all on function private.settle_payment(uuid, public.payment_status, text, text, text) from public;
grant execute on function private.settle_payment(uuid, public.payment_status, text, text, text) to service_role;

create or replace function public.admin_refund_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_payment public.payments%rowtype;
  v_total_refund numeric;
  v_status public.payment_status;
begin
  if not private.is_platform_owner(v_owner) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Refund amount must be positive' using errcode = '22023';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0001';
  end if;

  if v_payment.status <> 'paid' then
    raise exception 'Only paid payments can be refunded' using errcode = 'P0001';
  end if;

  v_total_refund := v_payment.refunded_amount + p_amount;
  if v_total_refund > v_payment.amount then
    raise exception 'Refund exceeds payment amount' using errcode = '22023';
  end if;

  v_status := case when v_total_refund = v_payment.amount then 'refunded' else 'partially_refunded' end;

  update public.payments
  set refunded_amount = v_total_refund,
      status = v_status
  where id = p_payment_id;

  insert into public.admin_audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data)
  values (
    v_owner, 'platform_owner', 'payment.refunded', 'payments', p_payment_id::text,
    to_jsonb(v_payment),
    jsonb_build_object('refundedAmount', v_total_refund, 'reason', left(p_reason, 1000), 'status', v_status)
  );

  return jsonb_build_object('paymentId', p_payment_id, 'refundedAmount', v_total_refund, 'status', v_status);
end;
$$;

revoke all on function public.admin_refund_payment(uuid, numeric, text) from public;
grant execute on function public.admin_refund_payment(uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Driver dashboard projection
-- ---------------------------------------------------------------------------
create or replace function public.get_driver_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_driver public.driver_profiles%rowtype;
  v_today date := (now() at time zone 'Africa/Dar_es_Salaam')::date;
  v_acceptance numeric;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_driver from public.driver_profiles where user_id = v_uid;
  if not found then
    raise exception 'Driver profile not found' using errcode = '42501';
  end if;

  v_acceptance := case
    when v_driver.total_offers = 0 then null
    else round(v_driver.accepted_offers::numeric / v_driver.total_offers * 100, 1)
  end;

  return jsonb_build_object(
    'availability', v_driver.availability,
    'approvalStatus', v_driver.approval_status,
    'rating', v_driver.rating,
    'totalTrips', v_driver.total_trips,
    'acceptanceRate', v_acceptance,
    'todayEarnings', coalesce((
      select sum(net_amount) from public.driver_earnings
      where driver_id = v_uid
        and status in ('pending', 'available', 'paid')
        and (created_at at time zone 'Africa/Dar_es_Salaam')::date = v_today
    ), 0),
    'weekEarnings', coalesce((
      select sum(net_amount) from public.driver_earnings
      where driver_id = v_uid
        and status in ('pending', 'available', 'paid')
        and created_at >= now() - interval '7 days'
    ), 0),
    'availableBalance', coalesce((
      select sum(net_amount) from public.driver_earnings
      where driver_id = v_uid and status = 'available'
    ), 0),
    'pendingPayouts', coalesce((
      select sum(amount) from public.payouts
      where driver_id = v_uid and status in ('requested', 'processing')
    ), 0),
    'completedTrips', (
      select count(*) from public.rides
      where driver_id = v_uid and status = 'completed'
    )
  );
end;
$$;

revoke all on function public.get_driver_summary() from public;
grant execute on function public.get_driver_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- Driver application submission
-- A driver can only move their own application into review. Approval itself is
-- owner-only and happens through admin_review_driver.
-- ---------------------------------------------------------------------------
create or replace function public.submit_driver_application()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_driver public.driver_profiles%rowtype;
  v_vehicle_count integer;
  v_doc_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_driver from public.driver_profiles where user_id = v_uid for update;
  if not found then
    raise exception 'Driver profile not found' using errcode = 'P0001';
  end if;

  if v_driver.approval_status in ('approved', 'suspended') then
    raise exception 'Application is already approved or suspended' using errcode = 'P0001';
  end if;

  select count(*) into v_vehicle_count
  from public.vehicles
  where driver_id = v_uid and active;

  select count(distinct document_type) into v_doc_count
  from public.driver_documents
  where driver_id = v_uid
    and document_type in ('national_id', 'driving_licence', 'vehicle_registration');

  if v_vehicle_count = 0 then
    raise exception 'Add at least one active vehicle before submitting' using errcode = 'P0001';
  end if;

  if v_doc_count < 3 then
    raise exception 'Upload national ID, driving licence and vehicle registration first' using errcode = 'P0001';
  end if;

  update public.driver_profiles
  set approval_status = 'pending',
      rejection_reason = null
  where user_id = v_uid;

  return jsonb_build_object('ok', true, 'approvalStatus', 'pending');
end;
$$;

revoke all on function public.submit_driver_application() from public;
grant execute on function public.submit_driver_application() to authenticated;
