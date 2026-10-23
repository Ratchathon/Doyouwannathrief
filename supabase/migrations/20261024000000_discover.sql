-- Discover and search filters:
--   * product_views: who looked at what, one row per visitor per item per day.
--     The visitor is a hashed random id from a cookie; nothing personal is kept.
--     Shop owners viewing their own items are not counted.
--   * trending_products(): items on sale ranked by distinct viewers lately.
--   * search_facets(): sizes present in the current search results.
--   * search_related_shops() now also honours price and size filters.

create table public.product_views (
  product_id uuid not null references public.products (id) on delete cascade,
  day date not null default current_date,
  viewer text not null check (char_length(viewer) between 16 and 128),
  primary key (product_id, day, viewer)
);

create index product_views_day_idx on public.product_views (day, product_id);

alter table public.product_views enable row level security;
revoke all on public.product_views from anon, authenticated;

-- Returns true when this visit was counted.
create function public.record_product_view(p_product_id uuid, p_viewer text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if char_length(coalesce(p_viewer, '')) not between 16 and 128 then
    raise exception 'invalid viewer id' using errcode = '23514';
  end if;
  if not public.is_public_product(p_product_id) or public.owns_product(p_product_id) then
    return false;
  end if;
  insert into public.product_views (product_id, viewer) values (p_product_id, p_viewer)
  on conflict do nothing;
  return found;
end;
$$;

revoke all on function public.record_product_view(uuid, text) from public;
grant execute on function public.record_product_view(uuid, text) to anon, authenticated;

-- Reads the private view log, so it runs as definer and returns only items on sale.
create function public.trending_products(
  p_days integer default 7,
  p_min_views integer default 3,
  p_limit integer default 12
) returns table (
  id uuid,
  title text,
  brand text,
  price_satang integer,
  size_label text,
  condition public.product_condition,
  status public.product_status,
  created_at timestamptz,
  shop_slug text,
  shop_name text,
  province text,
  front_path text,
  views integer
)
language sql stable security definer set search_path = '' as $$
  with counts as (
    select v.product_id, count(*)::integer as n
    from public.product_views v
    where v.day > current_date - least(greatest(coalesce(p_days, 7), 1), 30)
    group by v.product_id
  )
  select
    p.id, p.title, p.brand, p.price_satang, p.size_label, p.condition, p.status, p.created_at,
    s.slug, s.display_name, s.province,
    (select i.storage_path from public.product_images i where i.product_id = p.id and i.kind = 'front' limit 1),
    c.n
  from counts c
  join public.products p on p.id = c.product_id
  join public.shops s on s.id = p.shop_id
  where p.status in ('active', 'reserved')
    and s.status = 'approved'
    and c.n >= greatest(coalesce(p_min_views, 3), 1)
  order by c.n desc, p.created_at desc, p.id
  limit least(greatest(coalesce(p_limit, 12), 1), 60);
$$;

grant execute on function public.trending_products(integer, integer, integer) to anon, authenticated;

-- Sizes available among the current results (ignoring any size filter itself).
create function public.search_facets(
  p_query text default null,
  p_category public.product_category default null,
  p_style text default null,
  p_province text default null,
  p_min_satang integer default null,
  p_max_satang integer default null
) returns table (size_label text, n integer)
language sql stable security invoker set search_path = '' as $$
  select p.size_label, count(*)::integer
  from public.products p
  where p.id in (
    select public.matching_products(p_query, p_category, p_style, p_province, p_min_satang, p_max_satang, null)
  )
  group by p.size_label
  order by count(*) desc, p.size_label
  limit 30;
$$;

grant execute on function public.search_facets(text, public.product_category, text, text, integer, integer)
  to anon, authenticated;

-- Same as before, plus price and size. New parameters go last so existing
-- positional callers (search_suggest) keep working.
drop function public.search_related_shops(text, text, public.product_category, text, integer);

create function public.search_related_shops(
  p_query text default null,
  p_style text default null,
  p_category public.product_category default null,
  p_province text default null,
  p_limit integer default 20,
  p_min_satang integer default null,
  p_max_satang integer default null,
  p_size text default null
) returns table (
  id uuid,
  slug text,
  display_name text,
  province text,
  styles text[],
  match_count integer
)
language sql stable security invoker set search_path = '' as $$
  with matched as (
    select p.shop_id, count(*)::integer as n
    from public.products p
    where p.id in (
      select public.matching_products(p_query, p_category, p_style, p_province, p_min_satang, p_max_satang, p_size)
    )
    group by p.shop_id
  ),
  words as (select * from public.expand_query(p_query)),
  item_filters as (
    select p_min_satang is not null or p_max_satang is not null or nullif(trim(coalesce(p_size, '')), '') is not null as on_
  )
  select
    s.id, s.slug, s.display_name, s.province,
    coalesce((
      select array_agg(st.slug order by st.position)
      from public.shop_styles ss join public.styles st on st.id = ss.style_id
      where ss.shop_id = s.id
    ), '{}'),
    coalesce(m.n, 0)
  from public.shops s
  left join matched m on m.shop_id = s.id
  where s.status = 'approved'
    and (p_province is null or s.province = p_province)
    and (
      coalesce(m.n, 0) > 0
      or (
        not (select on_ from item_filters)
        and exists (select 1 from words)
        and not exists (
          select 1 from words w
          where not (s.display_name ilike any (w.text_patterns) or s.slug ilike any (w.text_patterns))
        )
      )
      or (
        not (select on_ from item_filters)
        and not exists (select 1 from words) and p_category is null and p_style is not null
        and exists (
          select 1 from public.shop_styles ss join public.styles st on st.id = ss.style_id
          where ss.shop_id = s.id and st.slug = p_style
        )
      )
    )
  order by coalesce(m.n, 0) desc, s.display_name, s.id
  limit least(greatest(coalesce(p_limit, 20), 1), 60);
$$;

grant execute on function public.search_related_shops(text, text, public.product_category, text, integer, integer, integer, text)
  to anon, authenticated;
