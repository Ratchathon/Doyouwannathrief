-- Filters can hold several values: any of several categories (p_categories)
-- and any of several sizes (p_sizes, case-insensitive). The new parameters go
-- last, so every existing call keeps working unchanged.

drop function public.search_facets(text, public.product_category, text, text, integer, integer);
drop function public.search_related_shops(text, text, public.product_category, text, integer, integer, integer, text);
drop function public.search_products(text, public.product_category, text, text, integer, integer, text, text, integer, integer);
drop function public.matching_products(text, public.product_category, text, text, integer, integer, text);

create function public.matching_products(
  p_query text default null,
  p_category public.product_category default null,
  p_style text default null,
  p_province text default null,
  p_min_satang integer default null,
  p_max_satang integer default null,
  p_size text default null,
  p_categories public.product_category[] default null,
  p_sizes text[] default null
) returns setof uuid
language sql stable security invoker set search_path = '' as $$
  with words as (select * from public.expand_query(p_query))
  select p.id
  from public.products p
  join public.shops s on s.id = p.shop_id
  cross join lateral (
    select concat_ws(' ', p.title, p.brand, s.display_name, s.slug, public.category_words(p.category),
      (select string_agg(st.name_en || ' ' || st.name_th, ' ')
         from public.product_styles ps join public.styles st on st.id = ps.style_id
         where ps.product_id = p.id)) as doc
  ) d
  where p.status in ('active', 'reserved')
    and s.status = 'approved'
    and (p_category is null or p.category = p_category)
    and (cardinality(coalesce(p_categories, '{}')) = 0 or p.category = any (p_categories))
    and (p_province is null or s.province = p_province)
    and (p_min_satang is null or p.price_satang >= p_min_satang)
    and (p_max_satang is null or p.price_satang <= p_max_satang)
    and (p_size is null or lower(p.size_label) = lower(trim(p_size)))
    and (
      cardinality(coalesce(p_sizes, '{}')) = 0
      or lower(p.size_label) in (select lower(trim(x)) from unnest(p_sizes) as x)
    )
    and (p_style is null or exists (
      select 1 from public.product_styles ps join public.styles st on st.id = ps.style_id
      where ps.product_id = p.id and st.slug = p_style
    ))
    and not exists (
      select 1 from words w
      where not (
        d.doc ilike any (w.text_patterns)
        or coalesce(p.brand, '') ilike any (w.brand_patterns)
      )
    );
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
  p_offset integer default 0,
  p_categories public.product_category[] default null,
  p_sizes text[] default null
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
  select
    p.id, p.title, p.brand, p.price_satang, p.size_label, p.condition, p.status, p.created_at,
    s.slug, s.display_name, s.province,
    (select i.storage_path from public.product_images i
      where i.product_id = p.id and i.kind = 'front' limit 1)
  from public.products p
  join public.shops s on s.id = p.shop_id
  where p.id in (
    select public.matching_products(p_query, p_category, p_style, p_province, p_min_satang, p_max_satang, p_size,
      p_categories, p_sizes)
  )
  order by
    case when p_sort = 'price_asc' then p.price_satang end asc,
    case when p_sort = 'price_desc' then p.price_satang end desc,
    p.created_at desc,
    p.id
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create function public.search_related_shops(
  p_query text default null,
  p_style text default null,
  p_category public.product_category default null,
  p_province text default null,
  p_limit integer default 20,
  p_min_satang integer default null,
  p_max_satang integer default null,
  p_size text default null,
  p_categories public.product_category[] default null,
  p_sizes text[] default null
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
      select public.matching_products(p_query, p_category, p_style, p_province, p_min_satang, p_max_satang, p_size,
        p_categories, p_sizes)
    )
    group by p.shop_id
  ),
  words as (select * from public.expand_query(p_query)),
  item_filters as (
    select p_min_satang is not null or p_max_satang is not null
      or nullif(trim(coalesce(p_size, '')), '') is not null
      or cardinality(coalesce(p_sizes, '{}')) > 0
      or cardinality(coalesce(p_categories, '{}')) > 0 as on_
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

create function public.search_facets(
  p_query text default null,
  p_category public.product_category default null,
  p_style text default null,
  p_province text default null,
  p_min_satang integer default null,
  p_max_satang integer default null,
  p_categories public.product_category[] default null
) returns table (size_label text, n integer)
language sql stable security invoker set search_path = '' as $$
  select p.size_label, count(*)::integer
  from public.products p
  where p.id in (
    select public.matching_products(p_query, p_category, p_style, p_province, p_min_satang, p_max_satang, null,
      p_categories, null)
  )
  group by p.size_label
  order by count(*) desc, p.size_label
  limit 30;
$$;

grant execute on function
  public.matching_products(text, public.product_category, text, text, integer, integer, text, public.product_category[], text[]),
  public.search_products(text, public.product_category, text, text, integer, integer, text, text, integer, integer,
    public.product_category[], text[]),
  public.search_related_shops(text, text, public.product_category, text, integer, integer, integer, text,
    public.product_category[], text[]),
  public.search_facets(text, public.product_category, text, text, integer, integer, public.product_category[])
to anon, authenticated;
