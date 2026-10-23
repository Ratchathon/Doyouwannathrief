-- Saving an item: the item and its styles are written together or not at all.
-- Items that are reserved or sold are frozen, so the buyer gets exactly what
-- they agreed to.

create function public.freeze_committed_items() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status in ('reserved', 'sold') and (
    new.title, new.brand, new.description, new.category, new.size_label, new.price_satang,
    new.condition, new.has_flaws, new.flaws_note, new.chest_cm, new.length_cm,
    new.shoulder_cm, new.waist_cm, new.shop_id
  ) is distinct from (
    old.title, old.brand, old.description, old.category, old.size_label, old.price_satang,
    old.condition, old.has_flaws, old.flaws_note, old.chest_cm, old.length_cm,
    old.shoulder_cm, old.waist_cm, old.shop_id
  ) then
    raise exception 'A reserved or sold item cannot be edited' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger products_freeze_committed
  before update on public.products
  for each row execute function public.freeze_committed_items();

create function public.save_listing(
  p_product_id uuid,
  p_shop_id uuid,
  p_title text,
  p_brand text,
  p_description text,
  p_category public.product_category,
  p_size_label text,
  p_price_satang integer,
  p_condition public.product_condition,
  p_has_flaws boolean,
  p_flaws_note text,
  p_chest_cm numeric,
  p_length_cm numeric,
  p_shoulder_cm numeric,
  p_waist_cm numeric,
  p_style_slugs text[]
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  item_id uuid := p_product_id;
  item_status public.product_status;
  style_ids uuid[];
begin
  if cardinality(p_style_slugs) not between 1 and 3 then
    raise exception 'Choose 1 to 3 styles' using errcode = 'check_violation';
  end if;
  select array_agg(id) into style_ids from public.styles where slug = any (p_style_slugs);
  if coalesce(cardinality(style_ids), 0) <> cardinality(p_style_slugs) then
    raise exception 'Unknown or repeated style' using errcode = 'check_violation';
  end if;

  if item_id is null then
    insert into public.products (
      shop_id, title, brand, description, category, size_label, price_satang,
      condition, has_flaws, flaws_note, chest_cm, length_cm, shoulder_cm, waist_cm
    ) values (
      p_shop_id, p_title, p_brand, coalesce(p_description, ''), p_category, p_size_label, p_price_satang,
      p_condition, p_has_flaws, p_flaws_note, p_chest_cm, p_length_cm, p_shoulder_cm, p_waist_cm
    ) returning id into item_id;
  else
    select status into item_status from public.products where id = item_id;
    if not found or not public.owns_product(item_id) then
      raise exception 'You can only edit your own items' using errcode = 'insufficient_privilege';
    end if;
    if item_status in ('reserved', 'sold') then
      raise exception 'A reserved or sold item cannot be edited' using errcode = 'check_violation';
    end if;

    update public.products set
      title = p_title, brand = p_brand, description = coalesce(p_description, ''),
      category = p_category, size_label = p_size_label, price_satang = p_price_satang,
      condition = p_condition, has_flaws = p_has_flaws, flaws_note = p_flaws_note,
      chest_cm = p_chest_cm, length_cm = p_length_cm, shoulder_cm = p_shoulder_cm, waist_cm = p_waist_cm
    where id = item_id;

    delete from public.product_styles where product_id = item_id;
  end if;

  insert into public.product_styles (product_id, style_id)
    select item_id, unnest(style_ids);

  return item_id;
end;
$$;

revoke execute on function public.save_listing(
  uuid, uuid, text, text, text, public.product_category, text, integer, public.product_condition,
  boolean, text, numeric, numeric, numeric, numeric, text[]
) from public, anon;
grant execute on function public.save_listing(
  uuid, uuid, text, text, text, public.product_category, text, integer, public.product_condition,
  boolean, text, numeric, numeric, numeric, numeric, text[]
) to authenticated;
