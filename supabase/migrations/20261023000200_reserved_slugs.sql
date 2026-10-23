-- Paths a shop cannot use as its URL. Must match RESERVED_SLUGS in
-- src/lib/shops/slug.ts (a test checks they are identical).

create function public.reserved_slugs() returns text[]
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
    'help',
    'how-it-works',
    'images',
    'login',
    'logout',
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

alter table public.shops
  add constraint slug_not_reserved check (not (slug = any (public.reserved_slugs())));
