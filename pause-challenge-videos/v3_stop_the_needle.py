"""V3 - Stop the needle.

A neon dial with a razor-thin green zone. The needle spins with a changing
speed: it crawls past the zone on a slow pass (near miss), then whips through
and lands dead-centre on exactly one frame per loop.
"""
import math

import cairo
import numpy as np

from common import (H, W, FPS, GREEN, WHITE, YELLOW, add, caption_surface, cli, hexc,
                    new_surface, normalize, tension_bed, tick)

NAME = "03_stop_the_needle"
CYCLE = 80
CYCLES = 3
N_FRAMES = CYCLE * CYCLES
REVS = 3
TARGET = 38.0          # degrees clockwise from 12 o'clock
ZONE = 2.6             # half-width of the green zone (deg)
C = (W / 2, 2200)
R_RING = 840
R_NEEDLE = 790

rng = np.random.default_rng(5)


# ---------------------------------------------------------------- motion

def build_angles():
    """Pick a speed profile so exactly one frame per loop is inside the zone,
    on a fast pass, with a near miss on the slow pass."""
    best = None
    k = np.arange(CYCLE)
    for f0 in range(0, CYCLE, 2):
        for b in (0.0, 2.0, 3.5):
            for f1 in range(0, CYCLE, 5):
                v = (REVS * 360 / CYCLE + 7.2 * np.cos(2 * np.pi * (k - f0) / CYCLE)
                     + b * np.cos(4 * np.pi * (k - f1) / CYCLE))
                cum = np.r_[0, np.cumsum(v)[:-1]]
                for fm in range(CYCLE):
                    if v[fm] < 15 or v[(fm - 1) % CYCLE] < 15:
                        continue
                    ang = cum - cum[fm] + TARGET
                    d = (ang - TARGET + 180) % 360 - 180
                    others = np.abs(np.delete(d, fm))
                    if others.min() < 4.8:
                        continue
                    near = others.min()
                    score = -abs(near - 5.6) + 0.05 * v[fm]
                    if best is None or score > best[0]:
                        best = (score, ang % 360, fm, near)
    _, ang, fm, near = best
    return ang, fm, near


ANGLES, F_MATCH, NEAR = build_angles()


def angle(f):
    return ANGLES[f % CYCLE]


def pol(r, deg):
    a = math.radians(deg - 90)
    return C[0] + r * math.cos(a), C[1] + r * math.sin(a)


def sector(ctx, r0, r1, a0, a1):
    ctx.new_path()
    ctx.arc(C[0], C[1], r1, math.radians(a0 - 90), math.radians(a1 - 90))
    ctx.arc_negative(C[0], C[1], r0, math.radians(a1 - 90), math.radians(a0 - 90))
    ctx.close_path()


# ---------------------------------------------------------------- static art

def hsv(h, s, v):
    i = int(h * 6) % 6
    f = h * 6 - int(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    return [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i]


def ring_color(deg):
    # cyan -> violet -> magenta -> cyan around the dial
    h = (0.52 + 0.33 * (0.5 - 0.5 * math.cos(math.radians(deg)))) % 1.0
    return hsv(h, 0.85, 1.0)


def build_background():
    s, ctx = new_surface()
    g = cairo.RadialGradient(C[0], C[1], 100, C[0], C[1], 2600)
    g.add_color_stop_rgb(0, *hexc("#232a6b"))
    g.add_color_stop_rgb(0.45, *hexc("#0f1236"))
    g.add_color_stop_rgb(1, *hexc("#04040d"))
    ctx.set_source(g)
    ctx.paint()
    for i in range(500):  # dust
        ctx.set_source_rgba(0.7, 0.8, 1, rng.uniform(0.05, 0.4))
        ctx.arc(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(1, 4), 0, 2 * math.pi)
        ctx.fill()
    for r in (1050, 1250, 1500):
        ctx.set_source_rgba(0.5, 0.6, 1, 0.06)
        ctx.set_line_width(3)
        ctx.arc(C[0], C[1], r, 0, 2 * math.pi)
        ctx.stroke()
    # plate + bezel
    g = cairo.RadialGradient(C[0] - 200, C[1] - 300, 50, C[0], C[1], 940)
    g.add_color_stop_rgb(0, *hexc("#1d2250"))
    g.add_color_stop_rgb(1, *hexc("#090b1e"))
    ctx.set_source(g)
    ctx.arc(C[0], C[1], 935, 0, 2 * math.pi)
    ctx.fill()
    g = cairo.LinearGradient(0, C[1] - 950, 0, C[1] + 950)
    g.add_color_stop_rgb(0, *hexc("#c9d1ff"))
    g.add_color_stop_rgb(0.5, *hexc("#3b4170"))
    g.add_color_stop_rgb(1, *hexc("#a2a9d8"))
    ctx.set_source(g)
    ctx.set_line_width(26)
    ctx.arc(C[0], C[1], 935, 0, 2 * math.pi)
    ctx.stroke()
    # red "fail" band
    sector(ctx, 420, 650, 0, 360)
    ctx.set_source_rgba(1, 0.17, 0.3, 0.1)
    ctx.fill()
    # neon ring with glow
    for width, alpha in ((150, 0.05), (95, 0.08), (60, 0.16), (34, 1.0)):
        for d in range(0, 360):
            ctx.set_source_rgba(*ring_color(d + 0.5), alpha)
            ctx.set_line_width(width)
            ctx.arc(C[0], C[1], R_RING, math.radians(d - 90), math.radians(d + 1.2 - 90))
            ctx.stroke()
    # ticks
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for i in range(60):
        d = i * 6
        major = i % 5 == 0
        r0, r1 = (650, 780) if major else (715, 780)
        ctx.set_source_rgba(1, 1, 1, 0.95 if major else 0.4)
        ctx.set_line_width(14 if major else 7)
        ctx.move_to(*pol(r0, d))
        ctx.line_to(*pol(r1, d))
        ctx.stroke()
    # green zone with glow
    for pad, alpha in ((9, 0.06), (6, 0.1), (3.5, 0.18), (1.5, 0.3)):
        sector(ctx, 280, 880, TARGET - ZONE - pad, TARGET + ZONE + pad)
        ctx.set_source_rgba(*GREEN, alpha)
        ctx.fill()
    sector(ctx, 280, 880, TARGET - ZONE, TARGET + ZONE)
    g = cairo.RadialGradient(C[0], C[1], 280, C[0], C[1], 880)
    g.add_color_stop_rgba(0, *GREEN, 0.55)
    g.add_color_stop_rgba(1, *GREEN, 1.0)
    ctx.set_source(g)
    ctx.fill()
    # marker triangle outside the ring
    tip = pol(R_RING + 70, TARGET)
    l, r = pol(R_RING + 170, TARGET - 4.5), pol(R_RING + 170, TARGET + 4.5)
    ctx.move_to(*tip)
    ctx.line_to(*l)
    ctx.line_to(*r)
    ctx.close_path()
    ctx.set_source_rgb(*GREEN)
    ctx.fill()
    s.flush()
    return s


def build_hub():
    s, ctx = new_surface(360, 360)
    g = cairo.RadialGradient(150, 140, 10, 180, 180, 120)
    g.add_color_stop_rgb(0, *hexc("#ffffff"))
    g.add_color_stop_rgb(0.5, *hexc("#9aa3d6"))
    g.add_color_stop_rgb(1, *hexc("#2c315c"))
    ctx.set_source(g)
    ctx.arc(180, 180, 105, 0, 2 * math.pi)
    ctx.fill()
    ctx.set_source_rgb(*hexc("#ff2b5a"))
    ctx.arc(180, 180, 40, 0, 2 * math.pi)
    ctx.fill()
    ctx.set_source_rgba(1, 1, 1, 0.6)
    ctx.arc(168, 168, 14, 0, 2 * math.pi)
    ctx.fill()
    s.flush()
    return s


def needle_path(ctx, deg, r_tip=R_NEEDLE, base=17, tip=3, tail=150):
    ctx.save()
    ctx.translate(*C)
    ctx.rotate(math.radians(deg))
    ctx.move_to(-base, 0)
    ctx.line_to(-tip, -r_tip)
    ctx.line_to(tip, -r_tip)
    ctx.line_to(base, 0)
    ctx.line_to(base * 0.7, tail)
    ctx.line_to(-base * 0.7, tail)
    ctx.close_path()
    ctx.restore()


BG = build_background()
HUB = build_hub()
CAPTION = caption_surface([[("Stop it on the ", WHITE), ("GREEN", GREEN)],
                           [("Only ", WHITE), ("1%", YELLOW), (" can do it!", WHITE)]], y0=520)
FRAME, fctx = new_surface()


def render_frame(f):
    a = angle(f)
    prev = angle(f - 1)
    sweep = (a - prev) % 360
    fctx.set_source_surface(BG)
    fctx.paint()
    # motion trail: wedges fading behind the needle
    steps = 14
    for i in range(steps):
        t0, t1 = i / steps, (i + 1) / steps
        sector(fctx, 140, R_NEEDLE - 10, a - sweep * t1, a - sweep * t0 + 0.2)
        fctx.set_source_rgba(0.75, 0.9, 1, 0.2 * (1 - t0) ** 1.8)
        fctx.fill()
    # keep the green zone readable above the trail
    sector(fctx, 280, 880, TARGET - ZONE, TARGET + ZONE)
    g = cairo.RadialGradient(C[0], C[1], 280, C[0], C[1], 880)
    g.add_color_stop_rgba(0, *GREEN, 0.6)
    g.add_color_stop_rgba(1, *GREEN, 1.0)
    fctx.set_source(g)
    fctx.fill()
    # shadow, glow, needle
    fctx.save()
    fctx.translate(14, 22)
    needle_path(fctx, a)
    fctx.restore()
    fctx.set_source_rgba(0, 0, 0, 0.45)
    fctx.fill()
    for w, al in ((46, 0.08), (26, 0.14), (12, 0.25)):
        needle_path(fctx, a)
        fctx.set_source_rgba(1, 0.3, 0.45, al)
        fctx.set_line_width(w)
        fctx.set_line_join(cairo.LINE_JOIN_ROUND)
        fctx.stroke()
    needle_path(fctx, a)
    g = cairo.LinearGradient(*C, *pol(R_NEEDLE, a))
    g.add_color_stop_rgb(0, *hexc("#ffffff"))
    g.add_color_stop_rgb(0.75, *hexc("#ffe3ea"))
    g.add_color_stop_rgb(1, *hexc("#ff2b5a"))
    fctx.set_source(g)
    fctx.fill()
    fctx.set_source_surface(HUB, C[0] - 180, C[1] - 180)
    fctx.paint()
    fctx.set_source_surface(CAPTION)
    fctx.paint()
    return FRAME


def audio(dur):
    buf = tension_bed(dur, CYCLE, tick_div=0)
    clk = tick(2600, 0.03)
    n_total = int(round(dur * FPS))
    for f in range(n_total):
        a0 = angle(f)
        a1 = a0 + (angle(f + 1) - a0) % 360
        # a click for every 30-degree mark the needle passes
        k = math.floor(a0 / 30) + 1
        while k * 30 <= a1:
            t = (f + (k * 30 - a0) / (a1 - a0)) / FPS
            pan = math.sin(math.radians(k * 30)) * 0.6
            add(buf, clk, t, pan, 0.35)
            k += 1
    return normalize(buf)


if __name__ == "__main__":
    print("match frame", F_MATCH, "closest miss %.2f deg" % NEAR)
    cli(NAME, render_frame, N_FRAMES, audio, default_preview=[F_MATCH, F_MATCH + 1, F_MATCH - 1])
