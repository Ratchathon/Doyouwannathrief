-- Search for items and shops.
--
-- Thai is written without spaces between words, so word-based full-text
-- search cannot find "เดนิม" inside "เสื้อเชิ้ตเดนิม". Instead each typed word
-- is matched as a substring (ILIKE), and pg_trgm indexes keep that fast.
-- Every word typed must match somewhere: title, brand, shop name or slug,
-- or the item's style names.
--
-- Both functions are SECURITY INVOKER, so row level security still decides
-- what the caller may see.

create extension if not exists pg_trgm with schema extensions;

create index products_title_trgm on public.products using gin (title extensions.gin_trgm_ops);
create index products_brand_trgm on public.products using gin (brand extensions.gin_trgm_ops);
create index shops_display_name_trgm on public.shops using gin (display_name extensions.gin_trgm_ops);

-- Turns typed text into ILIKE patterns, treating % _ and \ literally.
create function public.search_patterns(query text) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(
    '%' || replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  ), '{}')
  from unnest(regexp_split_to_array(trim(coalesce(query, '')), '\s+')) as term
  where term <> '';
$$;

create function public.search_products(
  p_query text default null,
  p_category public.product_category default null,
  p_style text default null,
  p_province text default null,
  p_min_satang integer default null,
  p_max_satang integer default null,
  p_size text default null,
  p_sort text default 'newest',
  p_limit integer default 24,
  p_offset integer default 0
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
  front_path text
)
language sql stable security invoker set search_path = '' as $$
  with patterns as (select public.search_patterns(p_query) as list)
  select
    p.id, p.title, p.brand, p.price_satang, p.size_label, p.condition, p.status, p.created_at,
    s.slug, s.display_name, s.province,
    (select i.storage_path from public.product_images i
      where i.product_id = p.id and i.kind = 'front' limit 1)
  from public.products p
  join public.shops s on s.id = p.shop_id
  cross join patterns
  where p.status in ('active', 'reserved')
    and s.status = 'approved'
    and (p_category is null or p.category = p_category)
    and (p_province is null or s.province = p_province)
    and (p_min_satang is null or p.price_satang >= p_min_satang)
    and (p_max_satang is null or p.price_satang <= p_max_satang)
    and (p_size is null or lower(p.size_label) = lower(trim(p_size)))
    and (p_style is null or exists (
      select 1 from public.product_styles ps join public.styles st on st.id = ps.style_id
      where ps.product_id = p.id and st.slug = p_style
    ))
    and not exists (
      select 1 from unnest(patterns.list) as pattern
      where not (
        p.title ilike pattern
        or coalesce(p.brand, '') ilike pattern
        or s.display_name ilike pattern
        or s.slug ilike pattern
        or exists (
          select 1 from public.product_styles ps join public.styles st on st.id = ps.style_id
          where ps.product_id = p.id and (st.name_th ilike pattern or st.name_en ilike pattern)
        )
      )
    )
  order by
    case when p_sort = 'price_asc' then p.price_satang end asc,
    case when p_sort = 'price_desc' then p.price_satang end desc,
    p.created_at desc,
    p.id
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create function public.search_shops(
  p_query text default null,
  p_style text default null,
  p_province text default null,
  p_limit integer default 24,
  p_offset integer default 0
) returns table (
  id uuid,
  slug text,
  display_name text,
  province text,
  bio text,
  styles text[],
  item_count integer
)
language sql stable security invoker set search_path = '' as $$
  with patterns as (select public.search_patterns(p_query) as list),
  found as (
    select
      s.id, s.slug, s.display_name, s.province, s.bio,
      coalesce((
        select array_agg(st.slug order by st.position)
        from public.shop_styles ss join public.styles st on st.id = ss.style_id
        where ss.shop_id = s.id
      ), '{}') as styles,
      (select count(*)::integer from public.products p where p.shop_id = s.id and p.status = 'active') as item_count
    from public.shops s
    cross join patterns
    where s.status = 'approved'
      and (p_province is null or s.province = p_province)
      and (p_style is null or exists (
        select 1 from public.shop_styles ss join public.styles st on st.id = ss.style_id
        where ss.shop_id = s.id and st.slug = p_style
      ))
      and not exists (
        select 1 from unnest(patterns.list) as pattern
        where not (s.display_name ilike pattern or s.slug ilike pattern or s.bio ilike pattern)
      )
  )
  select * from found
  order by item_count desc, display_name, id
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.search_patterns(text) to anon, authenticated;
grant execute on function public.search_products(
  text, public.product_category, text, text, integer, integer, text, text, integer, integer
) to anon, authenticated;
grant execute on function public.search_shops(text, text, text, integer, integer) to anon, authenticated;
