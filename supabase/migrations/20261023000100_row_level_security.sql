-- Who can read and write what.
--
-- Two layers work together:
--   1. Column grants decide WHICH columns a role may write at all. Status,
--      commission, roles and admin fields are never writable from the browser;
--      they change only through admin functions added in later migrations.
--   2. Row level security policies decide WHICH rows a user may see or touch.
--
-- Supabase grants every privilege to anon/authenticated by default, so we
-- revoke everything first and grant back only what is needed.

revoke all on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helper functions. SECURITY DEFINER so policies can check ownership without
-- recursively triggering the policies of the tables they read.
-- ---------------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create function public.owns_shop(target_shop_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shops where id = target_shop_id and owner_id = auth.uid()
  );
$$;

create function public.owns_approved_shop(target_shop_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shops
    where id = target_shop_id and owner_id = auth.uid() and status = 'approved'
  );
$$;

create function public.owns_product(target_product_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = target_product_id and s.owner_id = auth.uid()
  );
$$;

-- A product the public may see: listed (not draft) and its shop is approved.
create function public.is_public_product(target_product_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.products p
    join public.shops s on s.id = p.shop_id
    where p.id = target_product_id and p.status <> 'draft' and s.status = 'approved'
  );
$$;

grant execute on function
  public.is_admin(), public.owns_shop(uuid), public.owns_approved_shop(uuid),
  public.owns_product(uuid), public.is_public_product(uuid)
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "Users read their own profile; admins read all"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- shops
-- ---------------------------------------------------------------------------

alter table public.shops enable row level security;

grant select on public.shops to anon, authenticated;
grant insert (owner_id, slug, display_name, province, bio) on public.shops to authenticated;
grant update (display_name, province, bio) on public.shops to authenticated;

create policy "Approved shops are public; owners and admins see the rest"
  on public.shops for select to anon, authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());

create policy "Users apply for a shop as themselves"
  on public.shops for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Owners edit their own shop"
  on public.shops for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- shop_terms: owners read their own deal; only admins change it (later, via
-- an admin function), so there is no write grant at all.
-- ---------------------------------------------------------------------------

alter table public.shop_terms enable row level security;

grant select on public.shop_terms to authenticated;

create policy "Owners read their own terms; admins read all"
  on public.shop_terms for select to authenticated
  using (public.owns_shop(shop_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

alter table public.products enable row level security;

grant select on public.products to anon, authenticated;
grant insert (
  shop_id, title, brand, description, category, size_label, price_satang,
  condition, has_flaws, flaws_note, chest_cm, length_cm, shoulder_cm, waist_cm, status
) on public.products to authenticated;
grant update (
  title, brand, description, category, size_label, price_satang,
  condition, has_flaws, flaws_note, chest_cm, length_cm, shoulder_cm, waist_cm, status, sold_at
) on public.products to authenticated;
grant delete on public.products to authenticated;

create policy "Listed items of approved shops are public; owners and admins see all"
  on public.products for select to anon, authenticated
  using (
    (status <> 'draft' and exists (
      select 1 from public.shops s where s.id = shop_id and s.status = 'approved'
    ))
    or public.owns_shop(shop_id)
    or public.is_admin()
  );

-- 'reserved' is set only by the offer system, never directly by a shop.
create policy "Approved shops add their own items"
  on public.products for insert to authenticated
  with check (public.owns_approved_shop(shop_id) and status in ('draft', 'active'));

create policy "Owners edit their own items"
  on public.products for update to authenticated
  using (public.owns_shop(shop_id))
  with check (public.owns_shop(shop_id) and status in ('draft', 'active', 'sold'));

create policy "Owners delete their own items"
  on public.products for delete to authenticated
  using (public.owns_shop(shop_id));

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------

alter table public.product_images enable row level security;

grant select on public.product_images to anon, authenticated;
grant insert (product_id, kind, storage_path, position) on public.product_images to authenticated;
grant update (position) on public.product_images to authenticated;
grant delete on public.product_images to authenticated;

create policy "Photos follow their product's visibility"
  on public.product_images for select to anon, authenticated
  using (
    public.is_public_product(product_id) or public.owns_product(product_id) or public.is_admin()
  );

create policy "Owners add photos to their own items"
  on public.product_images for insert to authenticated
  with check (public.owns_product(product_id));

create policy "Owners reorder photos of their own items"
  on public.product_images for update to authenticated
  using (public.owns_product(product_id))
  with check (public.owns_product(product_id));

create policy "Owners remove photos of their own items"
  on public.product_images for delete to authenticated
  using (public.owns_product(product_id));

-- ---------------------------------------------------------------------------
-- styles (read-only from the browser; managed by admins in the dashboard)
-- ---------------------------------------------------------------------------

alter table public.styles enable row level security;

grant select on public.styles to anon, authenticated;

create policy "Styles are public"
  on public.styles for select to anon, authenticated
  using (true);

alter table public.product_styles enable row level security;

grant select, insert, delete on public.product_styles to authenticated;
grant select on public.product_styles to anon;

create policy "Item styles follow their item's visibility"
  on public.product_styles for select to anon, authenticated
  using (
    public.is_public_product(product_id) or public.owns_product(product_id) or public.is_admin()
  );

create policy "Owners tag their own items"
  on public.product_styles for insert to authenticated
  with check (public.owns_product(product_id));

create policy "Owners untag their own items"
  on public.product_styles for delete to authenticated
  using (public.owns_product(product_id));

alter table public.shop_styles enable row level security;

grant select, insert, delete on public.shop_styles to authenticated;
grant select on public.shop_styles to anon;

create policy "Shop styles follow their shop's visibility"
  on public.shop_styles for select to anon, authenticated
  using (
    exists (select 1 from public.shops s where s.id = shop_id and s.status = 'approved')
    or public.owns_shop(shop_id)
    or public.is_admin()
  );

create policy "Owners tag their own shop"
  on public.shop_styles for insert to authenticated
  with check (public.owns_shop(shop_id));

create policy "Owners untag their own shop"
  on public.shop_styles for delete to authenticated
  using (public.owns_shop(shop_id));

-- ---------------------------------------------------------------------------
-- reports (admin handling happens through admin functions later)
-- ---------------------------------------------------------------------------

alter table public.reports enable row level security;

grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, product_id, shop_id, reason, details)
  on public.reports to authenticated;

create policy "Reporters see their own reports; admins see all"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy "Signed-in users report as themselves"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
