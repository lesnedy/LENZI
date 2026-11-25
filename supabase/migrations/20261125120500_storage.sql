-- LENZI 0006 — storage buckets and object policies
-- Bucket paths are namespaced by auth.uid(): <bucket>/<user-id>/<file>.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('driver-documents', 'driver-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('vehicle-photos', 'vehicle-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('support-attachments', 'support-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Avatars: public read, owner-only write.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Driver documents: owner and platform owner only. Never public.
drop policy if exists "driver_documents_owner_read" on storage.objects;
create policy "driver_documents_owner_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'driver-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or private.is_platform_owner()
    )
  );

drop policy if exists "driver_documents_owner_insert" on storage.objects;
create policy "driver_documents_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "driver_documents_admin_all" on storage.objects;
create policy "driver_documents_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'driver-documents' and private.is_platform_owner())
  with check (bucket_id = 'driver-documents' and private.is_platform_owner());

-- Vehicle photos: owner and platform owner only.
drop policy if exists "vehicle_photos_owner_read" on storage.objects;
create policy "vehicle_photos_owner_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or private.is_platform_owner()
    )
  );

drop policy if exists "vehicle_photos_owner_insert" on storage.objects;
create policy "vehicle_photos_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehicle-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "vehicle_photos_admin_all" on storage.objects;
create policy "vehicle_photos_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'vehicle-photos' and private.is_platform_owner())
  with check (bucket_id = 'vehicle-photos' and private.is_platform_owner());

-- Support attachments: owner and platform owner only.
drop policy if exists "support_attachments_owner_read" on storage.objects;
create policy "support_attachments_owner_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or private.is_platform_owner()
    )
  );

drop policy if exists "support_attachments_owner_insert" on storage.objects;
create policy "support_attachments_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "support_attachments_admin_all" on storage.objects;
create policy "support_attachments_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'support-attachments' and private.is_platform_owner())
  with check (bucket_id = 'support-attachments' and private.is_platform_owner());
