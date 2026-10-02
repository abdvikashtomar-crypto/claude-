"""Hand-drawn drawing kit on top of cairo: wobbly 'boiling' strokes, stickers, text and footage windows."""
import functools, json, math, os
import numpy as np
import cairocffi as cairo
from PIL import Image, ImageDraw, ImageFont

WORK = os.environ["WORK"]
B = f"{WORK}/build"
FONTS = f"{WORK}/assets/fonts"
W, H, FPS = 1080, 1920, 30

INK = (28, 25, 23)
WHITE = (255, 255, 255)
CREAM = (251, 243, 228)
YEL = (255, 210, 63)
PINK = (255, 94, 135)
LAV = (155, 124, 214)
MINT = (72, 201, 145)
SKY = (89, 176, 255)
ORANGE = (255, 140, 66)
RED = (232, 52, 48)
BLACK_TEE = (42, 38, 35)

BG_YEL = (255, 216, 77)
BG_CREAM = (251, 243, 228)
BG_LAV = (232, 222, 255)
BG_MINT = (217, 245, 230)
BG_PINK = (255, 225, 234)
BG_SKY = (220, 238, 255)
BG_ORANGE = (255, 228, 204)
BG_INK = (31, 27, 24)


def rgb(c, a=1.0):
    return (c[0] / 255, c[1] / 255, c[2] / 255, a)


# ---------------------------------------------------------------- easing / timing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out_cubic(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = clamp(x)
    return 3 * x * x - 2 * x * x * x


def ease_out_back(x, s=1.9):
    x = clamp(x)
    return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2


def pop(t, t0, dur=0.28):
    """0 before t0, overshooting 0->1 scale over dur."""
    if t < t0:
        return 0.0
    return ease_out_back((t - t0) / dur)


def boil(t, fps=8):
    """Index that changes `fps` times a second: re-seeds jitter for the hand-drawn 'boil'."""
    return int(t * fps)


def seed_of(*keys):
    h = 2166136261
    for k in keys:
        for ch in str(k):
            h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return h


# ---------------------------------------------------------------- wobbly paths
def densify(pts, step=6.0, closed=False):
    pts = np.asarray(pts, float)
    if closed:
        pts = np.vstack([pts, pts[:1]])
    out = []
    for a, b in zip(pts[:-1], pts[1:]):
        n = max(1, int(np.hypot(*(b - a)) / step))
        for i in range(n):
            out.append(a + (b - a) * i / n)
    out.append(pts[-1])
    return np.array(out)


def smooth_noise(n, seed, period=60.0, closed=False):
    rng = np.random.default_rng(seed)
    k = max(3, int(n / max(1.0, period / 6.0)) + 3)
    ctrl = rng.uniform(-1, 1, (k, 2))
    if closed:
        ctrl[-1] = ctrl[0]
    xs = np.linspace(0, k - 1, n)
    i = np.floor(xs).astype(int).clip(0, k - 2)
    f = xs - i
    f = f * f * (3 - 2 * f)
    return ctrl[i] * (1 - f)[:, None] + ctrl[i + 1] * f[:, None]


def wobble(pts, seed, amp=3.0, closed=False):
    pts = np.asarray(pts, float)
    return pts + smooth_noise(len(pts), seed, closed=closed) * amp


def trace(ctx, pts, prog=1.0):
    pts = np.asarray(pts, float)
    if prog < 1.0:
        seg = np.hypot(*np.diff(pts, axis=0).T)
        cum = np.concatenate([[0], np.cumsum(seg)])
        L = cum[-1] * clamp(prog)
        k = int(np.searchsorted(cum, L))
        if k <= 0:
            return False
        last = pts[k - 1] + (pts[k] - pts[k - 1]) * ((L - cum[k - 1]) / max(seg[k - 1], 1e-6)) if k < len(pts) else pts[-1]
        pts = np.vstack([pts[:k], last])
    ctx.move_to(*pts[0])
    for p in pts[1:]:
        ctx.line_to(*p)
    return True


def stroke(ctx, pts, color=INK, width=7.0, prog=1.0, alpha=1.0, closed=False):
    if prog <= 0:
        return
    ctx.new_path()
    if not trace(ctx, pts, prog):
        return
    if closed and prog >= 1.0:
        ctx.close_path()
    ctx.set_source_rgba(*rgb(color, alpha))
    ctx.set_line_width(width)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.stroke()


def fill(ctx, pts, color, alpha=1.0, dx=0, dy=0):
    ctx.new_path()
    trace(ctx, np.asarray(pts) + [dx, dy])
    ctx.close_path()
    ctx.set_source_rgba(*rgb(color, alpha))
    ctx.fill()


def dashes(ctx, pts, color, width=6, on=18, off=12, prog=1.0, alpha=1.0):
    """Running-stitch line."""
    pts = np.asarray(pts, float)
    seg = np.hypot(*np.diff(pts, axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    L = cum[-1] * clamp(prog)
    ctx.new_path()
    d = 0.0
    while d < L:
        a, b = d, min(d + on, L)
        pa = np.array([np.interp(a, cum, pts[:, 0]), np.interp(a, cum, pts[:, 1])])
        pb = np.array([np.interp(b, cum, pts[:, 0]), np.interp(b, cum, pts[:, 1])])
        ctx.move_to(*pa)
        ctx.line_to(*pb)
        d += on + off
    ctx.set_source_rgba(*rgb(color, alpha))
    ctx.set_line_width(width)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.stroke()


# ---------------------------------------------------------------- shapes (return point arrays)
def rrect(cx, cy, w, h, r=24, step=7):
    x0, y0, x1, y1 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
    pts = []
    for (ax, ay, a0) in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for k in range(7):
            a = math.radians(a0 + k * 15)
            pts.append((ax + r * math.cos(a), ay + r * math.sin(a)))
    return densify(pts, step, closed=True)


def ellipse(cx, cy, rx, ry, turns=1.0, start=-90, n=None, grow=0.0):
    n = n or int(max(rx, ry) * turns * 0.9) + 24
    a = np.radians(start) + np.linspace(0, 2 * np.pi * turns, n)
    g = 1 + grow * np.linspace(0, 1, n)
    return np.stack([cx + rx * g * np.cos(a), cy + ry * g * np.sin(a)], 1)


def star(cx, cy, r, k=5, inner=0.45, rot=-90):
    pts = []
    for i in range(2 * k):
        rr = r if i % 2 == 0 else r * inner
        a = math.radians(rot + i * 180 / k)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return densify(pts, 5, closed=True)


def sparkle(cx, cy, r):
    a = np.linspace(0, 2 * np.pi, 80)
    x = np.sign(np.cos(a)) * np.abs(np.cos(a)) ** 3
    y = np.sign(np.sin(a)) * np.abs(np.sin(a)) ** 3
    return np.stack([cx + r * x, cy + r * y], 1)


def heart(cx, cy, s):
    a = np.linspace(0, 2 * np.pi, 90)
    x = 16 * np.sin(a) ** 3
    y = -(13 * np.cos(a) - 5 * np.cos(2 * a) - 2 * np.cos(3 * a) - np.cos(4 * a))
    return np.stack([cx + x * s / 17, cy + y * s / 17], 1)


def arrow(p0, p1, bend=0.25, head=34):
    p0, p1 = np.array(p0, float), np.array(p1, float)
    d = p1 - p0
    c = (p0 + p1) / 2 + np.array([-d[1], d[0]]) * bend
    t = np.linspace(0, 1, 50)[:, None]
    body = (1 - t) ** 2 * p0 + 2 * (1 - t) * t * c + t ** 2 * p1
    tang = body[-1] - body[-6]
    ang = math.atan2(tang[1], tang[0])
    h1 = p1 + head * np.array([math.cos(ang + 2.6), math.sin(ang + 2.6)])
    h2 = p1 + head * np.array([math.cos(ang - 2.6), math.sin(ang - 2.6)])
    return body, densify([h1, p1, h2], 5)


def squiggle(x0, x1, y, amp=10, waves=5):
    x = np.linspace(x0, x1, 120)
    return np.stack([x, y + amp * np.sin(np.linspace(0, 2 * np.pi * waves, 120))], 1)


def burst(cx, cy, r, spikes=14, depth=0.28):
    pts = []
    for i in range(spikes * 2):
        rr = r if i % 2 == 0 else r * (1 - depth)
        a = 2 * np.pi * i / (spikes * 2)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return densify(pts, 6, closed=True)


TEE = [(-0.15, -0.50), (-0.33, -0.46), (-0.53, -0.29), (-0.43, -0.10), (-0.32, -0.17), (-0.32, 0.52),
       (0.32, 0.52), (0.32, -0.17), (0.43, -0.10), (0.53, -0.29), (0.33, -0.46), (0.15, -0.50)]


def tee(cx, cy, s):
    neck = [(0.15 - 0.3 * k / 10, -0.50 + 0.10 * math.sin(math.pi * k / 10)) for k in range(1, 10)]
    pts = np.array(TEE + neck) * s + [cx, cy]
    return densify(pts, 7, closed=True)


def cloud(cx, cy, w):
    pts = []
    bumps = [(-0.38, 0.05, 0.2), (-0.2, -0.16, 0.24), (0.06, -0.24, 0.27), (0.3, -0.1, 0.22), (0.42, 0.08, 0.16)]
    for bx, by, br in bumps:
        for a in np.linspace(math.pi, 2 * math.pi, 14):
            pts.append((bx + br * math.cos(a), by + br * math.sin(a)))
    pts += [(0.5, 0.2), (-0.5, 0.2)]
    return densify(np.array(pts) * w + [cx, cy], 6, closed=True)


# ---------------------------------------------------------------- composite helpers
def doodle(ctx, pts, seed, color=INK, width=7, amp=2.6, prog=1.0, closed=False, fill_color=None, fill_off=(9, 9),
           alpha=1.0):
    """Wobbly outline (+ misregistered colour fill) re-jittered with every seed change."""
    if fill_color is not None:
        fill(ctx, wobble(pts, seed + 7, amp * 1.4, closed), fill_color, alpha, *fill_off)
    stroke(ctx, wobble(pts, seed, amp, closed), color, width, prog, alpha, closed)


def wobbly_box(ctx, cx, cy, w, h, seed, fill_color=WHITE, ink=INK, width=7, r=22, shadow=None, alpha=1.0):
    pts = rrect(cx, cy, w, h, r)
    if shadow is not None:
        fill(ctx, wobble(pts, seed + 3, 3, True), shadow, alpha, 10, 12)
    if fill_color is not None:
        fill(ctx, wobble(pts, seed + 5, 2, True), fill_color, alpha)
    stroke(ctx, wobble(pts, seed, 2.6, True), ink, width, 1.0, alpha, True)


# ---------------------------------------------------------------- images
def pil2surf(im):
    im = im.convert("RGBA")
    a = np.asarray(im).astype(np.uint16)
    al = a[..., 3:4]
    rgbp = (a[..., :3] * al + 127) // 255
    bgra = np.concatenate([rgbp[..., 2:3], rgbp[..., 1:2], rgbp[..., 0:1], al], axis=2).astype(np.uint8)
    h, w = bgra.shape[:2]
    buf = bytearray(np.ascontiguousarray(bgra).tobytes())
    s = cairo.ImageSurface.create_for_data(buf, cairo.FORMAT_ARGB32, w, h, w * 4)
    s._keep = buf
    return s


@functools.lru_cache(maxsize=None)
def sticker(name, size=300):
    im = Image.open(f"{B}/stickers/{name}.png")
    im = im.resize((size, size), Image.LANCZOS)
    return pil2surf(im)


@functools.lru_cache(maxsize=None)
def image(path, width=None):
    im = Image.open(path).convert("RGBA")
    if width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    return pil2surf(im)


def blit(ctx, surf, cx, cy, scale=1.0, rot=0.0, alpha=1.0, anchor=(0.5, 0.5)):
    xx, yx, xy, yy, _, _ = ctx.get_matrix().as_tuple()
    # skip near-invisible draws: cairo's GOOD filter allocates a huge kernel for extreme down-scaling
    if math.sqrt(abs(xx * yy - xy * yx)) * scale < 0.03 or alpha <= 0.001:
        return
    w, h = surf.get_width(), surf.get_height()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(math.radians(rot))
    ctx.scale(scale, scale)
    ctx.set_source_surface(surf, -w * anchor[0], -h * anchor[1])
    ctx.get_source().set_filter(cairo.FILTER_GOOD)
    ctx.paint_with_alpha(alpha)
    ctx.restore()


def put_sticker(ctx, name, cx, cy, size, t, t0, key, rot=0.0, wiggle=3.0, dur=0.3, alpha=1.0):
    s = pop(t, t0, dur)
    if s <= 0:
        return
    rng = np.random.default_rng(seed_of(key, boil(t)))
    blit(ctx, sticker(name), cx, cy, s * size / 300, rot + rng.uniform(-wiggle, wiggle) * 0.5, alpha)


# ---------------------------------------------------------------- text
FONT_FILES = {
    "lucky": "LuckiestGuy-Regular.ttf",
    "marker": "PermanentMarker-Regular.ttf",
    "gochi": "GochiHand-Regular.ttf",
    "caveat": "CaveatBrush-Regular.ttf",
    "patrick": "PatrickHand-Regular.ttf",
}


@functools.lru_cache(maxsize=None)
def font(name, size):
    return ImageFont.truetype(f"{FONTS}/{FONT_FILES[name]}", size)


@functools.lru_cache(maxsize=400)
def text_surf(txt, fname, size, fill_c=INK, stroke_c=None, sw=0, shadow=None, sh_off=(0, 7)):
    f = font(fname, size)
    l, t, r, b = f.getbbox(txt, stroke_width=sw)
    pad = sw + 12 + max(abs(sh_off[0]), abs(sh_off[1]))
    im = Image.new("RGBA", (r - l + 2 * pad, b - t + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    o = (pad - l, pad - t)
    if shadow is not None:
        d.text((o[0] + sh_off[0], o[1] + sh_off[1]), txt, font=f, fill=shadow, stroke_width=sw, stroke_fill=shadow)
    d.text(o, txt, font=f, fill=fill_c, stroke_width=sw, stroke_fill=stroke_c or fill_c)
    return pil2surf(im)


def text(ctx, txt, x, y, fname, size, fill_c=INK, stroke_c=None, sw=0, shadow=None, sh_off=(0, 7), scale=1.0,
         rot=0.0, alpha=1.0, anchor=(0.5, 0.5)):
    s = text_surf(txt, fname, size, fill_c, stroke_c, sw, shadow, sh_off)
    blit(ctx, s, x, y, scale, rot, alpha, anchor)
    return s.get_width() * scale, s.get_height() * scale


def text_width(txt, fname, size, sw=0):
    l, t, r, b = font(fname, size).getbbox(txt, stroke_width=sw)
    return r - l


def rich_line(ctx, parts, cx, cy, size, fname="lucky", scale=1.0, rot=0.0, gap=0.28):
    """parts: [(word, dict(style))]; draws words side by side, centred on cx."""
    widths = [text_width(w, fname, size, st.get("sw", 0)) for w, st in parts]
    total = sum(widths) + gap * size * (len(parts) - 1)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(math.radians(rot))
    ctx.scale(scale, scale)
    x = -total / 2
    for (w, st), wd in zip(parts, widths):
        text(ctx, w, x + wd / 2, 0, fname, size, st.get("fill", INK), st.get("stroke"), st.get("sw", 0),
             st.get("shadow"), st.get("sh_off", (0, 7)))
        x += wd + gap * size
    ctx.restore()
    return total


# ---------------------------------------------------------------- footage
class Footage:
    def __init__(self):
        self.meta = {}
        self.cache = {}

    def frame(self, fid, src_t):
        if fid not in self.meta:
            self.meta[fid] = json.load(open(f"{B}/foot/{fid}/meta.json"))
            self.meta[fid]["n"] = len([f for f in os.listdir(f"{B}/foot/{fid}") if f.endswith(".jpg")])
        m = self.meta[fid]
        i = int(round((src_t - m["s"]) * FPS)) + 1
        i = max(1, min(m["n"], i))
        key = (fid, i)
        if key not in self.cache:
            if len(self.cache) > 24:
                self.cache.clear()
            self.cache[key] = pil2surf(Image.open(f"{B}/foot/{fid}/{i:04d}.jpg"))
        return self.cache[key]


FOOT = Footage()


def footage_window(ctx, fid, src_t, cx, cy, w, h, t, key, rot=0.0, zoom=1.0, shadow=LAV, tape=True, focus=(0.5, 0.5),
                   scale=1.0, alpha=1.0):
    """Video frame clipped into a wobbly hand-drawn frame with a misregistered colour shadow and tape."""
    if scale <= 0.001:
        return
    sd = seed_of(key, boil(t))
    surf = FOOT.frame(fid, src_t)
    fw, fh = surf.get_width(), surf.get_height()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(math.radians(rot))
    ctx.scale(scale, scale)
    pts = rrect(0, 0, w, h, 28)
    fill(ctx, wobble(pts, sd + 1, 3, True), shadow, alpha, 16, 18)
    ctx.new_path()
    trace(ctx, wobble(pts, sd + 2, 2.2, True))
    ctx.close_path()
    ctx.save()
    ctx.clip()
    # cover the window, keeping the `focus` point of the frame as close to the centre as possible
    k = max(w / fw, h / fh) * zoom
    iw, ih = fw * k, fh * k
    ctx.translate(clamp(-focus[0] * iw, w / 2 - iw, -w / 2), clamp(-focus[1] * ih, h / 2 - ih, -h / 2))
    ctx.scale(k, k)
    ctx.set_source_surface(surf, 0, 0)
    ctx.get_source().set_filter(cairo.FILTER_GOOD)
    ctx.paint_with_alpha(alpha)
    ctx.restore()
    stroke(ctx, wobble(pts, sd, 2.6, True), INK, 9, 1.0, alpha, True)
    if tape:
        for tx, ty, tr in ((-w / 2 + 40, -h / 2 + 6, -38), (w / 2 - 40, -h / 2 + 6, 38)):
            ctx.save()
            ctx.translate(tx, ty)
            ctx.rotate(math.radians(tr))
            tp = rrect(0, 0, 150, 46, 4)
            fill(ctx, wobble(tp, sd + 9, 1.5, True), (255, 247, 214), 0.82 * alpha)
            ctx.restore()
    ctx.restore()
