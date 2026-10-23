# Sample shops

Six invented shops with 36 items, used to demo the site before real shops join.

- `data.py` — the shops and items (edit here).
- `draw.py` — draws the photos (flat-lay illustrations, label and flaw close-ups, all marked SAMPLE PHOTO).
- `build.py` — writes `public/samples/**` and `supabase/seed/sample-shops.sql` / `remove-sample-shops.sql`.

```
pip install pillow fonttools brotli
python3 scripts/samples/build.py
```

Then run `supabase/seed/sample-shops.sql` in the Supabase SQL editor. Owners are unusable
accounts on the reserved `.invalid` domain. To take everything down, run `remove-sample-shops.sql`.
