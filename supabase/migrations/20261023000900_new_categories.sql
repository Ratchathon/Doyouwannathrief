-- Streetwear-style categories: TEES, TOPS & SHIRTS, SWEATS, OUTERWEAR, BOTTOMS,
-- DENIM, plus the existing dresses, shoes, bags, accessories and headwear.
-- Renaming and adding enum values keeps existing rows valid (no data loss).
-- Order mirrors CATEGORIES in src/lib/products/listing.ts (a test checks it).

alter type public.product_category rename value 'tops' to 'tops_shirts';
alter type public.product_category add value if not exists 'tees' before 'tops_shirts';
alter type public.product_category add value if not exists 'sweats' after 'tops_shirts';
alter type public.product_category add value if not exists 'denim' after 'bottoms';
