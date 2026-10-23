-- Listing rules enforced in the database, so they hold whatever the client does:
--   * an item goes on sale only with front, back and label photos, plus a flaw
--     photo when it has flaws;
--   * required photos of an item on sale cannot be deleted (replace them in place);
--   * only an item that was on sale can be marked sold.
-- Mirrors missingPhotos() in src/lib/products/listing.ts.

create function public.listing_photos_complete(p_product_id uuid, p_has_flaws boolean)
returns boolean
language sql stable security definer set search_path = '' as $$
  select
    (select count(distinct kind) from public.product_images
      where product_id = p_product_id and kind in ('front', 'back', 'label')) = 3
    and (not p_has_flaws or exists (
      select 1 from public.product_images where product_id = p_product_id and kind = 'flaw'
    ));
$$;

create function public.check_listing_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'active' and not public.listing_photos_complete(new.id, new.has_flaws) then
    raise exception 'Add front, back and label photos (and a flaw photo if it has flaws) before listing'
      using errcode = 'check_violation';
  end if;

  if new.status = 'sold'
     and (tg_op = 'INSERT' or old.status not in ('active', 'reserved', 'sold')) then
    raise exception 'Only an item that was on sale can be marked sold' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger products_listing_rules
  before insert or update on public.products
  for each row execute function public.check_listing_rules();

create function public.protect_listed_photos() returns trigger
language plpgsql set search_path = '' as $$
declare
  item record;
begin
  -- When the whole item is being deleted, the item row is already gone here.
  select status, has_flaws into item from public.products where id = old.product_id;
  if not found or item.status not in ('active', 'reserved') then
    return old;
  end if;

  if old.kind in ('front', 'back', 'label') then
    raise exception 'Replace this photo instead of deleting it while the item is on sale'
      using errcode = 'check_violation';
  end if;

  if old.kind = 'flaw' and item.has_flaws and not exists (
    select 1 from public.product_images
    where product_id = old.product_id and kind = 'flaw' and id <> old.id
  ) then
    raise exception 'An item with flaws needs at least one flaw photo' using errcode = 'check_violation';
  end if;

  return old;
end;
$$;

create trigger product_images_protect_listed
  before delete on public.product_images
  for each row execute function public.protect_listed_photos();

-- Replacing a photo in place keeps the item on sale.
grant update (storage_path) on public.product_images to authenticated;
