-- Initial schema: people, shops, products, photos, styles and problem reports.
-- Money is stored in satang (1 baht = 100 satang) as integers to avoid rounding errors.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('buyer', 'admin');
create type public.shop_status as enum ('pending', 'approved', 'rejected');
create type public.product_category as enum (
  'tops', 'outerwear', 'bottoms', 'dresses', 'shoes', 'bags', 'accessories', 'headwear'
);
create type public.product_condition as enum ('like_new', 'good', 'fair');
create type public.product_status as enum ('draft', 'active', 'reserved', 'sold');
create type public.image_kind as enum ('front', 'back', 'label', 'flaw', 'extra');
create type public.report_target as enum ('product', 'shop', 'website');
create type public.report_reason as enum (
  'counterfeit', 'not_as_described', 'prohibited_item', 'shop_behavior', 'bug', 'other'
);
create type public.report_status as enum ('open', 'in_review', 'closed');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles: one per auth user, created automatically on sign-up
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role public.user_role not null default 'buyer',
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Shops
-- ---------------------------------------------------------------------------

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  -- English URL part, e.g. /tuekdaeng. Thai name lives in display_name.
  slug text not null unique
    check (char_length(slug) between 3 and 30 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  province text not null check (char_length(trim(province)) > 0),
  bio text not null default '',
  status public.shop_status not null default 'pending',
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rejected_needs_reason
    check (status <> 'rejected' or nullif(trim(rejection_reason), '') is not null)
);

create index shops_status_idx on public.shops (status);

create trigger shops_touch_updated_at
  before update on public.shops
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Shop terms: the business deal between the platform and a shop. Kept in its
-- own table so it can be private while the shop profile stays public.
-- The rate in force is snapshotted onto each order (phase 2).
-- ---------------------------------------------------------------------------

create table public.shop_terms (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  -- Standard rate is a placeholder until the founder sets pricing.
  commission_rate numeric(5, 4) not null default 0.10 check (commission_rate between 0 and 1),
  promo_commission_rate numeric(5, 4) check (promo_commission_rate between 0 and 1),
  promo_ends_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint promo_rate_and_end_together
    check ((promo_commission_rate is null) = (promo_ends_at is null))
);

create function public.create_shop_terms() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.shop_terms (shop_id) values (new.id);
  return new;
end;
$$;

create trigger shops_create_terms
  after insert on public.shops
  for each row execute function public.create_shop_terms();

create trigger shop_terms_touch_updated_at
  before update on public.shop_terms
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  brand text check (brand is null or char_length(trim(brand)) between 1 and 60),
  description text not null default '',
  category public.product_category not null,
  size_label text not null check (char_length(trim(size_label)) between 1 and 20),
  price_satang integer not null check (price_satang > 0),
  condition public.product_condition not null,
  has_flaws boolean not null,
  flaws_note text,
  chest_cm numeric(5, 1) check (chest_cm > 0),
  length_cm numeric(5, 1) check (length_cm > 0),
  shoulder_cm numeric(5, 1) check (shoulder_cm > 0),
  waist_cm numeric(5, 1) check (waist_cm > 0),
  status public.product_status not null default 'draft',
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sold_needs_timestamp check (status <> 'sold' or sold_at is not null)
);

create index products_shop_status_idx on public.products (shop_id, status);
create index products_status_created_idx on public.products (status, created_at desc);

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Product photos. Front, back and label: exactly one each (enforced fully at
-- publish time in the app). Flaw and extra: any number.
-- ---------------------------------------------------------------------------

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind public.image_kind not null,
  storage_path text not null,
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create unique index product_images_one_required_kind
  on public.product_images (product_id, kind)
  where kind in ('front', 'back', 'label');

create index product_images_product_idx on public.product_images (product_id, kind, position);

-- ---------------------------------------------------------------------------
-- Styles: admin-defined list, at most 3 per product and per shop
-- ---------------------------------------------------------------------------

create table public.styles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_th text not null check (char_length(trim(name_th)) > 0),
  name_en text not null check (char_length(trim(name_en)) > 0),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

insert into public.styles (slug, name_th, name_en, position) values
  ('streetwear', 'สตรีทแวร์', 'Streetwear', 1),
  ('vintage', 'วินเทจ', 'Vintage', 2),
  ('designer', 'แบรนด์เนม', 'Designer', 3),
  ('y2k', 'Y2K', 'Y2K', 4),
  ('korean-japanese', 'เกาหลี-ญี่ปุ่น', 'Korean & Japanese', 5),
  ('workwear', 'เวิร์กแวร์', 'Workwear', 6);

create table public.product_styles (
  product_id uuid not null references public.products (id) on delete cascade,
  style_id uuid not null references public.styles (id) on delete cascade,
  primary key (product_id, style_id)
);

create index product_styles_style_idx on public.product_styles (style_id);

create table public.shop_styles (
  shop_id uuid not null references public.shops (id) on delete cascade,
  style_id uuid not null references public.styles (id) on delete cascade,
  primary key (shop_id, style_id)
);

create index shop_styles_style_idx on public.shop_styles (style_id);

-- Locks the parent row first so two simultaneous inserts cannot both slip past the limit.
create function public.enforce_style_limit() returns trigger
language plpgsql set search_path = '' as $$
declare
  current_count integer;
begin
  if tg_table_name = 'product_styles' then
    perform 1 from public.products where id = new.product_id for update;
    select count(*) into current_count from public.product_styles where product_id = new.product_id;
  else
    perform 1 from public.shops where id = new.shop_id for update;
    select count(*) into current_count from public.shop_styles where shop_id = new.shop_id;
  end if;

  if current_count >= 3 then
    raise exception 'A % can have at most 3 styles', replace(tg_table_name, '_styles', '')
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger product_styles_limit
  before insert on public.product_styles
  for each row execute function public.enforce_style_limit();

create trigger shop_styles_limit
  before insert on public.shop_styles
  for each row execute function public.enforce_style_limit();

-- ---------------------------------------------------------------------------
-- Problem reports. A reported product cannot be deleted (keeps the evidence).
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  product_id uuid references public.products (id) on delete restrict,
  shop_id uuid references public.shops (id) on delete restrict,
  reason public.report_reason not null,
  details text not null check (char_length(trim(details)) between 10 and 2000),
  status public.report_status not null default 'open',
  admin_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint target_matches_type check (
    (target_type = 'product' and product_id is not null and shop_id is null)
    or (target_type = 'shop' and shop_id is not null and product_id is null)
    or (target_type = 'website' and product_id is null and shop_id is null)
  ),
  constraint closed_needs_timestamp check (status <> 'closed' or resolved_at is not null)
);

create index reports_status_created_idx on public.reports (status, created_at);

create trigger reports_touch_updated_at
  before update on public.reports
  for each row execute function public.touch_updated_at();
