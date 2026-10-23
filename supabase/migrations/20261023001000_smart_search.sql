-- Smart search: brand nicknames, Thai/English synonyms, small typos, and
-- grouped suggestions while typing.
--
-- Each typed word expands two ways:
--   * text terms  : the word, known words it is a near-miss or prefix of, and
--                   their synonyms (polo -> โปโล). Matched against the title,
--                   brand, shop name, category words and style names.
--   * brand terms : every name of any brand the word refers to (polo -> all
--                   names of Ralph Lauren). Matched against the brand field
--                   only, so "ralp" does not pull in other brands' polo shirts.
-- An item matches when every typed word matches one way or the other.

create extension if not exists fuzzystrmatch with schema extensions;

-- ---------------------------------------------------------------------------
-- Vocabulary (managed by admins in the dashboard; read-only in the browser)
-- ---------------------------------------------------------------------------

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) > 0),
  -- Lower-case nicknames and spellings, Thai included.
  aliases text[] not null default '{}'
);

create table public.search_synonyms (
  id uuid primary key default gen_random_uuid(),
  -- Lower-case words that mean the same thing.
  words text[] not null check (cardinality(words) >= 2)
);

alter table public.brands enable row level security;
alter table public.search_synonyms enable row level security;
revoke all on public.brands, public.search_synonyms from anon, authenticated;
grant select on public.brands, public.search_synonyms to anon, authenticated;
create policy "Brands are public" on public.brands for select to anon, authenticated using (true);
create policy "Synonyms are public" on public.search_synonyms for select to anon, authenticated using (true);

insert into public.brands (name, aliases) values
  ('Ralph Lauren', '{ralph lauren,polo ralph lauren,polo,rl,ราล์ฟ ลอเรน,ราล์ฟลอเรน,โปโล ราล์ฟ ลอเรน}'),
  ('Lacoste', '{lacoste,ลาคอส,ลาคอสต์}'),
  ('Fred Perry', '{fred perry,เฟรด เพอร์รี่,เฟรดเพอร์รี่}'),
  ('Tommy Hilfiger', '{tommy hilfiger,tommy,ทอมมี่}'),
  ('Levi''s', '{levi''s,levis,levi,ลีวายส์,ลีวาย}'),
  ('Lee', '{lee,ลี}'),
  ('Wrangler', '{wrangler,แรงเลอร์}'),
  ('Carhartt', '{carhartt,carhartt wip,คาร์ฮาร์ท}'),
  ('Dickies', '{dickies,ดิกกี้ส์}'),
  ('Stüssy', '{stüssy,stussy,สตุสซี่}'),
  ('Supreme', '{supreme,ซูพรีม}'),
  ('Nike', '{nike,ไนกี้}'),
  ('Adidas', '{adidas,อาดิดาส}'),
  ('New Balance', '{new balance,nb,นิวบาลานซ์}'),
  ('Champion', '{champion,แชมเปี้ยน}'),
  ('The North Face', '{the north face,north face,tnf,นอร์ทเฟซ}'),
  ('Patagonia', '{patagonia,พาตาโกเนีย}'),
  ('Uniqlo', '{uniqlo,ยูนิโคล่}'),
  ('A Bathing Ape', '{a bathing ape,bape,เบป}'),
  ('Comme des Garçons', '{comme des garçons,comme des garcons,cdg}'),
  ('Yohji Yamamoto', '{yohji yamamoto,yohji,โยจิ}'),
  ('Issey Miyake', '{issey miyake,issey,อิซเซ่ มิยาเกะ}'),
  ('Harley-Davidson', '{harley-davidson,harley davidson,harley,ฮาร์เลย์}'),
  ('Burberry', '{burberry,เบอร์เบอร์รี่}'),
  ('Prada', '{prada,ปราด้า}'),
  ('Gucci', '{gucci,กุชชี่}');

insert into public.search_synonyms (words) values
  ('{polo,โปโล}'),
  ('{tee,tees,t-shirt,tshirt,เสื้อยืด}'),
  ('{shirt,shirts,เชิ้ต,เสื้อเชิ้ต}'),
  ('{hoodie,hoodies,ฮู้ด,ฮู้ดดี้}'),
  ('{sweatshirt,crewneck,สเวต,สเวตเชิ้ต}'),
  ('{sweater,knit,สเวตเตอร์,ไหมพรม,นิตติ้ง}'),
  ('{jacket,jackets,แจ็กเก็ต,แจ็คเก็ต}'),
  ('{coat,โค้ท,เสื้อโค้ท}'),
  ('{jeans,ยีนส์,denim,เดนิม}'),
  ('{pants,trousers,กางเกง}'),
  ('{shorts,ขาสั้น,กางเกงขาสั้น}'),
  ('{cargo,คาร์โก้}'),
  ('{skirt,กระโปรง}'),
  ('{dress,เดรส,ชุดเดรส}'),
  ('{sneakers,sneaker,สนีกเกอร์,รองเท้าผ้าใบ}'),
  ('{boots,บูท,รองเท้าบูท}'),
  ('{bag,กระเป๋า}'),
  ('{cap,หมวกแก๊ป,แก๊ป}'),
  ('{beanie,บีนนี่,หมวกไหมพรม}'),
  ('{vintage,วินเทจ}'),
  ('{y2k,วายทูเค}');

-- ---------------------------------------------------------------------------
-- Category words, mirroring CATEGORIES in src/lib/products/listing.ts
-- ---------------------------------------------------------------------------

create function public.category_words(category public.product_category) returns text
language sql immutable set search_path = '' as $$
  select case category::text
    when 'tees' then 'tees เสื้อยืด'
    when 'tops_shirts' then 'tops shirts เสื้อเชิ้ต ท็อป'
    when 'sweats' then 'sweats hoodie ฮู้ด สเวต'
    when 'outerwear' then 'outerwear jacket แจ็กเก็ต เสื้อคลุม'
    when 'bottoms' then 'bottoms pants กางเกง กระโปรง'
    when 'denim' then 'denim เดนิม'
    when 'dresses' then 'dresses เดรส'
    when 'shoes' then 'shoes รองเท้า'
    when 'bags' then 'bags กระเป๋า'
    when 'accessories' then 'accessories เครื่องประดับ'
    when 'headwear' then 'headwear หมวก'
    else category::text
  end;
$$;

-- ---------------------------------------------------------------------------
-- Query expansion
-- ---------------------------------------------------------------------------

create function public.search_vocabulary() returns table (word text)
language sql stable security definer set search_path = '' as $$
  select distinct w from (
    select unnest(words) as w from public.search_synonyms
    union all select lower(name) from public.brands
    union all select unnest(aliases) from public.brands
    union all select lower(name_en) from public.styles
    union all select name_th from public.styles
  ) all_words
  where w is not null and w <> '';
$$;

create function public.like_pattern(term text) returns text
language sql immutable set search_path = '' as $$
  select '%' || replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') || '%';
$$;

-- One row per typed word: the known words it may mean, and its two pattern sets.
create function public.expand_query(query text)
returns table (word_index integer, candidates text[], text_patterns text[], brand_patterns text[])
language sql stable security definer set search_path = '' as $$
  with typed as (
    select ord::integer as word_index, lower(word) as word
    from unnest(regexp_split_to_array(trim(coalesce(query, '')), '\s+')) with ordinality as t(word, ord)
    where word <> ''
  ),
  cands as (
    select t.word_index, t.word,
      array(
        select distinct c from (
          select t.word as c
          union all
          select v.word from public.search_vocabulary() v
          where char_length(t.word) >= 3 and (
            v.word like replace(replace(replace(t.word, '\', '\\'), '%', '\%'), '_', '\_') || '%'
            or extensions.levenshtein(left(v.word, 255), left(t.word, 255))
               <= case when char_length(t.word) >= 6 then 2 else 1 end
          )
        ) found
      ) as candidates
    from typed t
  )
  select
    c.word_index,
    c.candidates,
    array(
      select distinct public.like_pattern(term) from (
        select unnest(c.candidates) as term
        union
        select unnest(s.words) from public.search_synonyms s where s.words && c.candidates
      ) terms
    ),
    array(
      select distinct public.like_pattern(term) from (
        select lower(b.name) as term from public.brands b
          where lower(b.name) = any (c.candidates) or b.aliases && c.candidates
        union
        select unnest(b.aliases) from public.brands b
          where lower(b.name) = any (c.candidates) or b.aliases && c.candidates
      ) terms
    )
  from cands c;
$$;

-- ---------------------------------------------------------------------------
-- Matching (SECURITY INVOKER: row level security decides what is visible)
-- ---------------------------------------------------------------------------

create function public.matching_products(
  p_query text default null,
  p_category public.product_category default null,
  p_style text default null,
  p_province text default null,
  p_min_satang integer default null,
  p_max_satang integer default null,
  p_size text default null
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
    and (p_province is null or s.province = p_province)
    and (p_min_satang is null or p.price_satang >= p_min_satang)
    and (p_max_satang is null or p.price_satang <= p_max_satang)
    and (p_size is null or lower(p.size_label) = lower(trim(p_size)))
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

-- Same signature as before; now uses smart matching.
create or replace function public.search_products(
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
  select
    p.id, p.title, p.brand, p.price_satang, p.size_label, p.condition, p.status, p.created_at,
    s.slug, s.display_name, s.province,
    (select i.storage_path from public.product_images i
      where i.product_id = p.id and i.kind = 'front' limit 1)
  from public.products p
  join public.shops s on s.id = p.shop_id
  where p.id in (
    select public.matching_products(p_query, p_category, p_style, p_province, p_min_satang, p_max_satang, p_size)
  )
  order by
    case when p_sort = 'price_asc' then p.price_satang end asc,
    case when p_sort = 'price_desc' then p.price_satang end desc,
    p.created_at desc,
    p.id
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Shops for the left pane of results, style and category pages.
create function public.search_related_shops(
  p_query text default null,
  p_style text default null,
  p_category public.product_category default null,
  p_province text default null,
  p_limit integer default 20
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
    where p.id in (select public.matching_products(p_query, p_category, p_style, p_province))
    group by p.shop_id
  ),
  words as (select * from public.expand_query(p_query))
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
        exists (select 1 from words)
        and not exists (
          select 1 from words w
          where not (s.display_name ilike any (w.text_patterns) or s.slug ilike any (w.text_patterns))
        )
      )
      or (
        not exists (select 1 from words) and p_category is null and p_style is not null
        and exists (
          select 1 from public.shop_styles ss join public.styles st on st.id = ss.style_id
          where ss.shop_id = s.id and st.slug = p_style
        )
      )
    )
  order by coalesce(m.n, 0) desc, s.display_name, s.id
  limit least(greatest(coalesce(p_limit, 20), 1), 60);
$$;

-- Grouped suggestions shown while typing.
create function public.search_suggest(p_query text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with words as (select * from public.expand_query(p_query)),
  all_candidates as (select distinct unnest(candidates) as c from words),
  matched as (select public.matching_products(p_query) as id)
  select case when not exists (select 1 from words) then
    jsonb_build_object('brands', '[]'::jsonb, 'shops', '[]'::jsonb, 'styles', '[]'::jsonb, 'categories', '[]'::jsonb)
  else jsonb_build_object(
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object('name', b.name) order by b.name)
      from (
        select b.name from public.brands b
        where lower(b.name) in (select c from all_candidates)
           or b.aliases && array(select c from all_candidates)
        order by b.name limit 3
      ) b
    ), '[]'::jsonb),
    'shops', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', r.slug, 'name', r.display_name, 'province', r.province, 'match_count', r.match_count))
      from (select * from public.search_related_shops(p_query, null, null, null, 3)) r
    ), '[]'::jsonb),
    'styles', coalesce((
      select jsonb_agg(jsonb_build_object('slug', x.slug, 'name_en', x.name_en, 'name_th', x.name_th))
      from (
        select st.slug, st.name_en, st.name_th, count(*) as n
        from matched m
        join public.product_styles ps on ps.product_id = m.id
        join public.styles st on st.id = ps.style_id
        group by st.slug, st.name_en, st.name_th
        order by n desc, st.slug limit 3
      ) x
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('value', x.category, 'count', x.n))
      from (
        select p.category::text as category, count(*) as n
        from matched m join public.products p on p.id = m.id
        group by p.category
        order by n desc, p.category limit 3
      ) x
    ), '[]'::jsonb)
  ) end;
$$;

grant execute on function
  public.category_words(public.product_category),
  public.search_vocabulary(),
  public.like_pattern(text),
  public.expand_query(text),
  public.matching_products(text, public.product_category, text, text, integer, integer, text),
  public.search_related_shops(text, text, public.product_category, text, integer),
  public.search_suggest(text)
to anon, authenticated;
