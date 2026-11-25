-- LENZI 0001 — extensions, schemas and domain enums
-- All schema changes are versioned in this directory.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

do $$
begin
  create type public.user_role as enum ('platform_owner', 'passenger', 'driver');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.account_status as enum ('active', 'suspended', 'deactivated');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.driver_approval_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.driver_availability as enum ('offline', 'online', 'busy');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.vehicle_category as enum ('boda_boda', 'bajaji', 'car');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_type as enum (
    'profile_photo', 'national_id', 'driving_licence', 'vehicle_registration',
    'vehicle_insurance', 'vehicle_photo', 'roadworthiness'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_status as enum ('pending', 'approved', 'rejected', 'expired');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.ride_status as enum (
    'requested', 'searching', 'accepted', 'driver_arriving', 'driver_arrived',
    'in_progress', 'completed', 'cancelled', 'no_driver_found', 'disputed'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.ride_offer_status as enum ('pending', 'accepted', 'declined', 'expired', 'withdrawn');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('cash', 'mpesa', 'airtel_money', 'mixx_by_yas');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_provider as enum ('cash', 'mpesa', 'airtel', 'mixx');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.earning_status as enum ('pending', 'available', 'paid', 'reversed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payout_status as enum ('requested', 'processing', 'paid', 'rejected', 'failed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_channel as enum ('in_app', 'push', 'sms');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.support_status as enum ('open', 'in_review', 'waiting_customer', 'resolved', 'closed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.support_priority as enum ('low', 'normal', 'high', 'urgent');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.discount_type as enum ('percentage', 'fixed_amount');
exception when duplicate_object then null;
end $$;

comment on type public.user_role is
  'Authorization role. platform_owner is bootstrapped out-of-band and never assigned from client metadata.';
