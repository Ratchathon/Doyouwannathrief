---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/globals.css","src/app/layout.tsx","src/components/home-view.tsx"]
---

# Homepage (and the site-wide world it sets)

Scope: homepage first; the same world then carries header, footer, results, filters, shop, product, Discover, /shops. Visitor mode: Persuade (homepage); Operate for results/filters; Read for product details.

Audience and job: Thai buyers arriving on a phone from TikTok/IG; they should understand in seconds that this is a hub of curated secondhand shops, then search or jump into a style. Proof: live piece and shop counts, every piece shown front/back/label/flaws. Constraints: homepage does not lead with product photos; headers in English, body Thai; sample data labelled; no invented claims; product photos stay true colour.

Tester feedback that triggered the redesign: "monotone, not art, not street". Owner wants the first second to feel like an art / fashion magazine; must not feel childish, cluttered, cheap discount stall, or generic tech.

Memorable moment: the stacked magenta masthead and a cover whose cover lines are the links.

Unresolved: how cover lines are chosen (auto from data vs. written by admin); what the issue line counts; light-only vs. a dark variant.

## Direction contract

THESIS: The homepage is this week's issue of a street-snap magazine: a type-only cover whose cover lines are the links, and a contents page listing every style with its live piece count. It refuses the product-grid storefront and the black chrome hype-drop look it replaces.

OWN-WORLD: Coated white paper #FBFBFA, black ink #111111, process magenta #E4007C only for the masthead, big numbers and one cover line; #C4006B where magenta carries white text; process yellow #FFE500 as a highlighter (one cover line, flaws, NEW stickers). Archivo variable: 62% width Black for masthead and display, 125% width Bold for labels and buttons; Anuphan for Thai. Black rules 1–3px, dotted leaders, square corners, no gradients, no chrome, no glow.

STORY: A visitor sees a magazine cover, not a shop window; the cover lines say what is inside this week; they search or tap a cover line or a contents entry; pieces read like snap captions (price, size, brand, title); flaws sit on yellow so trust is visible.

FIRST VIEWPORT: Phone 390: issue line and menu (48px); masthead DOYOU / WANNA / THRIFT stacked full width in magenta (about 330px tall); tagline rule; search box with black SEARCH button around y 480 (primary action); the first cover line starts above the fold. Desktop: one-line masthead across the 1280px column; cover lines left (7/12), search and CONTENTS right (5/12); NEW SHOPS below. Signature motion: on load the yellow highlighter sweeps once under the UNDER ฿500 cover line; cover-line arrows nudge on hover.

FORM: Street-snap magazine cover; first on my ordered list of seven (the roll assigned the sixth, Invitation; the owner chose this one on the canvas). seed:fb928705ae443e8c

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
