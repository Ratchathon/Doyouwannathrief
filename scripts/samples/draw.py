"""Draws sample product photos: flat-lay garment illustrations on a studio
backdrop (front, back), a close-up of the label, and a close-up of the flaw.
Every image carries a small SAMPLE PHOTO mark. Pillow only."""

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

W, H = 800, 1000
HERE = Path(__file__).parent
ANTON = str(HERE / "Anton.ttf")
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SYMBOL = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def shade(rgb, f):
    return tuple(max(0, min(255, int(c * f))) for c in rgb)


def luminance(rgb):
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


def font(path, size):
    return ImageFont.truetype(path, size)


# ---------------------------------------------------------------------------
# Backdrop and finishing
# ---------------------------------------------------------------------------

def backdrop(seed):
    rnd = random.Random(seed)
    top = (236 + rnd.randint(-4, 4), 233, 228)
    bottom = (214, 210, 203)
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    # Soft vignette.
    vig = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vig).ellipse((-200, -150, W + 200, H + 250), fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(120))
    dark = Image.new("RGB", (W, H), shade(bottom, 0.86))
    return Image.composite(img, dark, vig)


def mark(img):
    d = ImageDraw.Draw(img)
    f = font(SANS, 16)
    text = "SAMPLE PHOTO"
    tw = d.textlength(text, font=f)
    d.rounded_rectangle((W - tw - 40, H - 46, W - 16, H - 16), radius=6, fill=(20, 20, 22))
    d.text((W - tw - 28, H - 41), text, font=f, fill=(235, 235, 235))
    return img


# ---------------------------------------------------------------------------
# Fabric fills
# ---------------------------------------------------------------------------

def fabric(spec, seed, size=(W, H)):
    base = hex_rgb(spec["color"])
    accent = hex_rgb(spec["accent"])
    img = Image.new("RGB", size, base)
    d = ImageDraw.Draw(img)
    pattern = spec.get("pattern", "solid")
    if pattern == "stripes":
        step = 46
        for y in range(0, size[1], step):
            d.rectangle((0, y, size[0], y + step // 2 - 4), fill=accent)
    elif pattern == "plaid":
        layer = Image.new("RGBA", size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        for x in range(0, size[0], 90):
            ld.rectangle((x, 0, x + 34, size[1]), fill=accent + (120,))
            ld.rectangle((x + 52, 0, x + 58, size[1]), fill=(240, 236, 220, 110))
        for y in range(0, size[1], 90):
            ld.rectangle((0, y, size[0], y + 34), fill=accent + (120,))
            ld.rectangle((0, y + 52, size[0], y + 58), fill=(240, 236, 220, 110))
        img.paste(layer, (0, 0), layer)
    elif pattern == "wash":
        # Faded denim: lighter in the middle, darker at seams.
        glow = Image.new("L", size, 0)
        ImageDraw.Draw(glow).ellipse((size[0] * 0.2, size[1] * 0.1, size[0] * 0.8, size[1] * 0.9), fill=110)
        glow = glow.filter(ImageFilter.GaussianBlur(90))
        img = Image.composite(Image.new("RGB", size, shade(base, 1.3)), img, glow)
        d = ImageDraw.Draw(img)
        rnd = random.Random(seed)
        for _ in range(900):
            x, y = rnd.randrange(size[0]), rnd.randrange(size[1])
            d.line((x, y, x + rnd.randint(4, 16), y), fill=shade(base, 1.18 + rnd.random() * 0.2))
    # Weave texture.
    tex = Image.effect_noise(size, 22).convert("RGB")
    return ImageChops.overlay(img, tex.point(lambda v: 118 + v // 8))


# ---------------------------------------------------------------------------
# Silhouettes. Each returns (polygons for the body, decoration callback).
# ---------------------------------------------------------------------------

TEE = [(300, 170), (345, 158), (400, 190), (455, 158), (500, 170), (645, 255), (592, 372), (532, 338), (536, 735),
       (264, 735), (268, 338), (208, 372), (155, 255)]
LONG = [(300, 170), (345, 158), (400, 190), (455, 158), (500, 170), (612, 230), (690, 700), (618, 718), (540, 390),
        (538, 790), (262, 790), (260, 390), (182, 718), (110, 700), (188, 230)]
COAT = [(305, 150), (345, 140), (400, 175), (455, 140), (495, 150), (612, 210), (684, 690), (612, 706), (548, 380),
        (590, 945), (210, 945), (252, 380), (188, 706), (116, 690), (188, 210)]
PANTS = [(282, 165), (518, 165), (548, 900), (424, 900), (400, 360), (376, 900), (252, 900)]
SHORTS = [(282, 250), (518, 250), (560, 640), (424, 660), (400, 450), (376, 660), (240, 640)]
SKIRT = [(300, 280), (500, 280), (590, 700), (210, 700)]
DRESS = [(330, 230), (470, 230), (490, 450), (600, 900), (200, 900), (310, 450)]
TOTE = [(220, 380), (580, 380), (600, 860), (200, 860)]
SNEAKER = [(150, 560), (230, 470), (330, 430), (430, 440), (520, 470), (610, 540), (680, 600), (690, 660), (150, 660)]


def silhouette(shape):
    return {
        "tee": [TEE], "polo": [TEE], "shirt": [LONG], "longsleeve": [LONG], "sweatshirt": [LONG], "hoodie": [LONG],
        "jacket": [LONG], "coat": [COAT], "pants": [PANTS], "jeans": [PANTS], "shorts": [SHORTS], "skirt": [SKIRT],
        "dress": [DRESS], "tote": [TOTE], "sneaker": [SNEAKER], "cap": [], "beanie": [],
    }[shape]


def body_mask(spec, view):
    shape = spec["shape"]
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    for poly in silhouette(shape):
        d.polygon(poly, fill=255)
    if shape == "hoodie":
        if view == "back":
            d.ellipse((300, 70, 500, 300), fill=255)
        else:
            d.ellipse((318, 92, 482, 250), fill=255)
    if shape == "cap":
        d.chord((230, 340, 570, 700), 180, 360, fill=255)
        if view == "front":
            d.chord((200, 470, 600, 610), 0, 180, fill=255)
        else:
            d.rectangle((230, 515, 570, 535), fill=255)
    if shape == "beanie":
        d.chord((250, 300, 550, 720), 180, 360, fill=255)
        d.rounded_rectangle((240, 470, 560, 600), radius=18, fill=255)
    if shape == "tote":
        d.arc((290, 200, 510, 470), 180, 360, fill=255, width=26)
    if shape == "sneaker":
        d.rounded_rectangle((140, 640, 700, 700), radius=24, fill=255)
    if shape == "dress":
        d.line((340, 232, 330, 120), fill=255, width=10)
        d.line((460, 232, 470, 120), fill=255, width=10)
    return m


def decorate(img, spec, view):
    d = ImageDraw.Draw(img)
    shape = spec["shape"]
    base = hex_rgb(spec["color"])
    accent = hex_rgb(spec["accent"])
    dark = shade(base, 0.7) if luminance(base) > 60 else shade(base, 1.6)
    seam = shade(base, 0.82) if luminance(base) > 60 else shade(base, 1.35)

    tops = {"tee", "polo", "shirt", "longsleeve", "sweatshirt", "hoodie", "jacket", "coat"}
    if shape in tops:
        if view == "front":
            if shape in ("tee", "longsleeve", "sweatshirt"):
                d.chord((345, 140, 455, 232), 0, 180, fill=dark)
                d.arc((340, 134, 460, 238), 0, 180, fill=seam, width=8)
            if shape == "polo":
                d.polygon([(345, 158), (400, 196), (372, 236), (330, 186)], fill=shade(base, 0.92), outline=seam)
                d.polygon([(455, 158), (400, 196), (428, 236), (470, 186)], fill=shade(base, 0.92), outline=seam)
                d.line((400, 196, 400, 300), fill=seam, width=3)
                for y in (222, 254, 286):
                    d.ellipse((394, y - 6, 406, y + 6), fill=shade(base, 0.85), outline=seam)
            if shape in ("shirt", "coat"):
                d.polygon([(345, 150), (400, 205), (372, 250), (322, 182)], fill=shade(base, 0.94), outline=seam)
                d.polygon([(455, 150), (400, 205), (428, 250), (478, 182)], fill=shade(base, 0.94), outline=seam)
                d.line((400, 205, 400, 790 if shape == "shirt" else 935), fill=seam, width=3)
                for y in range(260, 780 if shape == "shirt" else 900, 80):
                    d.ellipse((392, y - 8, 408, y + 8), fill=shade(base, 0.8))
                if shape == "coat":
                    d.line((262, 520, 538, 520), fill=dark, width=14)
            if shape == "hoodie":
                d.ellipse((350, 130, 450, 228), fill=dark)
                d.line((380, 220, 374, 330), fill=accent, width=5)
                d.line((420, 220, 426, 330), fill=accent, width=5)
                d.polygon([(310, 560), (490, 560), (515, 700), (285, 700)], outline=seam, width=4)
            if shape == "jacket":
                d.polygon([(340, 152), (400, 196), (372, 262), (318, 190)], fill=shade(base, 0.9), outline=seam)
                d.polygon([(460, 152), (400, 196), (428, 262), (482, 190)], fill=shade(base, 0.9), outline=seam)
                d.line((400, 196, 400, 790), fill=shade(accent, 0.9), width=5)
                for x in (300, 440):
                    d.rectangle((x, 330, x + 64, 400), outline=seam, width=4)
                d.rectangle((262, 750, 538, 790), outline=seam, width=4)
            if shape in ("sweatshirt", "hoodie", "longsleeve", "shirt", "jacket"):
                d.line((120, 680, 186, 696), fill=seam, width=6)
                d.line((614, 696, 680, 680), fill=seam, width=6)
            if shape == "sweatshirt" or shape == "hoodie":
                d.rectangle((262, 750, 538, 790), outline=seam, width=4)
        else:
            if shape in ("tee", "polo", "longsleeve", "sweatshirt", "jacket", "shirt", "coat"):
                d.arc((345, 148, 455, 196), 0, 180, fill=seam, width=8)
            if shape == "shirt":
                d.line((272, 290, 528, 290), fill=seam, width=3)
            if shape == "hoodie":
                d.arc((320, 90, 480, 300), 200, 340, fill=seam, width=5)

        text = spec.get("front") if view == "front" else spec.get("back")
        if text == "dots":
            rnd = random.Random(7)
            for _ in range(70):
                x, y = rnd.randint(280, 520), rnd.randint(260, 770)
                d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=accent)
        elif text == "pocket":
            d.rectangle((440, 300, 510, 380), outline=seam, width=5)
        elif text == "•":
            d.ellipse((448, 290, 470, 312), fill=accent)
        elif text in ("★", "♥"):
            f = font(SYMBOL, 150)
            d.text((400, 470), text, font=f, fill=accent, anchor="mm")
        elif text:
            size = 74 if len(text) <= 8 else 54
            f = font(ANTON, size)
            y = 420 if view == "front" else 400
            d.text((400, y), text, font=f, fill=accent, anchor="mm")
            if spec.get("pattern") == "graphic" and view == "back":
                d.ellipse((330, 470, 470, 610), outline=accent, width=10)

    if shape in ("pants", "jeans", "shorts"):
        d.rectangle((282, 165 if shape != "shorts" else 250, 518, 205 if shape != "shorts" else 290), fill=shade(base, 0.9))
        top = 205 if shape != "shorts" else 290
        if view == "front":
            d.line((400, top, 400, top + 120), fill=seam, width=4)
            d.arc((282, top - 10, 360, top + 90), 0, 90, fill=seam, width=4)
            d.arc((440, top - 10, 518, top + 90), 90, 180, fill=seam, width=4)
        else:
            d.rectangle((300, top + 40, 370, top + 120), outline=seam, width=4)
            d.rectangle((430, top + 40, 500, top + 120), outline=seam, width=4)
        if shape == "jeans":
            # Contrast stitching just inside each outer seam (282→252 and 518→548).
            for x_top, x_bottom, inset in ((282, 252, 10), (518, 548, -10)):
                for y in range(top + 20, 880, 22):
                    t = (y - 165) / (900 - 165)
                    x = x_top + (x_bottom - x_top) * t + inset
                    d.line((x, y, x, y + 10), fill=accent, width=2)
            for x in (300, 360, 440, 500):
                d.rectangle((x, 160, x + 8, 210), fill=shade(base, 0.85))
            d.ellipse((392, 172, 408, 188), fill=accent)

    if shape == "skirt":
        d.rectangle((300, 260, 500, 290), fill=shade(base, 0.85))
        for x in range(320, 500, 36):
            d.line((x, 290, x + (x - 400) * 0.45, 700), fill=seam, width=3)
    if shape == "dress":
        d.line((310, 450, 490, 450), fill=seam, width=4)
    if shape == "tote":
        d.rectangle((220, 380, 580, 420), fill=shade(base, 0.85))
        text = spec.get("front") if view == "front" else None
        if text:
            d.text((400, 620), text, font=font(SYMBOL, 120), fill=accent, anchor="mm")
    if shape == "sneaker":
        d.rounded_rectangle((140, 640, 700, 700), radius=24, fill=shade(accent, 1.25))
        d.line((150, 660, 690, 660), fill=accent, width=4)
        for i in range(5):
            x = 300 + i * 34
            d.line((x, 450 + i * 4, x + 26, 500 + i * 4), fill=accent, width=6)
        d.arc((380, 470, 620, 640), 200, 330, fill=accent, width=10)
        if view == "back":
            d.rectangle((150, 560, 200, 640), fill=shade(base, 0.85))
    if shape == "cap":
        if view == "front":
            d.line((400, 345, 400, 520), fill=seam, width=3)
            if spec.get("front"):
                d.text((400, 450), spec["front"], font=font(ANTON, 60), fill=accent, anchor="mm")
        else:
            d.chord((340, 470, 460, 540), 180, 360, fill=(220, 216, 210))
            d.rectangle((370, 500, 430, 512), fill=accent)
        d.ellipse((388, 334, 412, 356), fill=shade(base, 0.85))
    if shape == "beanie":
        for x in range(255, 545, 14):
            d.line((x, 480, x, 590), fill=seam, width=3)
        if spec.get("front") and view == "front":
            d.rectangle((360, 505, 440, 560), fill=accent)


def garment_photo(spec, view, seed):
    img = backdrop(seed)
    mask = body_mask(spec, view)
    shadow = mask.filter(ImageFilter.GaussianBlur(18))
    shadow_layer = Image.new("RGB", (W, H), (120, 115, 108))
    offset = Image.new("L", (W, H), 0)
    offset.paste(shadow.point(lambda v: int(v * 0.55)), (14, 22))
    img = Image.composite(shadow_layer, img, offset)

    cloth = fabric(spec, seed)
    # Gentle light from the top left.
    light = Image.new("L", (W, H), 0)
    ImageDraw.Draw(light).ellipse((-100, -200, 700, 700), fill=60)
    light = light.filter(ImageFilter.GaussianBlur(160))
    cloth = Image.composite(Image.new("RGB", (W, H), (255, 255, 255)), cloth, light)
    img = Image.composite(cloth, img, mask)
    decorate(img, spec, view)

    edge = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(3))
    img = Image.composite(Image.new("RGB", (W, H), shade(hex_rgb(spec["color"]), 0.62)), img, edge.point(lambda v: min(v, 150)))
    return mark(img)


def label_photo(spec, brand, size_label, seed):
    img = fabric(dict(spec, pattern="solid" if spec.get("pattern") == "graphic" else spec.get("pattern")), seed)
    img = img.resize((W, H)).filter(ImageFilter.GaussianBlur(1))
    d = ImageDraw.Draw(img)
    base = hex_rgb(spec["color"])
    d.arc((-200, -560, W + 200, 300), 0, 180, fill=shade(base, 0.7), width=30)
    dark_label = luminance(base) > 150
    bg = (24, 24, 26) if dark_label else (244, 241, 233)
    fg = (240, 236, 226) if dark_label else (30, 30, 34)
    box = (190, 300, 610, 640)
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).rectangle(box, fill=180)
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    sh_off = Image.new("L", (W, H), 0)
    sh_off.paste(sh, (8, 12))
    img = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), img, sh_off.point(lambda v: v // 2))
    d = ImageDraw.Draw(img)
    d.rectangle(box, fill=bg)
    for x in range(box[0] + 12, box[2] - 8, 18):
        d.line((x, box[1] + 8, x + 8, box[1] + 8), fill=fg, width=2)
        d.line((x, box[3] - 8, x + 8, box[3] - 8), fill=fg, width=2)
    name = (brand or "MADE IN USA").upper()
    size = 78
    f = font(ANTON, size)
    while d.textlength(name, font=f) > 360 and size > 30:
        size -= 4
        f = font(ANTON, size)
    d.text((400, 430), name, font=f, fill=fg, anchor="mm")
    d.text((400, 530), f"SIZE  {size_label}", font=font(SANS, 34), fill=fg, anchor="mm")
    d.text((400, 585), "100% COTTON", font=font(SANS, 20), fill=fg, anchor="mm")
    return mark(img)


def flaw_photo(spec, note, seed):
    img = fabric(dict(spec, pattern="solid" if spec.get("pattern") == "graphic" else spec.get("pattern")), seed + 3)
    img = img.resize((W, H))
    base = hex_rgb(spec["color"])
    rnd = random.Random(seed)
    d = ImageDraw.Draw(img)
    cx, cy = 400, 500
    if any(k in note for k in ("รู", "ขาด")):
        pts = [(cx + math.cos(a) * (26 + rnd.randint(-8, 8)), cy + math.sin(a) * (18 + rnd.randint(-6, 6)))
               for a in [i * math.pi / 9 for i in range(18)]]
        # A hole shows the light table underneath.
        d.polygon(pts, fill=(232, 228, 220))
        for _ in range(40):
            a = rnd.random() * math.tau
            r = 26 + rnd.random() * 10
            d.line((cx + math.cos(a) * r, cy + math.sin(a) * r * 0.7,
                    cx + math.cos(a) * (r + 14), cy + math.sin(a) * (r + 14) * 0.7), fill=shade(base, 1.25), width=2)
    elif any(k in note for k in ("ด่าง", "ซีด", "คราบ")):
        stain = Image.new("L", (W, H), 0)
        ImageDraw.Draw(stain).ellipse((cx - 90, cy - 60, cx + 80, cy + 70), fill=120)
        stain = stain.filter(ImageFilter.GaussianBlur(26))
        tint = shade(base, 0.7) if luminance(base) > 120 else shade(base, 1.6)
        img = Image.composite(Image.new("RGB", (W, H), tint), img, stain)
        d = ImageDraw.Draw(img)
    else:
        for _ in range(26):
            x = cx + rnd.randint(-60, 60)
            d.line((x, cy - 70, x + rnd.randint(-30, 30), cy + 80), fill=shade(base, 1.35), width=2)
    # Dashed ring pointing at the flaw.
    for i in range(0, 360, 14):
        a0, a1 = math.radians(i), math.radians(i + 8)
        d.arc((cx - 150, cy - 150, cx + 150, cy + 150), i, i + 8, fill=(250, 214, 92), width=6)
    d.text((cx, cy + 190), "FLAW", font=font(ANTON, 48), fill=(250, 214, 92), anchor="mm")
    return mark(img)


def save(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=78, method=6)
