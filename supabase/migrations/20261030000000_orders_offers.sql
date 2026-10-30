-- Orders (demo payment), offers with counter rounds, and in-site notifications.
--
-- Rules (PRODUCT.md):
--   * one live offer per item; a new offer must beat it; the beaten buyer is told
--     and may offer again; at most 3 offers per buyer per item;
--   * the floor is 75% of the price unless the shop sets it higher; it is never shown;
--   * the shop answers within 24 hours; up to 3 counter rounds, 24 hours each;
--   * an accepted offer (or BUY NOW) reserves the item for 10 hours of payment.
-- Deadlines are stored as timestamps and enforced lazily: expire_stale() runs at
-- the start of every offer and order function, and pages call it before reading.
-- Payment is a demo: pay_order() marks an order paid without moving money.

create type public.order_status as enum ('awaiting_payment', 'paid', 'shipped', 'completed', 'cancelled');
create type public.offer_status as enum (
  'pending_shop', 'countered', 'accepted', 'rejected', 'outbid', 'expired', 'withdrawn', 'closed'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  amount_satang integer not null check (amount_satang > 0),
  counter_satang integer check (counter_satang > 0),
  counter_rounds integer not null default 0 check (counter_rounds between 0 and 3),
  status public.offer_status not null default 'pending_shop',
  respond_by timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index offers_product_idx on public.offers (product_id, status);
create index offers_buyer_idx on public.offers (buyer_id, created_at desc);
create unique index offers_one_live_per_item on public.offers (product_id)
  where status in ('pending_shop', 'countered');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  price_satang integer not null check (price_satang > 0),
  status public.order_status not null default 'awaiting_payment',
  pay_by timestamptz not null,
  tracking_number text check (tracking_number is null or char_length(trim(tracking_number)) between 4 and 40),
  paid_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_shop_idx on public.orders (shop_id, created_at desc);
create unique index orders_one_open_per_item on public.orders (product_id)
  where status <> 'cancelled';

-- Kept out of products so the public can never read it.
create table public.product_offer_floors (
  product_id uuid primary key references public.products (id) on delete cascade,
  floor_satang integer not null check (floor_satang > 0)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  body text not null,
  href text not null,
  read_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Access: read-only to the people involved; every change goes through functions.
-- ---------------------------------------------------------------------------

alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table public.product_offer_floors enable row level security;
alter table public.notifications enable row level security;

grant select on public.offers, public.orders, public.notifications to authenticated;

create policy "Buyers and the shop see an offer"
  on public.offers for select to authenticated
  using (buyer_id = auth.uid() or public.owns_product(product_id) or public.is_admin());

create policy "Buyers and the shop see an order"
  on public.orders for select to authenticated
  using (buyer_id = auth.uid() or public.owns_shop(shop_id) or public.is_admin());

create policy "People see their own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

-- No policies on product_offer_floors: only the functions below read it.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.notify(p_user uuid, p_kind text, p_body text, p_href text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, body, href) values (p_user, p_kind, p_body, p_href);
$$;

create function public.baht(p_satang integer) returns text
language sql immutable set search_path = '' as $$
  select '฿' || to_char(p_satang / 100, 'FM999,999,990');
$$;

create function public.offer_floor(p_product uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select floor_satang from public.product_offer_floors where product_id = p_product),
    (select ceil(price_satang * 0.75)::integer from public.products where id = p_product)
  );
$$;

create function public.shop_owner_of(p_product uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select s.owner_id from public.products p join public.shops s on s.id = p.shop_id where p.id = p_product;
$$;

create function public.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

-- Ends everything past its deadline. Safe to call from anywhere, any time.
create function public.expire_stale() returns void
language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in
    update public.offers o set status = 'expired', updated_at = now()
    where o.status in ('pending_shop', 'countered') and o.respond_by < now()
    returning o.id, o.product_id, o.buyer_id, o.status
  loop
    perform public.notify(r.buyer_id, 'offer_expired', 'ข้อเสนอของคุณหมดเวลาแล้ว ยื่นใหม่ได้ถ้าของยังอยู่',
      '/account/offers');
  end loop;

  for r in
    update public.orders o set status = 'cancelled', cancelled_at = now()
    where o.status = 'awaiting_payment' and o.pay_by < now()
    returning o.id, o.product_id, o.buyer_id
  loop
    update public.products set status = 'active' where id = r.product_id and status = 'reserved';
    perform public.notify(r.buyer_id, 'order_expired', 'หมดเวลาชำระเงิน ของกลับไปขายต่อแล้ว', '/account/orders');
  end loop;
end;
$$;

-- Opens a demo order and reserves the item. Closes any live offer on it.
create function public.open_order(p_product uuid, p_buyer uuid, p_price integer, p_offer uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_order uuid;
  v_shop uuid;
  r record;
begin
  select shop_id into v_shop from public.products where id = p_product;
  update public.products set status = 'reserved' where id = p_product;
  insert into public.orders (product_id, buyer_id, shop_id, offer_id, price_satang, pay_by)
  values (p_product, p_buyer, v_shop, p_offer, p_price, now() + interval '10 hours')
  returning id into v_order;

  for r in
    update public.offers set status = 'closed', updated_at = now()
    where product_id = p_product and status in ('pending_shop', 'countered') and id is distinct from p_offer
    returning buyer_id
  loop
    perform public.notify(r.buyer_id, 'offer_closed', 'ของที่คุณยื่นข้อเสนอไว้ มีคนซื้อไปแล้ว', '/account/offers');
  end loop;
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create function public.buy_now(p_product uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.require_user();
  v_item record;
begin
  perform public.expire_stale();
  select p.id, p.status, p.price_satang, s.owner_id, s.status as shop_status into v_item
  from public.products p join public.shops s on s.id = p.shop_id where p.id = p_product for update of p;

  if not found or v_item.shop_status <> 'approved' or v_item.status <> 'active' then
    raise exception 'This item is not on sale' using errcode = 'P0001';
  end if;
  if v_item.owner_id = v_user then
    raise exception 'You cannot buy your own item' using errcode = 'P0001';
  end if;
  return public.open_order(p_product, v_user, v_item.price_satang, null);
end;
$$;

create function public.pay_order(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.require_user();
  v_order record;
begin
  perform public.expire_stale();
  select * into v_order from public.orders where id = p_order for update;
  if not found or v_order.buyer_id <> v_user then
    raise exception 'This is not your order' using errcode = 'P0001';
  end if;
  if v_order.status <> 'awaiting_payment' then
    raise exception 'This order is no longer waiting for payment' using errcode = 'P0001';
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = p_order;
  update public.products set status = 'sold', sold_at = now() where id = v_order.product_id;
  perform public.notify((select owner_id from public.shops where id = v_order.shop_id), 'order_paid',
    'มีคำสั่งซื้อจ่ายแล้ว ' || public.baht(v_order.price_satang) || ' แพ็กของแล้วใส่เลขพัสดุ', '/sell/orders');
end;
$$;

create function public.cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.require_user();
  v_order record;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found or v_order.buyer_id <> v_user then
    raise exception 'This is not your order' using errcode = 'P0001';
  end if;
  if v_order.status <> 'awaiting_payment' then
    raise exception 'Only an unpaid order can be cancelled' using errcode = 'P0001';
  end if;
  update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order;
  update public.products set status = 'active' where id = v_order.product_id and status = 'reserved';
end;
$$;

create function public.ship_order(p_order uuid, p_tracking text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.require_user();
  v_order record;
begin
  select o.*, s.owner_id into v_order
  from public.orders o join public.shops s on s.id = o.shop_id where o.id = p_order for update of o;
  if not found or v_order.owner_id <> v_user then
    raise exception 'This is not your order' using errcode = 'P0001';
  end if;
  if v_order.status <> 'paid' then
    raise exception 'Only a paid order can be shipped' using errcode = 'P0001';
  end if;
  update public.orders set status = 'shipped', shipped_at = now(), tracking_number = trim(p_tracking) where id = p_order;
  perform public.notify(v_order.buyer_id, 'order_shipped', 'ร้านส่งของแล้ว เลขพัสดุ ' || trim(p_tracking), '/account/orders');
end;
$$;

create function public.confirm_received(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.require_user();
  v_order record;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found or v_order.buyer_id <> v_user then
    raise exception 'This is not your order' using errcode = 'P0001';
  end if;
  if v_order.status <> 'shipped' then
    raise exception 'Only a shipped order can be confirmed' using errcode = 'P0001';
  end if;
  update public.orders set status = 'completed', completed_at = now() where id = p_order;
  perform public.notify((select owner_id from public.shops where id = v_order.shop_id), 'order_completed',
    'ผู้ซื้อได้ของแล้ว เงิน ' || public.baht(v_order.price_satang) || ' โอนเข้าร้าน (เดโม)', '/sell/orders');
end;
$$;

-- ---------------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------------

create function public.set_offer_floor(p_product uuid, p_floor integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.require_user();
  v_price integer;
begin
  if public.shop_owner_of(p_product) is distinct from v_user then
    raise exception 'This is not your item' using errcode = 'P0001';
  end if;
  select price_satang into v_price from public.products where id = p_product;
  if p_floor < ceil(v_price * 0.75) or p_floor > v_price then
    raise exception 'The floor must be at least 75%% of the price and not above it' using errcode = 'P0001';
  end if;
  insert into public.product_offer_floors (product_id, floor_satang) values (p_product, p_floor)
  on conflict (product_id) do update set floor_satang = excluded.floor_satang;
end;
$$;

-- Returns 'pending' when the offer is now waiting for the shop, or
-- 'below_floor' when it was turned away (that still counts as one of the 3).
create function public.make_offer(p_product uuid, p_amount integer) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.require_user();
  v_item record;
  v_live record;
begin
  perform public.expire_stale();
  select p.id, p.status, p.price_satang, s.owner_id, s.status as shop_status into v_item
  from public.products p join public.shops s on s.id = p.shop_id where p.id = p_product for update of p;

  if not found or v_item.shop_status <> 'approved' or v_item.status <> 'active' then
    raise exception 'This item is not on sale' using errcode = 'P0001';
  end if;
  if v_item.owner_id = v_user then
    raise exception 'You cannot make an offer on your own item' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount >= v_item.price_satang then
    raise exception 'An offer must be below the price' using errcode = 'P0001';
  end if;
  if (select count(*) from public.offers where product_id = p_product and buyer_id = v_user) >= 3 then
    raise exception 'You have used your 3 offers on this item' using errcode = 'P0001';
  end if;

  select * into v_live from public.offers
  where product_id = p_product and status in ('pending_shop', 'countered') for update;
  if found and p_amount <= v_live.amount_satang then
    raise exception 'A new offer must beat the current one' using errcode = 'P0001';
  end if;

  if p_amount < public.offer_floor(p_product) then
    insert into public.offers (product_id, buyer_id, amount_satang, status)
    values (p_product, v_user, p_amount, 'rejected');
    return 'below_floor';
  end if;

  if v_live.id is not null then
    update public.offers set status = 'outbid', updated_at = now() where id = v_live.id;
    if v_live.buyer_id <> v_user then
      perform public.notify(v_live.buyer_id, 'offer_outbid',
        'มีคนยื่นข้อเสนอสูงกว่าคุณ ยื่นใหม่ได้ถ้ายังไม่ครบ 3 ครั้ง', '/account/offers');
    end if;
  end if;

  insert into public.offers (product_id, buyer_id, amount_satang, respond_by)
  values (p_product, v_user, p_amount, now() + interval '24 hours');
  perform public.notify(v_item.owner_id, 'offer_received',
    'มีข้อเสนอใหม่ ' || public.baht(p_amount) || ' ตอบภายใน 24 ชั่วโมง', '/sell/offers');
  return 'pending';
end;
$$;

-- The shop's answer: 'accept' (returns the new order id), 'reject', or 'counter'.
create function public.respond_offer(p_offer uuid, p_action text, p_counter integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.require_user();
  v_offer record;
  v_price integer;
begin
  perform public.expire_stale();
  select * into v_offer from public.offers where id = p_offer for update;
  if not found or public.shop_owner_of(v_offer.product_id) is distinct from v_user then
    raise exception 'This is not your offer to answer' using errcode = 'P0001';
  end if;
  if v_offer.status <> 'pending_shop' then
    raise exception 'This offer is no longer waiting for you' using errcode = 'P0001';
  end if;

  if p_action = 'accept' then
    update public.offers set status = 'accepted', respond_by = null, updated_at = now() where id = p_offer;
    perform public.notify(v_offer.buyer_id, 'offer_accepted',
      'ร้านรับข้อเสนอ ' || public.baht(v_offer.amount_satang) || ' แล้ว จ่ายภายใน 10 ชั่วโมง', '/account/orders');
    return public.open_order(v_offer.product_id, v_offer.buyer_id, v_offer.amount_satang, p_offer);
  elsif p_action = 'reject' then
    update public.offers set status = 'rejected', respond_by = null, updated_at = now() where id = p_offer;
    perform public.notify(v_offer.buyer_id, 'offer_rejected', 'ร้านไม่รับข้อเสนอนี้', '/account/offers');
    return null;
  elsif p_action = 'counter' then
    if v_offer.counter_rounds >= 3 then
      raise exception 'You have used all 3 counter rounds; accept or reject' using errcode = 'P0001';
    end if;
    select price_satang into v_price from public.products where id = v_offer.product_id;
    if p_counter is null or p_counter <= v_offer.amount_satang or p_counter > v_price then
      raise exception 'A counter must be above the offer and not above the price' using errcode = 'P0001';
    end if;
    update public.offers
    set status = 'countered', counter_satang = p_counter, counter_rounds = counter_rounds + 1,
        respond_by = now() + interval '24 hours', updated_at = now()
    where id = p_offer;
    perform public.notify(v_offer.buyer_id, 'offer_countered',
      'ร้านเสนอกลับ ' || public.baht(p_counter) || ' ตอบภายใน 24 ชั่วโมง', '/account/offers');
    return null;
  end if;
  raise exception 'Unknown answer' using errcode = 'P0001';
end;
$$;

-- The buyer's answer to a counter: 'accept' (returns the order id), 'decline', or 'raise'.
create function public.answer_counter(p_offer uuid, p_action text, p_amount integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.require_user();
  v_offer record;
begin
  perform public.expire_stale();
  select * into v_offer from public.offers where id = p_offer for update;
  if not found or v_offer.buyer_id <> v_user then
    raise exception 'This is not your offer' using errcode = 'P0001';
  end if;
  if v_offer.status <> 'countered' then
    raise exception 'There is no counter waiting for you' using errcode = 'P0001';
  end if;

  if p_action = 'accept' then
    update public.offers set status = 'accepted', amount_satang = counter_satang, respond_by = null, updated_at = now()
    where id = p_offer;
    perform public.notify(public.shop_owner_of(v_offer.product_id), 'offer_accepted',
      'ผู้ซื้อรับราคา ' || public.baht(v_offer.counter_satang) || ' รอผู้ซื้อจ่ายเงิน', '/sell/orders');
    return public.open_order(v_offer.product_id, v_user, v_offer.counter_satang, p_offer);
  elsif p_action = 'decline' then
    update public.offers set status = 'withdrawn', respond_by = null, updated_at = now() where id = p_offer;
    return null;
  elsif p_action = 'raise' then
    if p_amount is null or p_amount <= v_offer.amount_satang or p_amount >= v_offer.counter_satang then
      raise exception 'A raise must be above your offer and below the shop''s counter' using errcode = 'P0001';
    end if;
    update public.offers set status = 'pending_shop', amount_satang = p_amount,
      respond_by = now() + interval '24 hours', updated_at = now()
    where id = p_offer;
    perform public.notify(public.shop_owner_of(v_offer.product_id), 'offer_received',
      'ผู้ซื้อขยับราคาเป็น ' || public.baht(p_amount) || ' ตอบภายใน 24 ชั่วโมง', '/sell/offers');
    return null;
  end if;
  raise exception 'Unknown answer' using errcode = 'P0001';
end;
$$;

create function public.withdraw_offer(p_offer uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.offers set status = 'withdrawn', respond_by = null, updated_at = now()
  where id = p_offer and buyer_id = public.require_user() and status in ('pending_shop', 'countered');
  if not found then
    raise exception 'There is no open offer to withdraw' using errcode = 'P0001';
  end if;
end;
$$;

create function public.mark_notifications_read() returns integer
language sql security definer set search_path = '' as $$
  with done as (
    update public.notifications set read_at = now()
    where user_id = public.require_user() and read_at is null
    returning 1
  )
  select count(*)::integer from done;
$$;

revoke execute on function
  public.notify(uuid, text, text, text),
  public.open_order(uuid, uuid, integer, uuid),
  public.offer_floor(uuid)
from public, anon, authenticated;

grant execute on function
  public.expire_stale(),
  public.buy_now(uuid),
  public.pay_order(uuid),
  public.cancel_order(uuid),
  public.ship_order(uuid, text),
  public.confirm_received(uuid),
  public.set_offer_floor(uuid, integer),
  public.make_offer(uuid, integer),
  public.respond_offer(uuid, text, integer),
  public.answer_counter(uuid, text, integer),
  public.withdraw_offer(uuid),
  public.mark_notifications_read()
to authenticated;

-- New top-level pages a shop must not take as its address.
create or replace function public.reserved_slugs() returns text[]
language sql immutable set search_path = '' as $$
  select array[
    'about',
    'account',
    'admin',
    'api',
    'assets',
    'auth',
    'cart',
    'categories',
    'category',
    'checkout',
    'contact',
    'dashboard',
    'discover',
    'faq',
    'favicon',
    'forgot-password',
    'help',
    'how-it-works',
    'images',
    'login',
    'logout',
    'notifications',
    'null',
    'offers',
    'orders',
    'privacy',
    'product',
    'products',
    'public',
    'register',
    'report',
    'reports',
    'robots',
    'search',
    'sell',
    'seller',
    'settings',
    'shop',
    'shops',
    'signup',
    'sitemap',
    'static',
    'style',
    'styles',
    'support',
    'terms',
    'undefined',
    'www'
  ]::text[];
$$;
