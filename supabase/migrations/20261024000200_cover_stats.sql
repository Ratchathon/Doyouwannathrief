-- Numbers for the homepage cover: pieces on sale per style (with the leading
-- shop and how many were listed this week), and how many sit under a price.
-- "On sale" means status 'active' in an approved shop; reserved and sold
-- pieces are not counted.

create function public.style_stats()
returns table (
  slug text,
  name_en text,
  name_th text,
  pieces integer,
  shops integer,
  new_pieces integer,
  top_shop_name text,
  top_shop_province text
)
language sql stable security invoker set search_path = '' as $$
  with on_sale as (
    select ps.style_id, p.created_at, s.id as shop_id, s.display_name, s.province
    from public.products p
    join public.shops s on s.id = p.shop_id
    join public.product_styles ps on ps.product_id = p.id
    where p.status = 'active' and s.status = 'approved'
  ),
  per_shop as (
    select style_id, display_name, province,
      row_number() over (
        partition by style_id
        order by count(*) desc, max(created_at) desc, display_name
      ) as rank
    from on_sale
    group by style_id, shop_id, display_name, province
  )
  select st.slug, st.name_en, st.name_th,
    (select count(*) from on_sale o where o.style_id = st.id)::integer,
    (select count(distinct o.shop_id) from on_sale o where o.style_id = st.id)::integer,
    (select count(*) from on_sale o
      where o.style_id = st.id and o.created_at >= now() - interval '7 days')::integer,
    t.display_name, t.province
  from public.styles st
  left join per_shop t on t.style_id = st.id and t.rank = 1
  order by st.position;
$$;

create function public.count_on_sale(p_max_satang integer)
returns integer
language sql stable security invoker set search_path = '' as $$
  select count(*)::integer
  from public.products p
  join public.shops s on s.id = p.shop_id
  where p.status = 'active' and s.status = 'approved' and p.price_satang <= p_max_satang;
$$;

grant execute on function public.style_stats(), public.count_on_sale(integer) to anon, authenticated;
