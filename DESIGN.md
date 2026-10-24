# doyouwannathrift — design system

A street-snap magazine. The homepage is this week's issue: a type-only cover whose cover lines are links, and a contents page listing every style with its live piece count. Every other page is set on the same paper, in the same ink.

## Colour (tokens in `src/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `paper` | `#fbfbfa` | page ground (light only, no dark theme) |
| `sheet` | `#ffffff` | inputs, raised panels, chips |
| `print` | `#111111` | text, rules, black buttons, footer ground |
| `print-soft` | `#2a2a2a` | long body copy |
| `muted` / `faint` | `#505050` / `#666666` | secondary / tertiary text (both ≥4.5:1 on paper) |
| `line` | `#d2d2cd` | rare light hairline |
| `magenta` | `#e4007c` | masthead, big numerals, one cover line — display sizes only |
| `magenta-strong` | `#c4006b` | magenta carrying white text; hover; focus ring |
| `magenta-light` | `#ff4fa8` | magenta on the black footer |
| `highlight` | `#ffe500` | highlighter: UNDER ฿500 cover line, flaws, NEW stickers, active suggestion, applied filters |
| `photo` | `#e7e5e1` | photo placeholder ground |

Product photos always stay true colour.

## Type

- `cond`: Archivo Variable, 62% width, 900 — masthead, page titles, prices, counts.
- `wide`: Archivo Variable, 125% width, 700 — labels, nav, buttons, shop names. English, upper case.
- Anuphan 400–700 — all Thai and body text. Thai is never set condensed.

## Components

- Rules: 2px black under headings and around bars; 1px black between rows; dotted leaders on the contents page.
- Square corners everywhere. No gradients, glow, chrome or blur.
- Buttons: `btn` (black, magenta on hover), `btn-outline` (2px black on white). BUY NOW uses `magenta-strong`.
- Fields: `field` / the search box — 2px black box, white inside, black SEARCH block attached.
- Chips: 2px black border; on = black fill, applied = yellow.
- Item card = snap caption: photo, 2px rule, price (cond) + SIZE, brand, title, shop.
- Shop discs: white circle, 2px black ring, condensed monogram, yellow tilted NEW.

## Motion

One authored moment: the yellow highlighter sweeps once under the UNDER ฿500 cover line (`marker-sweep`). Small hover nudges on arrows and discs. Everything stops under `prefers-reduced-motion`.
