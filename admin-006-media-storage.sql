-- Imagens públicas da vitrine; somente administradores podem gravar arquivos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blackout-media', 'blackout-media', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "blackout_media_public_read"
on storage.objects for select to anon, authenticated
using (bucket_id = 'blackout-media');

create policy "blackout_media_admin_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'blackout-media' and public.is_admin());

create policy "blackout_media_admin_update"
on storage.objects for update to authenticated
using (bucket_id = 'blackout-media' and public.is_admin())
with check (bucket_id = 'blackout-media' and public.is_admin());

create policy "blackout_media_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'blackout-media' and public.is_admin());
