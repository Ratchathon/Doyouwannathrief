# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js (App Router) + TypeScript, Supabase (Postgres, Auth, Storage), Vitest, deployed on Vercel. Chosen because one person can build it, friends can join without learning a niche stack, and Postgres + pgvector covers the later image-search feature without a migration.

## Users

- **Buyers:** Thai shoppers, mostly arriving on a phone from a TikTok or Instagram link. Into streetwear, vintage, brand-name pieces and Y2K / Korean-Japanese styles. They want a good piece without digging through piles, and they need to trust condition and authenticity before paying.
- **Shops:** independent secondhand clothing shops across Thailand with their own taste (not generic market-stall tees). Many already sell in a physical store, on IG or via live selling. They want reach beyond their own city.
- **Admin (the founder):** approves shops, settles disputes.

## Product Purpose

A hub of curated secondhand clothing shops from across Thailand. Each approved shop gets its own storefront page, so a buyer in Chiang Mai can shop a shop Bangkok people love. Success: buyers find pieces they want quickly and trust what arrives; shops gain customers outside their city.

## Positioning

Curation happens at the shop level, not item by item: only shops with a clear style are admitted. Every listing follows the same photo standard, so condition and authenticity can be judged the same way everywhere on the site. Payment is held by the platform until the buyer confirms receipt.

## Operating Context

- Buyers arrive mid-scroll from social media on mobile.
- Shops list from their phones, often between serving customers; marking an item sold must be one tap because they also sell offline.
- Every item is one of a kind.

## Capabilities and Constraints

Phase 1: shop application and admin approval; storefront at `/<english-slug>` with a Thai display name; listings with required photos (front, back, brand/neck label; flaw photos required when "has flaws" is ticked, otherwise the shop confirms "no flaws"); measurements as numbers; browse and search by category, size, price, shop province.

Later phases:
- PromptPay QR payment through a payment gateway; platform holds funds until receipt is confirmed; per-shop commission with expiry (launch promo 0%), rate snapshotted on each order.
- Offers: one live offer per item; new offers must beat it; floor 75% of price (shop may set higher), never revealed; shop replies within 24h; counter-offers up to 3 rounds, 24h each; a higher offer replaces an ongoing negotiation; outbid buyers are notified and may re-offer; max 3 offers per buyer per item; accepted offer reserves the item for 10h payment, then it returns to sale.
- Disputes, reviews, payouts.
- AI image search: upload a screenshot, pick a garment, find similar items. Customer photos are not stored.

Login: email and Google first, LINE later.

Undecided: brand name (working name "Curated Hub"), shop approval criteria in detail, legal setup for holding funds.

## Brand Commitments

- Working name only; no logo or assets yet.
- The homepage must not lead with product photos: shop photo quality varies. It features shops and styles instead, and links into Discover.
- Structural reference from the founder: carnivalbkk.com (search up top, menu by category, clean). Borrow structure, not the look.
- Feel the founder asked for: clean and serious, never boring; streetwear and high-fashion; fun to use.

## Information Architecture (confirmed)

- Home: shops and styles, no product grid up top.
- Discover: tabs for products, shops, categories, styles, sharing one search box.
- Search: product title, brand, shop name, style.
- Styles: admin-defined list; a product has at most 3.
- Report a problem: about a product, a shop, or the website; logged-in users only; reviewed in an admin queue.
- How it works: a buyer guide, a shop guide, FAQ.

## Evidence on Hand

None. No shops are signed up yet, no real listings, no photos, no testimonials. Demo content must be labeled as sample data, and no claims about shop counts, sales or reviews may be invented.

## Product Principles

1. Trust is the product: every rule (photo standard, held payment, hidden offer floor) exists so a buyer can pay a stranger in another city with confidence.
2. Respect the shop's time: listing and marking sold must be fast on a phone, or stock goes stale.
3. Taste over volume: fewer, better shops beat a long tail of generic listings.
4. Each shop keeps its own identity inside the hub.

## Accessibility & Inclusion

Thai-first copy with correct Thai typography (fonts with full Thai glyph support, comfortable line height for Thai vowels and tone marks). Mobile touch targets and readable contrast for outdoor phone use.
