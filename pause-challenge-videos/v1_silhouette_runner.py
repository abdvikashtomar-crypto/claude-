"""V1 - Silhouette runner (closest to the original).

A jogger sprints through a sunset park. A hand-drawn red outline sits on the
path; on exactly one frame per loop the runner fills it perfectly.
"""
import math

import cairo
import cv2
import numpy as np

from common import (H, W, FPS, WHITE, YELLOW, add, caption_surface, cli, hexc,
                    mix, new_surface, normalize, shade, tension_bed, thud, whoosh)

NAME = "01_silhouette_runner"
CYCLE = 80                 # frames per loop (2.67 s)
CYCLES = 3
N_FRAMES = CYCLE * CYCLES
F_MATCH = 52               # frame (inside each loop) where the runner fits
SPEED = 72                 # px per frame
L = 1450                   # runner height in px
GROUND_Y = 2875
X_MATCH = 900
STRIDE = 1.32 * L          # px travelled per full gait cycle
PHI_MATCH = math.pi / 2 - 0.22

THIGH, SHIN, FOOT, TORSO = 0.245, 0.245, 0.115, 0.29
UPPER, FORE, HEAD_R = 0.165, 0.155, 0.077
LEAN = 0.2

SKIN = hexc("#c98b62")
SHIRT = hexc("#2f7ed8")
SHORTS = hexc("#1f2a44")
SHOE = hexc("#f6f6f6")
SOLE = hexc("#ff6a2b")
SOCK = hexc("#ffffff")
CAP = hexc("#171717")
RED = hexc("#ff1f1f")

rng = np.random.default_rng(7)


def wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi


# ---------------------------------------------------------------- background

def ellipse(ctx, cx, cy, rx, ry):
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(rx, ry)
    ctx.arc(0, 0, 1, 0, 2 * math.pi)
    ctx.restore()


def soft_blob(ctx, cx, cy, rx, ry, rgba):
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(rx, ry)
    g = cairo.RadialGradient(0, 0, 0, 0, 0, 1)
    g.add_color_stop_rgba(0, *rgba)
    g.add_color_stop_rgba(1, *rgba[:3], 0)
    ctx.set_source(g)
    ctx.arc(0, 0, 1, 0, 2 * math.pi)
    ctx.fill()
    ctx.restore()


def path_edges(x):
    top = 2715 + 38 * math.sin(x / 650 + 0.4)
    bot = 3035 + 48 * math.sin(x / 650 + 0.9)
    return top, bot


def build_background():
    s, ctx = new_surface()
    HZ = 1790
    # sky
    g = cairo.LinearGradient(0, 0, 0, HZ)
    for t, c in ((0, "#2a62b8"), (0.42, "#6aa5e4"), (0.74, "#c9dceb"),
                 (0.9, "#ffe1b0"), (1, "#ffcf8c")):
        g.add_color_stop_rgb(t, *hexc(c))
    ctx.set_source(g)
    ctx.rectangle(0, 0, W, HZ + 40)
    ctx.fill()
    # sun + glow
    soft_blob(ctx, 1720, 1600, 1250, 900, (1, 0.84, 0.6, 0.75))
    soft_blob(ctx, 1720, 1600, 420, 420, (1, 0.95, 0.82, 0.9))
    ctx.set_source_rgb(*hexc("#fff7e2"))
    ellipse(ctx, 1720, 1600, 125, 125)
    ctx.fill()
    # clouds
    for cx, cy, rx, ry in ((420, 1060, 520, 95), (760, 1010, 380, 80), (1650, 1180, 600, 90),
                           (1950, 1120, 360, 70), (1200, 1330, 420, 55), (200, 1420, 300, 45)):
        for k in range(6):
            soft_blob(ctx, cx + rng.uniform(-0.6, 0.6) * rx, cy + rng.uniform(-0.4, 0.3) * ry,
                      rx * rng.uniform(0.35, 0.7), ry * rng.uniform(0.7, 1.3), (1, 0.98, 0.95, 0.38))
    # far hills (hazy)
    for base, amp, col, seed in ((1745, 90, "#a9bfb6", 1), (1790, 60, "#86a585", 2)):
        r2 = np.random.default_rng(seed)
        ph = r2.uniform(0, 6, 3)
        ctx.move_to(0, HZ + 200)
        for x in range(0, W + 41, 40):
            y = base - amp * (0.6 * math.sin(x / 520 + ph[0]) + 0.3 * math.sin(x / 210 + ph[1])
                              + 0.1 * math.sin(x / 90 + ph[2]))
            ctx.line_to(x, y)
        ctx.line_to(W, HZ + 200)
        ctx.close_path()
        ctx.set_source_rgb(*hexc(col))
        ctx.fill()
    # tree line
    for i in range(140):
        x = rng.uniform(-100, W + 100)
        r = rng.uniform(50, 130)
        y = HZ + rng.uniform(-40, 30)
        lit = max(0.0, 1 - abs(x - 1720) / 1400)
        ctx.set_source_rgb(*mix(hexc("#3e5c2c"), hexc("#8f8a3c"), 0.35 * lit * rng.random()))
        ellipse(ctx, x, y, r * 1.15, r)
        ctx.fill()
    # ground
    g = cairo.LinearGradient(0, HZ, 0, H)
    for t, c in ((0, "#b9b25e"), (0.22, "#8fa443"), (0.55, "#62892f"), (1, "#3f6a22")):
        g.add_color_stop_rgb(t, *hexc(c))
    ctx.set_source(g)
    ctx.rectangle(0, HZ - 10, W, H - HZ + 10)
    ctx.fill()
    # warm sunlit patches
    for i in range(18):
        soft_blob(ctx, rng.uniform(600, W + 200), rng.uniform(1850, 2650), rng.uniform(250, 600),
                  rng.uniform(40, 110), (1, 0.82, 0.45, 0.22))
    # grass texture (far, small)
    for i in range(22000):
        y = rng.uniform(1800, H)
        depth = (y - 1790) / (H - 1790)
        x = rng.uniform(0, W)
        ln = 8 + 70 * depth ** 1.3
        lit = rng.random()
        c = mix(hexc("#3c6420"), hexc("#d9c46a"), lit * (0.75 - 0.3 * depth))
        ctx.set_source_rgba(*c, 0.55)
        ctx.set_line_width(1.5 + 4 * depth)
        lean = rng.uniform(-0.35, 0.35)
        ctx.move_to(x, y)
        ctx.curve_to(x + lean * ln * 0.3, y - ln * 0.5, x + lean * ln, y - ln * 0.8, x + lean * ln * 1.4, y - ln)
        ctx.stroke()
    # winding side path into the distance (like the original)
    ctx.move_to(1460, 2760)
    ctx.curve_to(1430, 2420, 1150, 2200, 1215, 1950)
    ctx.curve_to(1250, 1850, 1300, 1810, 1330, 1790)
    ctx.line_to(1362, 1790)
    ctx.curve_to(1350, 1820, 1330, 1880, 1320, 1950)
    ctx.curve_to(1300, 2180, 1620, 2400, 1880, 2760)
    ctx.close_path()
    g = cairo.LinearGradient(0, 1790, 0, 2760)
    g.add_color_stop_rgb(0, *hexc("#e3cfae"))
    g.add_color_stop_rgb(1, *hexc("#cdb999"))
    ctx.set_source(g)
    ctx.fill()
    # rocks & bushes behind the main path
    for cx, cy, rx, ry in ((1820, 2470, 210, 120), (2080, 2430, 240, 150), (1650, 2560, 140, 80),
                           (900, 2350, 160, 70), (2030, 2590, 160, 70)):
        for k in range(9):
            ox, oy = rng.uniform(-0.7, 0.7) * rx, rng.uniform(-0.6, 0.2) * ry
            r = rng.uniform(0.35, 0.6) * rx
            ctx.set_source_rgb(*mix(hexc("#36561f"), hexc("#7e8f34"), rng.random() * 0.6))
            ellipse(ctx, cx + ox, cy + oy, r, r * 0.85)
            ctx.fill()
        for k in range(10):
            ox, oy = rng.uniform(-0.3, 0.8) * rx, rng.uniform(-0.8, -0.1) * ry
            r = rng.uniform(0.12, 0.25) * rx
            ctx.set_source_rgba(*hexc("#e2bd5c"), 0.55)
            ellipse(ctx, cx + ox, cy + oy, r, r * 0.8)
            ctx.fill()
    for cx, cy, rx, ry in ((160, 2600, 150, 85), (640, 2640, 120, 70), (1080, 2655, 90, 45),
                           (2010, 2690, 110, 55)):
        g = cairo.LinearGradient(cx, cy - ry, cx, cy + ry)
        g.add_color_stop_rgb(0, *hexc("#d7cfc2"))
        g.add_color_stop_rgb(1, *hexc("#6f6f74"))
        ctx.set_source(g)
        ellipse(ctx, cx, cy, rx, ry)
        ctx.fill()
        soft_blob(ctx, cx + rx * 0.4, cy - ry * 0.35, rx * 0.5, ry * 0.4, (1, 0.9, 0.7, 0.45))
    # big tree on the left
    ctx.move_to(300, 2660)
    ctx.curve_to(360, 2400, 380, 2000, 395, 1640)
    ctx.line_to(470, 1640)
    ctx.curve_to(475, 2000, 500, 2400, 560, 2660)
    ctx.close_path()
    g = cairo.LinearGradient(300, 0, 560, 0)
    g.add_color_stop_rgb(0, *hexc("#3a2616"))
    g.add_color_stop_rgb(0.7, *hexc("#5d3e24"))
    g.add_color_stop_rgb(1, *hexc("#9a6b3c"))
    ctx.set_source(g)
    ctx.fill()
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for x0, y0, x1, y1, w in ((430, 1900, 180, 1500, 40), (440, 1800, 760, 1420, 36),
                              (420, 1700, 360, 1250, 30), (450, 1750, 620, 1250, 26)):
        ctx.set_source_rgb(*hexc("#4a311c"))
        ctx.set_line_width(w)
        ctx.move_to(x0, y0)
        ctx.curve_to((x0 + x1) / 2, y0 - 120, x1, (y0 + y1) / 2, x1, y1)
        ctx.stroke()
    canopy = []
    for i in range(150):
        a = rng.uniform(0, 2 * math.pi)
        rr = rng.uniform(0, 1) ** 0.55
        canopy.append((440 + math.cos(a) * rr * 540, 1390 + math.sin(a) * rr * 380, rng.uniform(80, 165)))
    # paint shadow-side clusters first, sun-side (upper right) clusters last
    canopy.sort(key=lambda c: (c[0] - 440) * 0.8 - (c[1] - 1390))
    for cx, cy, r in canopy:
        lit = max(0.0, min(1.0, 0.5 + ((cx - 440) * 0.8 - (cy - 1390)) / 900))
        g = cairo.RadialGradient(cx + r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r * 1.05)
        g.add_color_stop_rgb(0, *mix(hexc("#6f8a2e"), hexc("#f0cd6a"), lit))
        g.add_color_stop_rgb(0.55, *mix(hexc("#3d5a22"), hexc("#9a9a3a"), lit))
        g.add_color_stop_rgb(1, *mix(hexc("#22371a"), hexc("#4c6426"), lit))
        ctx.set_source(g)
        ellipse(ctx, cx, cy, r, r * 0.88)
        ctx.fill()
    for i in range(3500):  # leaf speckle, only inside clusters
        cx, cy, r = canopy[rng.integers(len(canopy))]
        a = rng.uniform(0, 2 * math.pi)
        rr = rng.uniform(0, 0.9) * r
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.88
        up = max(0.0, -math.sin(a)) * max(0.0, math.cos(a) + 0.3)
        lit = max(0.0, min(1.0, 0.45 + ((x - 440) * 0.8 - (y - 1390)) / 1000)) * (0.5 + up)
        ctx.set_source_rgba(*mix(hexc("#2a4318"), hexc("#f5d57a"), min(1, lit)), 0.5)
        ellipse(ctx, x, y, rng.uniform(7, 17), rng.uniform(5, 12))
        ctx.fill()
    # main path (runner's track)
    top = [(x, path_edges(x)[0]) for x in range(-40, W + 81, 40)]
    bot = [(x, path_edges(x)[1]) for x in range(W + 80, -41, -40)]
    ctx.move_to(*top[0])
    for p in top[1:] + bot:
        ctx.line_to(*p)
    ctx.close_path()
    g = cairo.LinearGradient(0, 2700, 0, 3080)
    g.add_color_stop_rgb(0, *hexc("#bfae92"))
    g.add_color_stop_rgb(0.15, *hexc("#dccbaf"))
    g.add_color_stop_rgb(0.8, *hexc("#d2bfa1"))
    g.add_color_stop_rgb(1, *hexc("#a8957a"))
    ctx.set_source(g)
    ctx.fill_preserve()
    ctx.save()
    ctx.clip()
    for i in range(16000):
        x = rng.uniform(0, W)
        y = rng.uniform(2690, 3090)
        ctx.set_source_rgba(*mix(hexc("#7d6d58"), hexc("#fff2da"), rng.random()), 0.45)
        ellipse(ctx, x, y, rng.uniform(1.5, 5), rng.uniform(1.2, 3.5))
        ctx.fill()
    soft_blob(ctx, 1800, 2860, 1300, 260, (1, 0.85, 0.6, 0.25))
    ctx.restore()
    # tree shadow across the path
    soft_blob(ctx, 330, 2760, 640, 120, (0.05, 0.08, 0.02, 0.28))
    # foreground grass (over the lower path edge)
    for i in range(9000):
        x = rng.uniform(-20, W + 20)
        y = rng.uniform(3010, H + 60)
        depth = (y - 3000) / (H - 3000)
        ln = 60 + 140 * depth * rng.uniform(0.6, 1.2)
        c = mix(hexc("#2f5518"), hexc("#d8c15f"), rng.random() * 0.7)
        ctx.set_source_rgba(*c, 0.85)
        ctx.set_line_width(3 + 6 * depth)
        lean = rng.uniform(-0.4, 0.4)
        ctx.move_to(x, y)
        ctx.curve_to(x + lean * ln * 0.3, y - ln * 0.5, x + lean * ln, y - ln * 0.8, x + lean * ln * 1.3, y - ln)
        ctx.stroke()
    # vignette
    g = cairo.RadialGradient(W / 2, H * 0.52, H * 0.25, W / 2, H * 0.52, H * 0.75)
    g.add_color_stop_rgba(0, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, 0.38)
    ctx.set_source(g)
    ctx.paint()
    s.flush()
    return s


# ---------------------------------------------------------------- runner

def leg_angles(phi):
    ah = 0.2 + 0.65 * math.sin(phi)
    ak = 0.25 + 1.75 * math.exp(-(wrap(phi + 0.45) / 0.75) ** 2)
    return ah, ak


def pose(phi):
    """Joint positions in figure units (u forward, v up, ground v=0)."""
    legs = []
    for p in (phi, phi + math.pi):            # near, far
        ah, ak = leg_angles(p)
        knee = (THIGH * math.sin(ah), -THIGH * math.cos(ah))
        sa = ah - ak
        ankle = (knee[0] + SHIN * math.sin(sa), knee[1] - SHIN * math.cos(sa))
        pf = 0.12 + 0.45 * (ak - 0.25) / 1.75
        fd = (math.cos(sa - pf), math.sin(sa - pf))
        toe = (ankle[0] + FOOT * fd[0], ankle[1] + FOOT * fd[1])
        heel = (ankle[0] - 0.03 * fd[0], ankle[1] - 0.03 * fd[1])
        legs.append(dict(knee=knee, ankle=ankle, toe=toe, heel=heel))
    low = min(min(l["ankle"][1] - 0.035, l["toe"][1] - 0.012) for l in legs)
    hip_v = -low
    hip = (0.0, hip_v)

    def up(pt):
        return (pt[0], pt[1] + hip_v)

    for l in legs:
        for k in list(l):
            l[k] = up(l[k])
    sh = (hip[0] + TORSO * math.sin(LEAN), hip[1] + TORSO * math.cos(LEAN))
    arms = []
    for sgn in (-1, 1):                      # near arm opposes near leg
        a_s = 0.05 + sgn * 0.85 * math.sin(phi)
        a_e = 1.3 + 0.45 * max(0.0, a_s) / 0.9
        el = (sh[0] + UPPER * math.sin(a_s), sh[1] - UPPER * math.cos(a_s))
        af = a_s + a_e
        hand = (el[0] + FORE * math.sin(af), el[1] - FORE * math.cos(af))
        arms.append(dict(el=el, hand=hand))
    head = (sh[0] + 0.13 * math.sin(0.12), sh[1] + 0.13 * math.cos(0.12))
    return dict(hip=hip, sh=sh, head=head, legs=legs, arms=arms)


def capsule(ctx, p0, p1, r0, r1):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    d = math.hypot(dx, dy) or 1e-6
    nx, ny = -dy / d, dx / d
    ctx.move_to(p0[0] + nx * r0, p0[1] + ny * r0)
    ctx.line_to(p1[0] + nx * r1, p1[1] + ny * r1)
    ctx.line_to(p1[0] - nx * r1, p1[1] - ny * r1)
    ctx.line_to(p0[0] - nx * r0, p0[1] - ny * r0)
    ctx.close_path()
    ctx.fill()
    ctx.arc(p0[0], p0[1], r0, 0, 2 * math.pi)
    ctx.fill()
    ctx.arc(p1[0], p1[1], r1, 0, 2 * math.pi)
    ctx.fill()


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def draw_runner(ctx, x, phi, flat=None):
    """Draw at hip x (screen px). flat=rgb draws a solid silhouette."""
    P = pose(phi)
    ctx.save()
    ctx.translate(x, GROUND_Y)
    ctx.scale(L, -L)

    def col(c, far=False):
        if flat is not None:
            ctx.set_source_rgb(*flat)
        else:
            ctx.set_source_rgb(*(shade(c, 0.72) if far else c))

    def leg(l, far):
        hip, kn, an = P["hip"], l["knee"], l["ankle"]
        col(SKIN, far)
        capsule(ctx, lerp(hip, kn, 0.4), kn, 0.05, 0.042)
        capsule(ctx, kn, lerp(kn, an, 0.7), 0.042, 0.032)
        col(SOCK, far)
        capsule(ctx, lerp(kn, an, 0.68), an, 0.033, 0.03)
        col(SHORTS, far)
        capsule(ctx, hip, lerp(hip, kn, 0.5), 0.068, 0.058)
        # shoe
        col(SHOE, far)
        capsule(ctx, l["heel"], l["toe"], 0.036, 0.026)
        col(SOLE, far)
        fx, fy = l["toe"][0] - l["heel"][0], l["toe"][1] - l["heel"][1]
        d = math.hypot(fx, fy)
        nx, ny = fy / d, -fx / d  # downward normal-ish
        capsule(ctx, (l["heel"][0] + nx * 0.022, l["heel"][1] + ny * 0.022),
                (l["toe"][0] + nx * 0.016, l["toe"][1] + ny * 0.016), 0.016, 0.012)

    def arm(a, far):
        sh = P["sh"]
        col(SKIN, far)
        capsule(ctx, a["el"], a["hand"], 0.029, 0.025)
        ctx.arc(a["hand"][0], a["hand"][1], 0.033, 0, 2 * math.pi)
        ctx.fill()
        capsule(ctx, lerp(sh, a["el"], 0.4), a["el"], 0.034, 0.029)
        col(SHIRT, far)
        capsule(ctx, sh, lerp(sh, a["el"], 0.48), 0.047, 0.042)

    arm(P["arms"][1], True)
    leg(P["legs"][1], True)
    hip, sh = P["hip"], P["sh"]
    col(SHORTS)
    capsule(ctx, hip, lerp(hip, sh, 0.3), 0.084, 0.08)
    col(SHIRT)
    capsule(ctx, lerp(hip, sh, 0.28), sh, 0.078, 0.094)
    leg(P["legs"][0], False)
    # neck + head
    hd = P["head"]
    col(SKIN)
    capsule(ctx, sh, lerp(sh, hd, 0.7), 0.034, 0.032)
    ctx.arc(hd[0], hd[1], HEAD_R, 0, 2 * math.pi)
    ctx.fill()
    if flat is None:
        ctx.set_source_rgb(*shade(SKIN, 0.85))
        ctx.arc(hd[0] - 0.014, hd[1] - 0.012, 0.018, 0, 2 * math.pi)  # ear
        ctx.fill()
        ctx.set_source_rgb(0.1, 0.07, 0.05)
        ctx.arc(hd[0] + 0.05, hd[1] + 0.0, 0.008, 0, 2 * math.pi)  # eye
        ctx.fill()
        ctx.set_source_rgb(*SKIN)  # nose
        ctx.move_to(hd[0] + 0.07, hd[1] - 0.004)
        ctx.line_to(hd[0] + 0.088, hd[1] - 0.022)
        ctx.line_to(hd[0] + 0.068, hd[1] - 0.028)
        ctx.close_path()
        ctx.fill()
    # beanie
    ctx.save()
    ctx.translate(*hd)
    ctx.rotate(-0.12)
    col(CAP)
    ctx.arc(-0.004, 0.026, HEAD_R * 1.04, math.radians(-12), math.radians(194))
    ctx.close_path()
    ctx.fill()
    if flat is None:
        ctx.set_source_rgb(0.24, 0.24, 0.25)
    ctx.rectangle(-HEAD_R * 1.05, 0.024, HEAD_R * 2.06, 0.024)
    ctx.fill()
    ctx.restore()
    arm(P["arms"][0], False)
    ctx.restore()


def runner_x(f):
    return X_MATCH + SPEED * ((f % CYCLE) - F_MATCH)


def runner_phi(f):
    return PHI_MATCH + 2 * math.pi * SPEED * ((f % CYCLE) - F_MATCH) / STRIDE


# ---------------------------------------------------------------- outline

def build_outline():
    s, ctx = new_surface()
    draw_runner(ctx, X_MATCH, PHI_MATCH, flat=(1, 1, 1))
    s.flush()
    buf = np.ndarray((H, W, 4), np.uint8, s.get_data())
    mask = (buf[..., 3] > 127).astype(np.uint8)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)[:, 0, :].astype(np.float64)
    # resample evenly, smooth, add a gentle hand-drawn wobble
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(np.r_[c, c[:1]], axis=0).T))]
    total = seg[-1]
    t = np.arange(0, total, 5.0)
    cc = np.r_[c, c[:1]]
    pts = np.stack([np.interp(t, seg, cc[:, 0]), np.interp(t, seg, cc[:, 1])], 1)
    from scipy.ndimage import gaussian_filter1d
    pts = gaussian_filter1d(pts, 3, axis=0, mode="wrap")
    tang = np.gradient(pts, axis=0)
    nrm = np.stack([tang[:, 1], -tang[:, 0]], 1)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
    r = np.random.default_rng(3)
    wob = sum(a * np.sin(2 * np.pi * t / total * k + r.uniform(0, 6)) for a, k in ((4, 7), (3, 19), (2, 41)))
    pts = pts + nrm * wob[:, None]
    o, octx = new_surface()
    octx.set_line_join(cairo.LINE_JOIN_ROUND)
    octx.set_line_cap(cairo.LINE_CAP_ROUND)

    def path():
        octx.move_to(*pts[0])
        for p in pts[1:]:
            octx.line_to(*p)
        octx.close_path()

    path()
    octx.set_source_rgba(0, 0, 0, 0.22)
    octx.set_line_width(34)
    octx.stroke()
    path()
    octx.set_source_rgb(*RED)
    octx.set_line_width(22)
    octx.stroke()
    o.flush()
    return o


# ---------------------------------------------------------------- frames

BG = build_background()
OVERLAY, octx = new_surface()
octx.set_source_surface(build_outline())
octx.paint()
octx.set_source_surface(caption_surface(
    [[("Only ", WHITE), ("1%", YELLOW), (" can pause", WHITE)],
     [("at the right time!", WHITE)]], y0=560))
octx.paint()
FRAME, fctx = new_surface()


def render_frame(f):
    fctx.set_source_surface(BG)
    fctx.paint()
    x = runner_x(f)
    if -700 < x < W + 700:
        # contact shadow
        fctx.save()
        fctx.translate(x + 0.05 * L, GROUND_Y + 8)
        fctx.scale(0.26 * L, 0.035 * L)
        g = cairo.RadialGradient(0, 0, 0, 0, 0, 1)
        g.add_color_stop_rgba(0, 0.1, 0.07, 0.02, 0.4)
        g.add_color_stop_rgba(1, 0.1, 0.07, 0.02, 0)
        fctx.set_source(g)
        fctx.arc(0, 0, 1, 0, 2 * math.pi)
        fctx.fill()
        fctx.restore()
        # runner on its own layer so the sunset light only touches the body
        fctx.save()
        fctx.rectangle(x - 0.75 * L, GROUND_Y - 1.1 * L, 1.5 * L, 1.2 * L)
        fctx.clip()
        fctx.push_group()
        draw_runner(fctx, x, runner_phi(f))
        fctx.set_operator(cairo.OPERATOR_ATOP)
        g = cairo.LinearGradient(x - 0.35 * L, 0, x + 0.45 * L, 0)
        g.add_color_stop_rgba(0, 0.05, 0.05, 0.15, 0.18)
        g.add_color_stop_rgba(0.55, 1, 0.8, 0.5, 0.0)
        g.add_color_stop_rgba(1, 1, 0.78, 0.45, 0.3)
        fctx.set_source(g)
        fctx.paint()
        fctx.pop_group_to_source()
        fctx.paint()
        fctx.restore()
    fctx.set_source_surface(OVERLAY)
    fctx.paint()
    return FRAME


def audio(dur):
    buf = tension_bed(dur, CYCLE)
    for c in range(CYCLES):
        f0 = c * CYCLE
        # footsteps: strikes happen when each leg is fully forward
        prev = None
        for i in range(0, CYCLE * 8):
            fr = f0 + i / 8.0
            x = X_MATCH + SPEED * (i / 8.0 - F_MATCH)
            if not (-500 < x < W + 500):
                continue
            ph = PHI_MATCH + 2 * math.pi * SPEED * (i / 8.0 - F_MATCH) / STRIDE
            for k, off in enumerate((0.0, math.pi)):
                v = math.sin(ph + off - math.pi / 2 - 0.3)
                if prev is not None and prev[k] < 0 <= v:
                    pan = max(-1, min(1, (x - W / 2) / (W / 2)))
                    add(buf, thud(seed=int(fr * 10)), fr / FPS, pan, 0.9)
            prev = [math.sin(ph + off - math.pi / 2 - 0.3) for off in (0.0, math.pi)]
        add(buf, whoosh(0.8), (f0 + F_MATCH) / FPS - 0.4, 0, 0.35)
    return normalize(buf)


if __name__ == "__main__":
    cli(NAME, render_frame, N_FRAMES, audio, default_preview=[F_MATCH, F_MATCH - 12, 10])
