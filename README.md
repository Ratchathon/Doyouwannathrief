# doyouwannathrift

**A curated marketplace for Thai secondhand clothing shops, designed like a street-snap magazine.**
Live demo: <https://doyouwannathrift.vercel.app> — on the log-in page, press **TRY AS BUYER**, **TRY AS SHOP** or **TRY AS ADMIN** to look around without signing up.

> 🇹🇭 **ภาษาไทยโดยย่อ:** เว็บรวมร้านเสื้อผ้ามือสองที่คัดสไตล์แล้วจากทั่วไทย ร้านต้องผ่านการอนุมัติ ทุกชิ้นถ่ายรูปตามมาตรฐานเดียวกัน (หน้า หลัง ป้าย ตำหนิ) ผู้ซื้อกดซื้อหรือยื่นข้อเสนอราคาได้ และเงินถูกพักไว้จนกว่าจะได้ของ
> โปรเจกต์นี้เป็นผลงานเดโม ร้านและสินค้าเป็นตัวอย่าง การจ่ายเงินและการส่งของเป็นการจำลองทั้งหมด

![Homepage on desktop and phone](docs/screenshots/home.png)

## What you can do

| As a buyer | As a shop | As an admin |
|---|---|---|
| Search with suggestions, filter by category, size, price and province | Apply to open a shop (one per account) | Approve or reject shop applications with a reason |
| Browse by style, shop and Discover (trending, just dropped, near you, under ฿500) | List items with real measurements; required photos are resized to WebP in the browser | Work through the reports queue |
| See every item's front, back, label and flaw photos | Publish, hide, or mark sold in one tap | Reset the demo data |
| **Buy now** with a demo checkout (fake QR, nothing is charged) | Answer offers: accept, decline or counter (3 rounds) | |
| **Make an offer**: the shop's floor is hidden, 24 h to answer, outbid buyers are told | Ship paid orders with a tracking number | |
| Get in-site notifications for every step | Get paid (demo) when the buyer confirms receipt | |

## The interesting parts

- **Business rules live in Postgres.** Offers, counter rounds, the hidden 75% floor, the 10-hour payment hold and order states are `security definer` functions with row level security on every table, so the rules hold whatever the client does. Deadlines are timestamps checked lazily (`expire_stale()`), so there is no cron job. See [`supabase/migrations`](supabase/migrations).
- **Tested against a real Postgres.** Database tests run every migration in [PGlite](https://pglite.dev) and act as `anon` / `authenticated` users to prove policies and functions. 700+ tests in total (Vitest + Testing Library).
- **Next.js 16 with Cache Components.** Public pages are prerendered and cached; anything that reads the session streams in behind `<Suspense>`.
- **Thai-first UI.** English headings, Thai body copy (Anuphan), accessible forms and keyboard support, designed to work on a phone first.
- **Design system** in [`DESIGN.md`](DESIGN.md): coated white paper, black ink, process magenta and a yellow highlighter, Archivo at 62% and 125% width.

## Stack

Next.js 16 (App Router, TypeScript) · Supabase (Postgres, Auth, Storage) · Tailwind CSS 4 · Vitest · PGlite · Vercel

## Run it yourself

1. Create a Supabase project and run the files in `supabase/migrations` in order (SQL editor or `supabase db push`).
2. Optional sample data: run `supabase/seed/sample-shops.sql`, then `supabase/seed/demo-accounts.sql` with your own demo password.
3. In Supabase → Authentication → Email, turn off **Confirm email** if you want sign-ups to work instantly.
4. Copy `.env.example` to `.env.local` and fill it in (only the **publishable** key; never the secret key).
5. `npm install`, then `npm run dev`. Checks: `npm test`, `npm run lint`, `npm run typecheck`.

## Project layout

```
src/app            routes (storefronts at /<shop>, items at /<shop>/<id>, /sell, /admin, /account …)
src/components     UI, one file per piece, tests in __tests__
src/lib            data loading and server actions (auth, catalog, search, sell, trade, reports)
src/db/__tests__   database tests against every migration
supabase           migrations and seed data
```

## Notes

Sample shops, items and photos are invented and labelled as samples. Photos are drawn illustrations, not real products. No payment provider is connected.
