-- Resets the demo: every order, offer, notification and offer floor is cleared,
-- and items bought through the demo go back on sale. Items the sample data
-- itself marks sold stay sold. The whole site is a demo, so this is safe. Admins only.

create function public.reset_demo() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_items uuid[];
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reset the demo' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct product_id), '{}') into v_items from public.orders;

  delete from public.orders;
  delete from public.offers;
  delete from public.notifications;
  delete from public.product_offer_floors;

  update public.products set status = 'active', sold_at = null
  where id = any (v_items) and status in ('reserved', 'sold');
end;
$$;

revoke execute on function public.reset_demo() from public, anon;
grant execute on function public.reset_demo() to authenticated;
