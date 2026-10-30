-- Supabase refuses DELETE without a WHERE clause on API requests (pg-safeupdate),
-- so reset_demo failed in production. Same behaviour, explicit WHERE clauses.

create or replace function public.reset_demo() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_items uuid[];
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reset the demo' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct product_id), '{}') into v_items from public.orders;

  delete from public.orders where true;
  delete from public.offers where true;
  delete from public.notifications where true;
  delete from public.product_offer_floors where true;

  update public.products set status = 'active', sold_at = null
  where id = any (v_items) and status in ('reserved', 'sold');
end;
$$;
