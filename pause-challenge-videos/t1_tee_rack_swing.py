"""T1 - Tee rack swing (uses the real product photo).

The embroidered tee hangs on a hanger that whizzes along a boutique clothing
rail, brakes hard and swings like a pendulum (physically simulated). A red
outline waits on the rail: on exactly one frame per loop the tee hangs
perfectly inside it.
"""
import math

import cairo
import numpy as np

from common import (H, W, FPS, SR, WHITE, YELLOW, add, blurred_shadow, caption_surface, cli,
                    filtered_noise, hexc, mix, new_surface, noise_texture, normalize,
                    surface_from_rgba, tension_bed, whoosh)
from tee import load_tee, wobbly_outline

NAME = "05_tee_rack_swing"
CYCLE = 84
CYCLES = 3
N_FRAMES = CYCLE * CYCLES
RAIL_Y = 1150
CX = W / 2
HOOK = 190                       # rail centre -> collar top
TEE, TEE_A, (TW, TH), COLLAR = load_tee(1640)
L_CM = HOOK + TH / 2
OMEGA0 = 2 * math.pi / 32        # natural swing period: 32 frames
DAMP = 0.05
VIN, VS, VOUT = 165.0, 7.0, 190.0
TB, TY = 27.0, 62.0              # brake / yank times (frames)

rng = np.random.default_rng(4)


# ---------------------------------------------------------------- physics

def simulate():
    dt = 0.05
    t = np.arange(-30, CYCLE + 30, dt)
    sig = lambda z: 1 / (1 + np.exp(-z))
    v = VS + (VIN - VS) * sig((TB - t) / 2.2) + (VOUT - VS) * sig((t - TY) / 3.0)
    x = np.cumsum(v) * dt
    acc = np.gradient(v, dt)
    th = np.zeros_like(t)
    a_ang, w = 0.0, 0.0
    for i in range(len(t)):
        alpha = -OMEGA0 ** 2 * math.sin(a_ang) + acc[i] / L_CM * math.cos(a_ang) - DAMP * w
        w += alpha * dt
        a_ang += w * dt
        th[i] = a_ang
    # zero crossing of the swing closest to the middle of the slow drift
    zs = [i for i in range(1, len(t)) if th[i - 1] * th[i] < 0 and TB + 6 < t[i] < TY - 4]
    mid = (TB + TY) / 2
    iz = min(zs, key=lambda i: abs(t[i] - mid))
    tz = t[iz - 1] + (t[iz] - t[iz - 1]) * th[iz - 1] / (th[iz - 1] - th[iz])
    xz = np.interp(tz, t, x)
    return t, x - xz + CX, th, tz


T_SIM, X_SIM, TH_SIM, TZ = simulate()
F_MATCH = int(round(TZ))
DELTA = TZ - F_MATCH


def pose(f):
    tt = (f % CYCLE) + DELTA
    return float(np.interp(tt, T_SIM, X_SIM)), float(np.interp(tt, T_SIM, TH_SIM))


# ---------------------------------------------------------------- art

def build_background():
    s, ctx = new_surface()
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgb(0, *hexc("#f4ede3"))
    g.add_color_stop_rgb(0.85, *hexc("#e4d5c2"))
    g.add_color_stop_rgb(1, *hexc("#d9c7b0"))
    ctx.set_source(g)
    ctx.paint()
    tex = noise_texture(W // 4, H // 4, 30, seed=2, octaves=4)
    import cv2
    tex = cv2.resize(tex, (W, H), interpolation=cv2.INTER_CUBIC)
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., :3] = 90
    rgba[..., 3] = (np.abs(tex - 0.5) * 40).astype(np.uint8)
    ctx.set_source_surface(surface_from_rgba(rgba))
    ctx.paint()
    # spotlight behind the rail
    g = cairo.RadialGradient(CX, 1900, 100, CX, 1900, 1700)
    g.add_color_stop_rgba(0, 1, 0.98, 0.94, 0.65)
    g.add_color_stop_rgba(1, 1, 0.98, 0.94, 0)
    ctx.set_source(g)
    ctx.paint()
    # floor + skirting board
    fy = 3420
    g = cairo.LinearGradient(0, fy, 0, H)
    g.add_color_stop_rgb(0, *hexc("#b98f66"))
    g.add_color_stop_rgb(1, *hexc("#8b6440"))
    ctx.set_source(g)
    ctx.rectangle(0, fy, W, H - fy)
    ctx.fill()
    for k in range(9):
        ctx.set_source_rgba(0.25, 0.15, 0.08, 0.35)
        ctx.set_line_width(4)
        y = fy + 30 + k * k * 6
        ctx.move_to(0, y)
        ctx.line_to(W, y)
        ctx.stroke()
    ctx.set_source_rgb(*hexc("#f7f2ea"))
    ctx.rectangle(0, fy - 60, W, 60)
    ctx.fill()
    ctx.set_source_rgba(0, 0, 0, 0.12)
    ctx.rectangle(0, fy, W, 10)
    ctx.fill()
    # rail brackets
    for bx in (150, W - 150):
        g = cairo.LinearGradient(bx - 14, 0, bx + 14, 0)
        g.add_color_stop_rgb(0, *hexc("#6d7177"))
        g.add_color_stop_rgb(0.5, *hexc("#e9ecef"))
        g.add_color_stop_rgb(1, *hexc("#5b5f65"))
        ctx.set_source(g)
        ctx.rectangle(bx - 14, 780, 28, RAIL_Y - 780)
        ctx.fill()
        ctx.set_source_rgb(*hexc("#c9cdd2"))
        ctx.arc(bx, 780, 40, 0, 2 * math.pi)
        ctx.fill()
    # rail shadow + chrome rail
    g = cairo.LinearGradient(0, RAIL_Y + 20, 0, RAIL_Y + 90)
    g.add_color_stop_rgba(0, 0, 0, 0, 0.18)
    g.add_color_stop_rgba(1, 0, 0, 0, 0)
    ctx.set_source(g)
    ctx.rectangle(0, RAIL_Y + 20, W, 70)
    ctx.fill()
    g = cairo.LinearGradient(0, RAIL_Y - 22, 0, RAIL_Y + 22)
    for t, c in ((0, "#7e838a"), (0.25, "#ffffff"), (0.5, "#b4b9bf"), (0.8, "#4b4f55"), (1, "#2f3236")):
        g.add_color_stop_rgb(t, *hexc(c))
    ctx.set_source(g)
    ctx.rectangle(-10, RAIL_Y - 22, W + 20, 44)
    ctx.fill()
    s.flush()
    return s


def draw_hook(ctx):
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for wdt, col in ((17, "#4c5157"), (9, "#e6e9ec")):
        ctx.move_to(0, HOOK + 60)
        ctx.line_to(0, 40)
        ctx.arc_negative(0, 0, 40, math.pi / 2, -math.pi * 1.12)
        ctx.set_source_rgb(*hexc(col))
        ctx.set_line_width(wdt)
        ctx.stroke()


TEE_OFF = (-COLLAR[0], HOOK - COLLAR[1])          # tee sprite offset from the pivot
SHADOW, SPAD = blurred_shadow(TEE_A, 30, color=(0.25, 0.18, 0.1), alpha=0.38)


def draw_tee(ctx, x, th, shadow=True):
    if shadow:
        ctx.save()
        ctx.translate(x + 50, RAIL_Y + 60)
        ctx.rotate(th)
        ctx.set_source_surface(SHADOW, TEE_OFF[0] - SPAD, TEE_OFF[1] - SPAD)
        ctx.paint()
        ctx.restore()
    ctx.save()
    ctx.translate(x, RAIL_Y)
    ctx.rotate(th)
    draw_hook(ctx)
    ctx.set_source_surface(TEE, *TEE_OFF)
    ctx.get_source().set_filter(cairo.FILTER_GOOD)
    ctx.paint()
    ctx.restore()


def build_outline():
    s, ctx = new_surface()
    ctx.translate(CX, RAIL_Y)
    ctx.set_source_surface(TEE, *TEE_OFF)
    ctx.paint()
    s.flush()
    from common import surface_alpha
    return wobbly_outline(surface_alpha(s), dilate=27, width=22)


BG = build_background()
OVERLAY, octx = new_surface()
octx.set_source_surface(build_outline())
octx.paint()
octx.set_source_surface(caption_surface(
    [[("Only ", WHITE), ("1%", YELLOW), (" can pause", WHITE)],
     [("at the right time!", WHITE)]], y0=470))
octx.paint()
FRAME, fctx = new_surface()


def render_frame(f):
    fctx.set_source_surface(BG)
    fctx.paint()
    x, th = pose(f)
    if -1200 < x < W + 1200:
        draw_tee(fctx, x, th)
    fctx.set_source_surface(OVERLAY)
    fctx.paint()
    return FRAME


def audio(dur):
    buf = tension_bed(dur, CYCLE)
    n = len(buf)
    tf = np.arange(n) / SR * FPS
    tt = (tf % CYCLE) + DELTA
    x = np.interp(tt, T_SIM, X_SIM)
    v = np.abs(np.gradient(x)) * SR / FPS
    on = ((x > -900) & (x < W + 900)).astype(float)
    pan = np.clip((x - W / 2) / (W / 2), -1, 1)
    slide = filtered_noise(n, 2500, 7000, 3) * np.clip(v / VIN, 0, 1.2) * on * 0.5
    buf[:, 0] += slide * np.cos((pan + 1) * np.pi / 4)
    buf[:, 1] += slide * np.sin((pan + 1) * np.pi / 4)
    tc = np.arange(int(0.35 * SR)) / SR
    clink = sum(np.sin(2 * np.pi * fq * tc) * np.exp(-tc * d) for fq, d in ((2150, 14), (3420, 18), (5230, 24)))
    for c in range(CYCLES):
        base = c * CYCLE - DELTA
        add(buf, whoosh(0.6), (base + TB - 9) / FPS, -0.6, 0.5)
        add(buf, clink * 0.35, (base + TB) / FPS, 0, 1.0)
        add(buf, whoosh(0.6), (base + TY - 1) / FPS, 0.6, 0.5)
    return normalize(buf)


if __name__ == "__main__":
    fr = np.arange(CYCLE)
    st = [pose(f) for f in fr]
    near = sorted(((abs(math.degrees(th)), abs(x - CX), int(f)) for f, (x, th) in zip(fr, st)
                   if -1200 < x < W + 1200 and abs(math.degrees(th)) < 3))
    print("match", F_MATCH, "near-zero swings (deg, dx, frame):",
          [(round(a, 2), round(d), f) for a, d, f in near])
    print("x at f=0 %.0f, f=CYCLE-1 %.0f" % (st[0][0], st[-1][0]))
    cli(NAME, render_frame, N_FRAMES, audio, default_preview=[F_MATCH, F_MATCH + 1, F_MATCH - 16, 24])
