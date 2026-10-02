"""Timeline + scene drawing for the 'Hand Embroidered T-Shirts' doodle reel.

Every voice line is Mansi's own recording (see prep.py). Times below are seconds on the reel timeline.
"""
import functools, json, math, os
import numpy as np
import soundfile as sf
import cairocffi as cairo
from doodle import *

V = json.load(open(f"{B}/voice.json"))
AT = {}


def put(vid, at):
    AT[vid] = at
    return at + V[vid]["dur"]


def end(vid):
    return AT[vid] + V[vid]["dur"]


def wt(vid, i):
    """Reel time at which word i of a voice line starts."""
    return AT[vid] + V[vid]["words"][i]["t"]


def widx(vid, word):
    return next(i for i, w in enumerate(V[vid]["words"]) if w["w"].lower().strip(".,?!") == word)


# ---------------------------------------------------------------- timeline
t = put("hi", 0.40)
S2 = t + 0.25                      # "we don't do" (no voice)
S3 = S2 + 3.1                      # stitched by hand, in our village
t = put("every", S3 + 0.12)
t = put("made", t + 0.06)
S4 = t + 0.35                      # founder's design diary
t = put("mistake", S4 + 0.45)
t = put("tiny", t + 1.05)
t = put("thousand", t + 0.12)
t = put("thicker", t + 0.22)
S5 = t + 0.35                      # a week / mix of stitches / final piece
t = put("week", S5 + 0.25)
t = put("mix", t + 0.35)
REVEAL = t + 0.10
S6 = REVEAL + 1.7                  # 100+ designs montage
CARD0 = S6 + 1.05
CARD_DUR = 0.78
CARDS = [
    # title, tee colour, [(sticker, dx, dy, size, rot)], caption, background, optional product photo slug
    ("EAGLE TEE", BLACK_TEE, [("eagle", 0, -10, 300, -6)], "main character energy", BG_SKY, "eagle"),
    ("LAZY JUNGLE TALES", BLACK_TEE, [("sloth", 0, -10, 300, 4)], "me on a monday", BG_MINT, "lazy-jungle"),
    ("BUMBLEBEE", BLACK_TEE, [("honeybee", 0, -10, 290, -8)], "bee-autiful (sorry)", BG_YEL, "bumblebee"),
    ("OCTOPUS", WHITE, [("octopus", 0, -10, 300, 5)], "8 arms. 0 machines.", BG_LAV, "octopus"),
    ("APPLE TEE", BLACK_TEE, [("red-apple", -20, -10, 270, -4), ("worm", 85, -95, 140, 18)],
     "yes, the worm is on purpose", BG_PINK, "apple"),
    ("MEADOW HERD", BLACK_TEE, [("sunflower", -80, -40, 190, -10), ("cow", 50, 20, 250, 6)],
     "a cow in sunflowers. iconic.", BG_ORANGE, "meadow-herd"),
    ("MATCH DAY", WHITE, [("soccer-ball", 0, -10, 270, 0)], "for the football fans", BG_SKY, "match-day"),
]
S7 = CARD0 + CARD_DUR * len(CARDS)  # custom name
t = put("perry", S7 + 0.5)
t = put("excited", t + 0.25)
S8 = t + 0.35                      # this is your sign + end card
t = put("sign", S8 + 0.35)
t = put("go", t + 0.08)
OUTRO = t + 0.15
END = OUTRO + 2.6

# clean source ranges: the original reels have white flash / black transitions just outside these
CLEAN = {"v3_every": (21.04, 25.3), "v3_perry": (9.8, 13.28), "v3_excited": (14.86, 20.42), "v2_final": (36.7, 38.45)}

SCENES = [(0.0, "s1"), (S2, "s2"), (S3, "s3"), (S4, "s4"), (S5, "s5"), (S6, "s6"), (S7, "s7"), (S8, "s8")]
WIPES = [(S3, YEL), (S4, LAV), (S5, MINT), (S7, PINK), (S8, YEL)]   # scribble wipes centred on the cut
WIPE_HALF = 0.2
PUNCH = [S2, S6]                                                     # hard cuts with a zoom punch
NO_CAPTIONS = {"hi", "sign", "go"}                                   # big on-screen text says it already

# ---------------------------------------------------------------- sound cues (time, name, gain)
CUES = []
SHAKES = []


def cue(t, name, gain=1.0):
    CUES.append((round(t, 3), name, gain))


# s1
cue(0.0, "whoosh", 0.6); cue(0.14, "boing", 0.55); cue(0.50, "pop", 0.6); cue(0.66, "squeak", 0.45)
cue(0.78, "pop", 0.45); cue(1.05, "pop", 0.6); cue(1.18, "ding", 0.4); cue(1.45, "boom", 0.9)
cue(1.62, "pop", 0.5); cue(2.38, "stamp", 0.9)
SHAKES += [(1.45, 16), (2.38, 10)]
# s2
cue(S2, "whoosh", 0.7)
for i in range(3):
    cue(S2 + 0.35 + 0.62 * i, "pop", 0.55)
    cue(S2 + 0.65 + 0.62 * i, "buzzer", 0.45)
cue(S2 + 2.25, "ding", 0.55)
SHAKES += [(S2, 9)]
# s3
cue(S3 + 0.55, "boing", 0.4); cue(AT["every"] + 1.6, "paper", 0.6); cue(S3 + 0.9, "pop", 0.4)
cue(wt("made", 3), "sparkle", 0.5)
# s4
MISTAKE_T = wt("mistake", widx("mistake", "mistake"))
cue(AT["mistake"] - 0.32, "scratch", 0.65); cue(MISTAKE_T + 0.05, "boom", 0.85); cue(end("mistake") + 0.08, "trombone", 0.5)
SHAKES += [(MISTAKE_T + 0.05, 18)]
TINY_CIRCLE = wt("tiny", widx("tiny", "were"))                      # after "French knots" so it can't mask them
cue(TINY_CIRCLE, "squeak", 0.35); cue(wt("tiny", widx("tiny", "small")), "pop", 0.55)
for k in range(24):
    cue(AT["thousand"] + 0.06 * k, "tick", 0.18 + 0.01 * k)
cue(wt("thousand", 0), "pop", 0.55)
THICK_T = wt("thicker", widx("thicker", "thicker"))
cue(THICK_T, "ding", 0.5)
# s5
for i in range(7):
    cue(AT["week"] + 0.1 + 0.13 * i, "tick", 0.22)
cue(AT["week"] + 1.05, "stamp", 0.6)
STITCH_TAGS = [("FRENCH KNOTS", 205, 560, "mix", -5), ("LAZY DAISY", 880, 720, "embroidery", 5),
               ("KANTHA", 175, 960, "stitches", -4), ("RUNNING STITCH", 845, 1185, "capturing", 4)]
for tag in STITCH_TAGS:
    cue(wt("mix", widx("mix", tag[3])), "pop", 0.5)
cue(wt("mix", widx("mix", "cloudy")), "whoosh", 0.35)
cue(REVEAL, "sparkle", 0.6); cue(REVEAL + 0.1, "ding", 0.45)
# s6
cue(S6, "boom", 0.9); cue(S6 + 0.25, "pop", 0.55); cue(S6 + 0.4, "pop", 0.55)
SHAKES += [(S6, 16)]
for i in range(len(CARDS)):
    cue(CARD0 + i * CARD_DUR, "whoosh", 0.4); cue(CARD0 + i * CARD_DUR + 0.13, "pop", 0.5)
# s7
cue(S7 + 0.05, "boom", 0.7); cue(S7 + 0.7, "ding", 0.4)
SHAKES += [(S7 + 0.05, 10)]
cue(wt("perry", widx("perry", "perry")), "sparkle", 0.5)
cue(wt("excited", widx("excited", "excited")), "pop", 0.5)
cue(wt("excited", widx("excited", "clothing")), "squeak", 0.45)
# s8
cue(S8 + 0.05, "boing", 0.55); cue(AT["sign"] + 0.15, "ding", 0.55); cue(AT["go"], "tap", 0.7)
cue(wt("go", widx("go", "link")), "pop", 0.5); cue(OUTRO, "whoosh", 0.5); cue(OUTRO + 0.1, "sparkle", 0.6)
cue(OUTRO + 0.35, "pop", 0.5)
for tw, _ in WIPES:
    cue(tw - WIPE_HALF, "whoosh", 0.55)


# ---------------------------------------------------------------- helpers
@functools.lru_cache(maxsize=None)
def _env(vid):
    a, sr = sf.read(f"{B}/voice/{vid}.wav", dtype="float32")
    n = sr // 30
    r = np.sqrt(np.convolve(a ** 2, np.ones(n) / n, mode="same"))[::n // 2]
    return r / (r.max() + 1e-9), sr / (n // 2)


def venv(vid, t):
    """0..1 loudness of a voice line at reel time t (drives the 'talking' bob)."""
    if vid not in AT or not (AT[vid] <= t < end(vid)):
        return 0.0
    e, rate = _env(vid)
    return float(e[min(len(e) - 1, int((t - AT[vid]) * rate))])


def STY(fill_c, sw=8, shadow=INK, off=(6, 8)):
    return dict(fill=fill_c, stroke=INK, sw=sw, shadow=shadow, sh_off=off)


PLAIN = dict(fill=INK)


def head(ctx, parts, y, t, t0, size=96, rot=0.0, fname="lucky", t1=None):
    if t1 is not None and t >= t1:
        s = 1 - ease_out_cubic((t - t1) / 0.15)
    else:
        s = pop(t, t0, 0.3)
    if s > 0:
        rich_line(ctx, parts, 540, y, size, fname, s, rot)


def tag_box(ctx, txt, cx, cy, t, t0, key, rot=0.0, fname="gochi", size=52, fill_c=WHITE, ink=INK, txt_c=INK,
            stitch=None, pad=34):
    s = pop(t, t0, 0.3)
    if s <= 0:
        return
    w = text_width(txt, fname, size) + 2 * pad
    h = size * 1.55
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(math.radians(rot))
    ctx.scale(s, s)
    sd = seed_of(key, boil(t))
    wobbly_box(ctx, 0, 0, w, h, sd, fill_c, ink, 6, 18, shadow=INK)
    text(ctx, txt, 0, -4 if stitch else 0, fname, size, txt_c)
    if stitch:
        dashes(ctx, wobble(densify([(-w / 2 + 26, h / 2 - 14), (w / 2 - 26, h / 2 - 14)], 6), sd, 1.5), stitch, 5, 14, 9)
    ctx.restore()


def sparkles(ctx, pts, t, t0, key, color=WHITE, size=34):
    for i, (x, y) in enumerate(pts):
        s = pop(t, t0 + 0.07 * i, 0.3)
        if s <= 0:
            continue
        sd = seed_of(key, i, boil(t))
        r = size * s * (0.85 + 0.15 * math.sin(t * 6 + i))
        doodle(ctx, sparkle(x, y, r), sd, INK, 5, 1.6, closed=True, fill_color=color, fill_off=(0, 0))


# ---------------------------------------------------------------- background
@functools.lru_cache(maxsize=1)
def _paper_noise():
    rng = np.random.default_rng(7)
    n = rng.normal(0, 1, (H // 4, W // 4)).astype(np.float32)
    from PIL import Image, ImageFilter
    im = Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    im = im.filter(ImageFilter.GaussianBlur(1.2))
    fine = rng.normal(0, 1, (H, W)).astype(np.float32) * 0.5
    return (np.asarray(im, np.float32) - 128) / 40 + fine


@functools.lru_cache(maxsize=12)
def bg_surface(color, variant):
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    ctx.set_source_rgba(*rgb(color))
    ctx.paint()
    dark = sum(color) < 200
    tone = tuple(min(255, c + 22) for c in color) if dark else tuple(int(c * 0.9) for c in color)
    tone2 = tuple(min(255, c + 30) for c in color) if dark else tuple(int(c * 0.86) for c in color)
    ctx.set_source_rgba(*rgb(tone))
    for y in range(40, H, 54):
        for x in range(27, W, 54):
            ctx.new_sub_path()
            ctx.arc(x, y, 2.3, 0, 2 * math.pi)
    ctx.fill()
    rng = np.random.default_rng(11)
    spots = [(70, 470), (1010, 600), (60, 1500), (1020, 1380), (980, 120), (90, 160), (1000, 1800), (80, 1830)]
    for i, (x, y) in enumerate(spots):
        sd = seed_of("bg", i, variant)
        kind = i % 4
        if kind == 0:
            pts = star(x, y, 26)
        elif kind == 1:
            pts = ellipse(x, y, 30, 30, 2.4, grow=-0.6)
        elif kind == 2:
            pts = heart(x, y, 26)
        else:
            pts = squiggle(x - 40, x + 40, y, 9, 2)
        stroke(ctx, wobble(pts, sd, 2.2, kind != 3), tone2, 4.5, 1.0, 1.0, kind in (0, 2))
    surf.flush()
    a = np.ndarray((H, W, 4), np.uint8, surf.get_data())
    k = _paper_noise()[..., None] * (2.2 if not dark else 3.0)
    a[..., :3] = np.clip(a[..., :3].astype(np.float32) + k, 0, 255).astype(np.uint8)
    surf.mark_dirty()
    return surf


def scene_at(t):
    name = SCENES[0][1]
    for s, n in SCENES:
        if t >= s:
            name = n
    return name


def bg_color(name, t):
    if name == "s6":
        if t < CARD0:
            return BG_YEL
        return CARDS[min(len(CARDS) - 1, int((t - CARD0) / CARD_DUR))][4]
    return {"s1": BG_YEL, "s2": BG_INK, "s3": BG_CREAM, "s4": BG_LAV, "s5": BG_MINT, "s7": BG_PINK, "s8": BG_YEL}[name]


# ---------------------------------------------------------------- scenes
MANSI_PATH = f"{B}/mansi_sticker.png"


def mansi(ctx, t, t0, cx, scale, vids, key):
    k = pop(t, t0, 0.55)
    if k <= 0:
        return
    bob = 1 + 0.02 * max(venv(v, t) for v in vids)
    rot = math.sin(t * 2.3) * 1.3
    blit(ctx, image(MANSI_PATH), cx, 1960 + (1 - k) * 1000, scale * bob, rot, anchor=(0.5, 1.0))


def s1(ctx, t):
    mansi(ctx, t, -0.3, 640, 0.56, ["hi"], "m1")
    sparkles(ctx, [(410, 1090), (905, 1120), (930, 1330), (385, 1350)], t, 0.4, "s1sp", WHITE, 30)
    # crown lands on her head
    k = pop(t, 1.15, 0.35)
    if k > 0:
        put_sticker(ctx, "crown", 610, 1110 - (1 - min(k, 1)) * 300, 175, t, 1.15, "crown", -14)
    # headline
    head(ctx, [("ONLY", PLAIN), ("A", PLAIN), ("FEW", PLAIN)], 215, t, -0.25, 104)
    head(ctx, [("BRANDS", PLAIN), ("MAKE", PLAIN)], 330, t, -0.12, 104)
    head(ctx, [("PURE", PLAIN), ("HANDMADE", STY(PINK))], 445, t, 0.48, 104)
    head(ctx, [("CLOTHES", PLAIN), ("WITH", PLAIN)], 560, t, 1.02, 104)
    head(ctx, [("WESTERN", STY(WHITE)), ("VIBES", STY(WHITE))], 685, t, 1.42, 116)
    # squiggle under HANDMADE
    gap = 0.28 * 104
    wp, wh = text_width("PURE", "lucky", 104), text_width("HANDMADE", "lucky", 104, 8)
    x0 = 540 - (wp + wh + gap) / 2 + wp + gap
    p = ease_out_cubic((t - 0.64) / 0.3)
    if p > 0:
        stroke(ctx, wobble(squiggle(x0 + 6, x0 + wh - 6, 512, 8, 5), seed_of("sq", boil(t)), 2), INK, 8, p)
    wv = text_width("WESTERN", "lucky", 116, 8) + text_width("VIBES", "lucky", 116, 8) + 0.28 * 116
    put_sticker(ctx, "smiling-face-with-sunglasses", 540 + wv / 2 - 20, 615, 115, t, 1.6, "sun", 14)
    # name tag + arrow
    tag_box(ctx, "Mansi Chaudhary", 205, 1175, t, 0.75, "nt", -5, "marker", 40, pad=26)
    tag_box(ctx, "founder, Vee Threads", 215, 1262, t, 0.9, "nt2", -5, "gochi", 38, fill_c=YEL, pad=22)
    p = ease_out_cubic((t - 0.95) / 0.25)
    if p > 0:
        body, tip = arrow((300, 1320), (420, 1260), 0.35, 26)
        sd = seed_of("ar1", boil(t))
        stroke(ctx, wobble(body, sd, 2), INK, 7, p)
        if p >= 1:
            stroke(ctx, wobble(tip, sd + 1, 1.5), INK, 7)
    # stamp
    if t >= 2.36:
        u = (t - 2.36) / 0.12
        s = 1 + 0.7 * (1 - ease_out_cubic(u))
        ctx.save()
        ctx.translate(540, 840)
        ctx.rotate(math.radians(-6))
        ctx.scale(s, s)
        sd = seed_of("stamp", boil(t))
        w = text_width("& WE'RE ONE OF THEM", "lucky", 62) + 70
        wobbly_box(ctx, 0, 0, w, 104, sd, WHITE, RED, 8, 14)
        text(ctx, "& WE'RE ONE OF THEM", 0, 4, "lucky", 62, RED)
        ctx.restore()


S2_ROWS = [("robot", ["MACHINE", "EMBROIDERY"]), ("printer", ["PRINTS"]), ("adhesive-bandage", ["IRON-ON", "PATCHES"])]


def s2(ctx, t):
    u = t - S2
    head(ctx, [("WE", STY(WHITE, 0, None)), ("DON'T", STY(YEL, 0, None)), ("DO:", STY(WHITE, 0, None))], 270, t,
         S2 + 0.02, 104)
    for i, (stk, lines) in enumerate(S2_ROWS):
        t0 = S2 + 0.35 + 0.62 * i
        y = 590 + 300 * i
        put_sticker(ctx, stk, 230, y, 230, t, t0, f"r{i}", -6 + 6 * i)
        s = pop(t, t0 + 0.05, 0.25)
        if s > 0:
            for j, ln in enumerate(lines):
                yy = y + (j - (len(lines) - 1) / 2) * 78
                text(ctx, ln, 390 + (1 - s) * 200, yy, "marker", 70, WHITE, anchor=(0, 0.5))
            # cross out
            tx = t0 + 0.3
            sd = seed_of("x", i, boil(t))
            for k, (a, b) in enumerate((((135, y - 95), (325, y + 95)), ((325, y - 95), (135, y + 95)))):
                p = ease_out_cubic((t - tx - 0.08 * k) / 0.1)
                if p > 0:
                    stroke(ctx, wobble(densify([a, b], 8), sd + k, 3), RED, 17, p)
            for j, ln in enumerate(lines):
                yy = y + (j - (len(lines) - 1) / 2) * 78
                p = ease_out_cubic((t - tx - 0.1 - 0.06 * j) / 0.15)
                if p > 0:
                    wl = text_width(ln, "marker", 70)
                    stroke(ctx, wobble(densify([(375, yy + 8), (400 + wl + 15, yy - 2)], 8), sd + 5 + j, 3), RED, 11, p)
    s = pop(t, S2 + 2.25, 0.3)
    if s > 0:
        rich_line(ctx, [("JUST", STY(YEL, 0, None)), ("2", STY(YEL, 0, None)), ("HANDS", STY(YEL, 0, None))], 540,
                  1430, 96, scale=s, rot=-2)
        rich_line(ctx, [("+", STY(WHITE, 0, None)), ("1", STY(WHITE, 0, None)), ("NEEDLE", STY(WHITE, 0, None))], 500,
                  1530, 76, scale=s, rot=-2)
        put_sticker(ctx, "sewing-needle", 800, 1515, 130, t, S2 + 2.35, "needle", 20)
    sparkles(ctx, [(980, 250), (90, 1260), (985, 1460)], t, S2 + 0.2, "s2sp", YEL, 26)


def s3(ctx, t):
    head(ctx, [("EVERY", PLAIN), ("TEE", PLAIN), ("IS", PLAIN)], 205, t, S3 + 0.03, 84)
    head(ctx, [("STITCHED", PLAIN), ("BY", STY(PINK)), ("HAND", STY(PINK))], 305, t, S3 + 0.22, 84)
    s = pop(t, S3 + 0.08, 0.35)
    if t < AT["made"]:
        src, zoom = max(V["every"]["s"] + (t - AT["every"]), CLEAN["v3_every"][0]), 1.0
    else:
        src, zoom = V["made"]["s"] + (t - AT["made"]), 1.14
    footage_window(ctx, "v3_every", src, 540, 865, 800, 860, t, "f3", -1.5, zoom, LAV, focus=(0.5, 0.33), scale=s)
    # village pin + label
    k = pop(t, S3 + 0.55, 0.35)
    if k > 0:
        put_sticker(ctx, "round-pushpin", 175, 455 - (1 - min(k, 1)) * 250, 150, t, S3 + 0.55, "pin", -10)
    tag_box(ctx, "Bulandshahr, U.P.", 345, 545, t, S3 + 0.7, "loc", -4, "gochi", 44, YEL)
    put_sticker(ctx, "house-with-garden", 205, 1235, 150, t, S3 + 0.9, "house", -6)
    put_sticker(ctx, "sheaf-of-rice", 330, 1265, 120, t, S3 + 1.0, "rice", 8)
    # sticky note open loop
    t0 = AT["every"] + 1.6
    s = pop(t, t0, 0.3)
    if s > 0:
        ctx.save()
        ctx.translate(845, 470)
        ctx.rotate(math.radians(7))
        ctx.scale(s, s)
        sd = seed_of("sticky", boil(t))
        wobbly_box(ctx, 0, 0, 330, 175, sd, YEL, INK, 5, 6, shadow=INK)
        text(ctx, "#1 BEST-SELLER", 0, -30, "lucky", 40, INK)
        text(ctx, "IS AT THE END", 0, 25, "lucky", 40, PINK, INK, 4)
        ctx.restore()
    put_sticker(ctx, "eyes", 990, 575, 100, t, t0 + 0.12, "eyes", 6)
    # hearts burst on "you"
    t0 = wt("made", 3)
    if t >= t0:
        u = t - t0
        r = 140 + 420 * ease_out_cubic(u / 0.7)
        a = clamp(1.4 - u)
        for i in range(6):
            ang = math.radians(-150 + i * 24)
            blit(ctx, sticker("red-heart"), 540 + r * math.cos(ang), 820 + r * math.sin(ang) * 0.8,
                 (0.28 + 0.05 * (i % 2)) * min(1, u * 6), -12 + i * 6, a)


def s4_src(t):
    seq = ["mistake", "tiny", "thousand", "thicker"]
    cur = seq[0]
    for c in seq:
        if t >= AT[c]:
            cur = c
    if cur == "mistake" and end("mistake") <= t < AT["tiny"]:
        return V["mistake"]["e"] - 0.05      # freeze-frame on the mistake
    return V[cur]["s"] + min(t - AT[cur], V[cur]["dur"] + 0.3)


def s4(ctx, t):
    head(ctx, [("FOUNDER'S", PLAIN), ("DESIGN", PLAIN), ("DIARY", STY(YEL))], 215, t, S4 + 0.03, 72)
    put_sticker(ctx, "notebook", 125, 335, 120, t, S4 + 0.2, "nb", -12)
    s = pop(t, S4 + 0.08, 0.35)
    freeze = end("mistake") <= t < AT["tiny"]
    zoom = 1.0 + (0.1 * ease_out_cubic((t - end("mistake")) / 0.4) if freeze else 0)
    footage_window(ctx, "v2_diary", s4_src(t), 540, 860, 860, 880, t, "f4", 1.2, zoom, PINK, focus=(0.5, 0.45),
                   scale=s)
    # MISTAKE?! stamp, grimace, sweat
    if MISTAKE_T <= t < AT["tiny"] - 0.05:
        u = (t - MISTAKE_T) / 0.12
        sc = 1 + 0.8 * (1 - ease_out_cubic(u))
        ctx.save()
        ctx.translate(540, 790)
        ctx.rotate(math.radians(-10))
        ctx.scale(sc, sc)
        sd = seed_of("mst", boil(t))
        wobbly_box(ctx, 0, 6, 690, 190, sd, WHITE, RED, 10, 16)
        text(ctx, "MISTAKE?!", 0, 12, "lucky", 140, RED)
        ctx.restore()
    if t < AT["tiny"]:
        put_sticker(ctx, "grimacing-face", 880, 470, 180, t, MISTAKE_T + 0.1, "grim", 8)
        put_sticker(ctx, "sweat-droplets", 760, 420, 110, t, MISTAKE_T + 0.2, "sweat", -10)
    # too tiny
    if AT["tiny"] <= t < AT["thousand"]:
        u = t - AT["tiny"]
        x = 400 - 500 * (1 - ease_out_cubic(u / 0.3))
        p = ease_out_cubic((t - TINY_CIRCLE) / 0.35)
        if p > 0:
            stroke(ctx, wobble(ellipse(470, 880, 190, 165, 1.15), seed_of("tc", boil(t)), 3), RED, 9, p)
        blit(ctx, sticker("magnifying-glass-tilted-left"), x, 990, 0.8, -10)
        st = wt("tiny", widx("tiny", "small"))
        tag_box(ctx, "TOO TINY!", 760, 1190, t, st, "tt", 6, "lucky", 64, YEL)
        put_sticker(ctx, "pinching-hand", 945, 1090, 140, t, st + 0.08, "pinch", -8)
    # thousands of knots
    if AT["thousand"] <= t < AT["thicker"]:
        u = t - AT["thousand"]
        rng = np.random.default_rng(5)
        xs, ys = rng.uniform(160, 920, 110), rng.uniform(470, 1260, 110)
        for i in range(110):
            ti = i * 1.5 / 110
            s = pop(u, ti, 0.15)
            if s <= 0:
                break
            c = (WHITE, YEL, PINK, SKY)[i % 4]
            ctx.new_sub_path()
            ctx.arc(xs[i], ys[i], 13 * s, 0, 2 * math.pi)
            ctx.set_source_rgba(*rgb(c))
            ctx.fill_preserve()
            ctx.set_source_rgba(*rgb(INK))
            ctx.set_line_width(3)
            ctx.stroke()
        s = pop(t, wt("thousand", 0), 0.3)
        if s > 0:
            text(ctx, "1000s!!", 520, 600, "lucky", 150, YEL, INK, 9, INK, (8, 10), scale=s, rot=-6)
        put_sticker(ctx, "face-with-spiral-eyes", 880, 470, 170, t, wt("thousand", 0) + 0.1, "spiral", 10)
    # thicker thread
    if t >= AT["thicker"]:
        p = ease_out_cubic((t - AT["thicker"] - 0.2) / 0.5)
        if p > 0:
            stroke(ctx, wobble(squiggle(150, 930, 1268, 14, 6), seed_of("yarn", boil(t)), 2), MINT, 18, p)
        tag_box(ctx, "THICKER THREAD", 520, 1195, t, THICK_T, "thk", -3, "lucky", 62, MINT)
        put_sticker(ctx, "flexed-biceps", 905, 1100, 160, t, THICK_T + 0.1, "flex", 8)
        put_sticker(ctx, "yarn", 160, 1110, 150, t, AT["thicker"] + 0.3, "yarn", -8)
        put_sticker(ctx, "check-mark-button", 890, 470, 140, t, THICK_T + 0.2, "chk", 6)


def s5(ctx, t):
    if t < AT["mix"]:
        fid, src = "v2_paint", 21.35 + (t - AT["week"])          # painted close-up under "this week-long process"
    elif t < REVEAL:
        src = V["mix"]["s"] + (t - AT["mix"])
        fid = "v2_mixA" if 29.97 <= src < 32.47 else "v2_mixB"   # source cuts: close-ups 29.97-32.47
    else:
        fid, src = "v2_final", min(36.9 + (t - REVEAL), CLEAN["v2_final"][1])
    zoom = 1.0 + (0.05 * (t - REVEAL) if t >= REVEAL else 0)
    s = pop(t, S5 + 0.06, 0.35)
    footage_window(ctx, fid, src, 540, 905, 860, 880, t, "f5", -1.0, zoom, SKY, focus=(0.5, 0.45), scale=s)
    if t < AT["mix"] - 0.05:
        head(ctx, [("THIS", PLAIN), ("ONE", PLAIN), ("TOOK...", PLAIN)], 200, t, S5 + 0.03, 84)
        days = "MTWTFSS"
        for i, d in enumerate(days):
            s = pop(t, S5 + 0.1 + 0.04 * i, 0.25)
            if s <= 0:
                continue
            cx = 540 + (i - 3) * 116
            sd = seed_of("cal", i, boil(t))
            ctx.save()
            ctx.translate(cx, 320)
            ctx.scale(s, s)
            wobbly_box(ctx, 0, 0, 96, 92, sd, WHITE, INK, 5, 10)
            text(ctx, d, 0, 4, "lucky", 48, INK)
            p = ease_out_cubic((t - AT["week"] - 0.1 - 0.13 * i) / 0.1)
            if p > 0:
                stroke(ctx, wobble(densify([(-34, -32), (34, 32)], 6), sd, 2), RED, 9, p)
                stroke(ctx, wobble(densify([(34, -32), (-34, 32)], 6), sd + 1, 2), RED, 9, p)
            ctx.restore()
        if t >= AT["week"] + 1.05:
            u = (t - AT["week"] - 1.05) / 0.12
            sc = 1 + 0.7 * (1 - ease_out_cubic(u))
            text(ctx, "A WHOLE WEEK!", 540, 330, "lucky", 92, RED, WHITE, 8, INK, (6, 8), scale=sc, rot=-7)
        put_sticker(ctx, "hourglass-not-done", 960, 200, 120, t, S5 + 0.25, "hg", 10)
    elif t < REVEAL:
        head(ctx, [("A", PLAIN), ("MIX", PLAIN), ("OF", PLAIN), ("STITCHES", PLAIN)], 200, t, AT["mix"] - 0.05, 80)
        head(ctx, [("=", STY(PINK)), ("PURE", STY(PINK)), ("MAGIC", STY(PINK))], 305, t, AT["mix"] + 0.1, 84)
        put_sticker(ctx, "sparkles", 905, 300, 120, t, AT["mix"] + 0.25, "spk", 8)
        for i, (label, x, y, word, rot) in enumerate(STITCH_TAGS):
            tag_box(ctx, label, x, y, t, wt("mix", widx("mix", word)), f"st{i}", rot, "gochi", 50, WHITE,
                    stitch=(PINK, YEL, LAV, MINT)[i])
        tc = wt("mix", widx("mix", "cloudy"))
        if t >= tc:
            u = ease_out_cubic((t - tc) / 0.5)
            for j, (x0, x1, y, w) in enumerate(((-200, 230, 455, 230), (1300, 860, 500, 200))):
                sd = seed_of("cl", j, boil(t))
                doodle(ctx, cloud(x0 + (x1 - x0) * u, y, w), sd, INK, 6, 2, closed=True, fill_color=WHITE,
                       fill_off=(0, 0))
            put_sticker(ctx, "sun-behind-cloud", 540, 440, 150, t, tc + 0.15, "sunc", -6)
    else:
        head(ctx, [("THE", STY(WHITE, 8, PINK, (7, 9))), ("FINAL", STY(WHITE, 8, PINK, (7, 9))),
                   ("PIECE", STY(WHITE, 8, PINK, (7, 9)))], 230, t, REVEAL, 100)
        sparkles(ctx, [(120, 520), (960, 600), (110, 1100), (975, 1240), (300, 380), (800, 380)], t, REVEAL + 0.05,
                 "rv", YEL, 36)
        tag_box(ctx, "hand-embroidered + hand-painted", 540, 1425, t, REVEAL + 0.3, "hp", -2, "gochi", 50, WHITE)
        put_sticker(ctx, "artist-palette", 950, 1330, 130, t, REVEAL + 0.45, "pal", 10)


def product_photo(slug):
    for ext in ("jpg", "jpeg", "png", "webp"):
        p = f"{B}/products/{slug}.{ext}"
        if os.path.exists(p):
            return p
    return None


def card(ctx, t, i, u):
    title, tee_c, designs, caption, bg, slug = CARDS[i]
    sd = seed_of("card", i, boil(t))
    s = pop(u, 0.03, 0.25)
    if s > 0:
        text(ctx, title, 540, 290, "marker", 82 if len(title) < 14 else 70, INK, scale=s, rot=-2)
    e = ease_out_cubic(u / 0.2)
    x = 540 + 950 * (1 - e)
    rot = 9 * (1 - e) - 2
    photo = product_photo(slug)
    ctx.save()
    ctx.translate(x, 875)
    ctx.rotate(math.radians(rot))
    if photo:
        pts = rrect(0, 0, 720, 860, 14)
        fill(ctx, wobble(pts, sd + 1, 2, True), INK, 0.25, 16, 18)
        fill(ctx, wobble(pts, sd + 2, 2, True), WHITE)
        surf = image(photo, 640)
        ctx.save()
        ctx.new_path()
        ctx.rectangle(-320, -390, 640, 700)
        ctx.clip()
        k = max(640 / surf.get_width(), 700 / surf.get_height())
        ctx.translate(-surf.get_width() * k / 2, -40 - surf.get_height() * k / 2)
        ctx.scale(k, k)
        ctx.set_source_surface(surf, 0, 0)
        ctx.paint()
        ctx.restore()
        stroke(ctx, wobble(pts, sd, 2.4, True), INK, 8, closed=True)
    else:
        shade = tuple(int(c * 0.8) for c in bg)
        fill(ctx, wobble(tee(0, 0, 800), sd + 1, 3, True), shade, 1.0, 18, 20)
        fill(ctx, wobble(tee(0, 0, 800), sd + 2, 2, True), tee_c)
        stroke(ctx, wobble(tee(0, 0, 800), sd, 2.8, True), INK, 10, closed=True)
        dark = tee_c == BLACK_TEE
        # stitched ring around the design
        p = ease_out_cubic((u - 0.1) / 0.3)
        if p > 0:
            dashes(ctx, wobble(ellipse(0, -15, 210, 210, 1.0), sd + 4, 2), YEL if dark else PINK, 7, 20, 12, p)
        for j, (name, dx, dy, size, r) in enumerate(designs):
            k = pop(u, 0.12 + 0.05 * j, 0.25)
            if k > 0:
                blit(ctx, sticker(name), dx, dy, k * size / 300, r + math.sin(t * 7 + j) * 2)
        text(ctx, "vee threads", 0, 300, "caveat", 40, (200, 190, 180) if dark else (170, 160, 150), rot=-3)
    ctx.restore()
    sparkles(ctx, [(150, 520), (930, 1180)] if i % 2 else [(935, 520), (145, 1180)], t, CARD0 + i * CARD_DUR + 0.1,
             f"cs{i}", WHITE, 30)
    s = pop(u, 0.18, 0.25)
    if s > 0:
        ctx.save()
        ctx.translate(540, 1425)
        ctx.rotate(math.radians(-2 + (i % 2) * 4))
        ctx.scale(s, s)
        w = text_width(caption, "gochi", 64) + 70
        wobbly_box(ctx, 0, 0, w, 104, sd + 9, WHITE, INK, 6, 20, shadow=INK)
        text(ctx, caption, 0, 0, "gochi", 64, INK)
        ctx.restore()


def s6(ctx, t):
    if t < CARD0:
        sd = seed_of("b6", boil(t))
        s = pop(t, S6, 0.3)
        if s > 0:
            ctx.save()
            ctx.translate(540, 820)
            ctx.scale(s, s)
            doodle(ctx, burst(0, 0, 430, 16, 0.2), sd, INK, 8, 3, closed=True, fill_color=WHITE, fill_off=(0, 0))
            ctx.restore()
        s = pop(t, S6 + 0.02, 0.3)
        if s > 0:
            text(ctx, "100+ DESIGNS", 540, 760, "lucky", 122, INK, scale=s, rot=-4)
        s = pop(t, S6 + 0.25, 0.3)
        if s > 0:
            text(ctx, "ALL HAND-STITCHED", 540, 900, "lucky", 78, PINK, INK, 8, INK, (6, 8), scale=s, rot=-4)
        put_sticker(ctx, "exploding-head", 540, 1210, 260, t, S6 + 0.4, "boom", 0)
        return
    i = min(len(CARDS) - 1, int((t - CARD0) / CARD_DUR))
    card(ctx, t, i, t - CARD0 - i * CARD_DUR)


def s7(ctx, t):
    head(ctx, [("WAIT...", PLAIN), ("YOUR", PLAIN), ("NAME", PLAIN)], 205, t, S7 + 0.03, 88)
    head(ctx, [("ON", STY(PINK)), ("A", STY(PINK)), ("TEE?!", STY(PINK))], 315, t, S7 + 0.25, 100)
    put_sticker(ctx, "flushed-face", 935, 300, 150, t, S7 + 0.45, "flush", 10)
    s = pop(t, S7 + 0.7, 0.35)
    if s > 0:
        ctx.save()
        ctx.translate(140, 330)
        ctx.rotate(math.radians(-12 + math.sin(t * 2) * 4))
        ctx.scale(s, s)
        doodle(ctx, burst(0, 0, 100, 14, 0.18), seed_of("badge", boil(t)), INK, 6, 2, closed=True, fill_color=YEL,
               fill_off=(0, 0))
        text(ctx, "#1", 0, -14, "lucky", 60, INK)
        text(ctx, "BEST-SELLER", 0, 34, "lucky", 22, INK)
        ctx.restore()
    if t < AT["excited"]:
        fid, src, focus = "v3_perry", min(V["perry"]["s"] + (t - AT["perry"]), CLEAN["v3_perry"][1]), (0.5, 0.35)
    else:
        src = V["excited"]["s"] + (t - AT["excited"])
        fid, src, focus = "v3_excited", min(max(src, CLEAN["v3_excited"][0]), CLEAN["v3_excited"][1]), (0.5, 0.33)
    s = pop(t, S7 + 0.15, 0.35)
    footage_window(ctx, fid, src, 540, 895, 840, 880, t, "f7", 1.5, 1.0, YEL, focus=focus, scale=s)
    tp = wt("perry", widx("perry", "perry"))
    if t < AT["excited"]:
        tag_box(ctx, "PERRY", 285, 545, t, tp, "perry", -7, "caveat", 78, WHITE, txt_c=PINK)
        p = ease_out_cubic((t - tp - 0.1) / 0.25)
        if p > 0:
            body, tip = arrow((330, 610), (440, 730), -0.3, 26)
            sd = seed_of("ar7", boil(t))
            stroke(ctx, wobble(body, sd, 2), INK, 7, p)
            if p >= 1:
                stroke(ctx, wobble(tip, sd + 1, 1.5), INK, 7)
        put_sticker(ctx, "red-heart", 760, 540, 110, t, tp + 0.15, "h1", 12)
        put_sticker(ctx, "red-heart", 870, 650, 80, t, tp + 0.25, "h2", -10)
    else:
        put_sticker(ctx, "star-struck", 905, 520, 170, t, wt("excited", widx("excited", "excited")), "ss", 8)
        tc = wt("excited", widx("excited", "clothing"))
        s = pop(t, tc, 0.3)
        if s > 0:
            ctx.save()
            ctx.translate(845, 1170)
            ctx.rotate(math.radians(8))
            ctx.scale(s, s)
            sd = seed_of("mini", boil(t))
            fill(ctx, wobble(tee(0, 0, 340), sd + 1, 2, True), INK, 0.25, 10, 12)
            fill(ctx, wobble(tee(0, 0, 340), sd + 2, 2, True), WHITE)
            stroke(ctx, wobble(tee(0, 0, 340), sd, 2, True), INK, 7, closed=True)
            p = ease_out_cubic((t - tc - 0.15) / 0.6)
            if p > 0:
                ctx.save()
                ctx.new_path()
                ctx.rectangle(-110, -60, 220 * p, 120)
                ctx.clip()
                text(ctx, "your name", 0, -5, "caveat", 56, PINK, rot=-4)
                ctx.restore()
                dashes(ctx, densify([(-90, 32), (-90 + 180 * p, 30)], 6), PINK, 4, 10, 7)
            ctx.restore()
        put_sticker(ctx, "yellow-heart", 970, 1050, 90, t, tc + 0.3, "yh", 10)


def s8(ctx, t):
    mansi(ctx, t, S8 + 0.05, 600, 0.64, ["sign", "go"], "m8")
    sparkles(ctx, [(330, 1080), (880, 1100), (915, 1330), (300, 1320)], t, S8 + 0.3, "s8sp", WHITE, 30)
    if t < OUTRO:
        head(ctx, [("THIS", PLAIN), ("IS", PLAIN)], 230, t, AT["sign"] - 0.05, 100, t1=OUTRO - 0.15)
        head(ctx, [("YOUR", STY(WHITE, 8, PINK, (7, 9))), ("SIGN", STY(WHITE, 8, PINK, (7, 9)))], 355, t,
             AT["sign"] + 0.12, 124, -3, t1=OUTRO - 0.15)
        put_sticker(ctx, "sparkles", 930, 330, 130, t, AT["sign"] + 0.2, "spk8", 8)
        s = pop(t, AT["go"] - 0.03, 0.3)
        if s > 0:
            press = 1 - 0.07 * math.sin(math.pi * clamp((t - AT["go"] - 0.02) / 0.16))
            ctx.save()
            ctx.translate(560, 560)
            ctx.scale(s * press, s * press)
            sd = seed_of("btn", boil(t))
            wobbly_box(ctx, 0, 0, 720, 128, sd, PINK, INK, 8, 60, shadow=INK)
            text(ctx, "GO CUSTOMIZE NOW", 0, 4, "lucky", 62, WHITE, INK, 5)
            ctx.restore()
            put_sticker(ctx, "backhand-index-pointing-right", 140 + 18 * math.sin(t * 12), 560, 130, t,
                        AT["go"] + 0.05, "poke", 0)
        tl = wt("go", widx("go", "link"))
        s = pop(t, tl, 0.3)
        if s > 0:
            text(ctx, "LINK IN BIO", 520, 705, "lucky", 66, INK, scale=s, rot=-3)
            p = ease_out_cubic((t - tl - 0.1) / 0.25)
            body, tip = arrow((760, 720), (835, 640), 0.25, 24)
            sd = seed_of("ar8", boil(t))
            stroke(ctx, wobble(body, sd, 2), INK, 7, p)
            if p >= 1:
                stroke(ctx, wobble(tip, sd + 1, 1.5), INK, 7)
    else:
        s = pop(t, OUTRO, 0.4)
        ctx.save()
        ctx.translate(540, 520)
        ctx.rotate(math.radians(-2))
        ctx.scale(s, s)
        sd = seed_of("end", boil(t))
        wobbly_box(ctx, 0, 0, 940, 560, sd, WHITE, INK, 9, 30, shadow=PINK)
        text(ctx, "veethreads.com", 0, -170, "marker", 92, INK)
        stroke(ctx, wobble(squiggle(-300, 300, -95, 8, 6), sd + 3, 2), PINK, 8)
        text(ctx, "@vee.threads", 0, -15, "lucky", 70, PINK, INK, 6, INK, (5, 6))
        text(ctx, "from our village to your hearts", 0, 95, "gochi", 54, INK)
        text(ctx, "handmade in India  -  ships worldwide", 0, 175, "gochi", 44, (90, 82, 76))
        ctx.restore()
        put_sticker(ctx, "yellow-heart", 935, 815, 100, t, OUTRO + 0.3, "yh8", 10)
        put_sticker(ctx, "globe-showing-asia-australia", 150, 770, 110, t, OUTRO + 0.4, "globe", -8)
        put_sticker(ctx, "party-popper", 925, 1240, 160, t, OUTRO + 0.35, "party", 8)


SCENE_FN = dict(s1=s1, s2=s2, s3=s3, s4=s4, s5=s5, s6=s6, s7=s7, s8=s8)


# ---------------------------------------------------------------- overlays
@functools.lru_cache(maxsize=None)
def caption_chunks(vid):
    ws = V[vid]["words"]
    out, cur = [], []
    for i, w in enumerate(ws):
        cur.append(i)
        txt = " ".join(ws[j]["w"] for j in cur)
        if len(cur) >= 3 or len(txt) >= 14 or w["w"][-1] in ".,?!":
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def captions(ctx, t):
    for vid in AT:
        if vid in NO_CAPTIONS or not (AT[vid] - 0.1 <= t < end(vid) + 0.25):
            continue
        ws = V[vid]["words"]
        chunks = caption_chunks(vid)
        for ci, ch in enumerate(chunks):
            t0 = wt(vid, ch[0]) - 0.06
            t1 = wt(vid, chunks[ci + 1][0]) - 0.06 if ci + 1 < len(chunks) else end(vid) + 0.25
            if not (t0 <= t < t1):
                continue
            cur = max([j for j in ch if wt(vid, j) <= t + 0.03] or [ch[0]])
            parts = []
            for j in ch:
                wd = ws[j]["w"].upper().rstrip(".,")
                parts.append((wd, STY(YEL if j == cur else WHITE, 9, INK, (0, 8))))
            size = 86
            total = sum(text_width(p[0], "lucky", size, 9) for p in parts) + 0.28 * size * (len(parts) - 1)
            if total > 960:
                size = int(size * 960 / total)
            s = 0.75 + 0.25 * ease_out_back((t - t0) / 0.14)
            rich_line(ctx, parts, 540, 1452, size, "lucky", s, (-2, 2)[ci % 2])


def progress(ctx, t):
    p = clamp(t / END)
    x0, x1, y = 60, 1020, 62
    dark = scene_at(t) == "s2"
    stroke(ctx, densify([(x0, y), (x1, y)], 10), WHITE if dark else INK, 3, alpha=0.18)
    if p > 0:
        dashes(ctx, wobble(densify([(x0, y), (x0 + (x1 - x0) * p, y)], 8), seed_of("pg", boil(t)), 1.2),
               YEL if dark else PINK, 7, 16, 10)
    blit(ctx, sticker("sewing-needle"), x0 + (x1 - x0) * p + 18, y - 2, 0.32, 0)


def _wipe_path():
    pts, y, k = [], -260, 0
    while y < H + 300:
        pts += [(-260, y), (W + 260, y + 170)] if k % 2 == 0 else [(W + 260, y), (-260, y + 170)]
        y += 260
        k += 1
    return densify(pts, 12)


WIPE_PTS = _wipe_path()


def wipe(ctx, t):
    for tw, color in WIPES:
        if tw - WIPE_HALF <= t < tw + WIPE_HALF:
            sd = seed_of("wipe", tw)
            pts = wobble(WIPE_PTS, sd, 16)
            if t < tw:
                stroke(ctx, pts, color, 420, ease_in_out((t - tw + WIPE_HALF) / WIPE_HALF))
                stroke(ctx, pts, INK, 10, ease_in_out((t - tw + WIPE_HALF) / WIPE_HALF), 0.35)
            else:
                q = ease_in_out((t - tw) / WIPE_HALF)
                stroke(ctx, pts[::-1], color, 420, 1 - q)


def shake(t):
    dx = dy = 0.0
    for t0, amp in SHAKES:
        u = t - t0
        if 0 <= u < 0.32:
            k = amp * (1 - u / 0.32) ** 2
            rng = np.random.default_rng(seed_of("sh", int(t * FPS)))
            dx += rng.uniform(-k, k)
            dy += rng.uniform(-k, k)
    return dx, dy


def punch(t):
    for t0 in PUNCH:
        if 0 <= t - t0 < 0.22:
            return 1.08 - 0.08 * ease_out_cubic((t - t0) / 0.22)
    return 1.0
