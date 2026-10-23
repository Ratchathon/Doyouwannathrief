-- Item photo storage. Files are public to read (they appear on listings);
-- only a shop's owner can write files for that shop's own items.
-- Path format mirrors photoPath() in src/lib/products/photos.ts:
--   <shop uuid>/<item uuid>/<kind>-<uuid>.webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880, array['image/webp'])
on conflict (id) do nothing;

create function public.can_write_photo(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  uuid_re constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  parts text[];
begin
  parts := regexp_match(
    object_name,
    '^(' || uuid_re || ')/(' || uuid_re || ')/(front|back|label|flaw|extra)-' || uuid_re || '\.webp$'
  );
  if parts is null then
    return false;
  end if;

  return exists (
    select 1
    from public.products p
    join public.shops s on s.id = p.shop_id
    where s.id = parts[1]::uuid and p.id = parts[2]::uuid and s.owner_id = auth.uid()
  );
end;
$$;

grant execute on function public.can_write_photo(text) to authenticated;

create policy "Shop owners upload photos of their own items"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and public.can_write_photo(name));

create policy "Shop owners replace photos of their own items"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-photos' and public.can_write_photo(name))
  with check (bucket_id = 'product-photos' and public.can_write_photo(name));

create policy "Shop owners delete photos of their own items"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and public.can_write_photo(name));

-- Deleting needs the row to be visible first.
create policy "Shop owners see their own photo files"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-photos' and public.can_write_photo(name));
