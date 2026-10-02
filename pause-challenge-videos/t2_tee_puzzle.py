"""T2 - Tee puzzle (uses the real product photo).

The puzzle picture is the embroidered tee. The missing piece holds the collar
and the centre of the floral garland; on exactly one frame per loop it fits
and the embroidery is complete. Half a loop later it lands upside-down.
"""
import math

import cairo
import numpy as np

import v2_puzzle_piece as pz
from common import (FPS, SR, WHITE, YELLOW, blurred_shadow, caption_surface, cli, filtered_noise,
                    hexc, new_surface, normalize, surface_alpha, tension_bed)
from tee import load_tee

NAME = "06_tee_puzzle"
CYCLE = 80
CYCLES = 3
N_FRAMES = CYCLE * CYCLES
F_MATCH = 46
P = pz.P
HOLE = (1, 1)
HOLE_C = (pz.BX + 1.5 * P, pz.BY + 1.5 * P)
TEE_W, TEE_X, TEE_Y = 1580, 50, 524

# give the centre piece three tabs and one blank
pz.HE[(1, 1)] = pz.make_edge((P, P), (2 * P, P), -1)
pz.HE[(2, 1)] = pz.make_edge((P, 2 * P), (2 * P, 2 * P), -1)
pz.VE[(1, 1)] = pz.make_edge((P, P), (P, 2 * P), 1)
pz.VE[(1, 2)] = pz.make_edge((2 * P, P), (2 * P, 2 * P), -1)


def build_art():
    s, ctx = new_surface(pz.BW, pz.BH)
    g = cairo.RadialGradient(pz.BW / 2, pz.BH * 0.42, 100, pz.BW / 2, pz.BH * 0.5, 1600)
    g.add_color_stop_rgb(0, *hexc("#fcf9f4"))
    g.add_color_stop_rgb(1, *hexc("#e3d8ca"))
    ctx.set_source(g)
    ctx.paint()
    tee, a, _, _ = load_tee(TEE_W)
    sh, pad = blurred_shadow(a, 28, color=(0.3, 0.22, 0.14), alpha=0.45)
    ctx.set_source_surface(sh, TEE_X + 26 - pad, TEE_Y + 44 - pad)
    ctx.paint()
    ctx.set_source_surface(tee, TEE_X, TEE_Y)
    ctx.paint()
    s.flush()
    return s


ART = build_art()
BG = pz.build_background(art=ART, hole=HOLE, table=("#6e5c4b", "#231c16"))
PIECE, HALF = pz.build_piece(art=ART, hole=HOLE)
SHADOW, SPAD = blurred_shadow(surface_alpha(PIECE), 22, alpha=0.7)
CAPTION = caption_surface([[("Pause when the piece", WHITE)],
                           [("fits ", WHITE), ("PERFECTLY!", YELLOW)]], y0=520)
FRAME, fctx = new_surface()


def motion(t):
    tau = t / CYCLE
    a = 2 * math.pi * tau
    dx = 500 * math.sin(a) + 150 * math.sin(3 * a)
    dy = 400 * math.sin(2 * a) + 70 * math.sin(6 * a) + 260 * math.sin(2 * a) ** 2
    ang = a + 0.55 * math.sin(2 * a)
    sc = 1 + 0.24 * math.sin(2 * a) ** 2
    return dx, dy, ang, sc


def render_frame(f):
    fctx.set_source_surface(BG)
    fctx.paint()
    dx, dy, ang, sc = motion((f % CYCLE) - F_MATCH)
    x, y = HOLE_C[0] + dx, HOLE_C[1] + dy
    lift = (sc - 1) / 0.24
    for src, half, off in ((SHADOW, HALF + SPAD, 12 + 120 * lift), (PIECE, HALF, 0)):
        fctx.save()
        fctx.translate(x + off * 0.4, y + off)
        fctx.rotate(ang)
        fctx.scale(sc, sc)
        fctx.set_source_surface(src, -half, -half)
        fctx.get_source().set_filter(cairo.FILTER_GOOD)
        fctx.paint()
        fctx.restore()
    fctx.set_source_surface(CAPTION)
    fctx.paint()
    return FRAME


def audio(dur):
    buf = tension_bed(dur, CYCLE)
    n = len(buf)
    rel = ((np.arange(n) / SR * FPS) % CYCLE) - F_MATCH
    eps, step = 0.05, 40
    m1 = np.array([motion(r) for r in rel[::step]])
    m2 = np.array([motion(r + eps) for r in rel[::step]])
    sp = np.hypot(m2[:, 0] - m1[:, 0], m2[:, 1] - m1[:, 1]) / eps + 300 * np.abs(m2[:, 2] - m1[:, 2]) / eps
    grid = np.arange(0, n, step)[:len(sp)]
    sp = np.interp(np.arange(n), grid, sp / sp.max())
    xs = np.interp(np.arange(n), grid, m1[:, 0]) / 700
    air = filtered_noise(n, 500, 3500, 5) * 0.9 + filtered_noise(n, 3000, 8000, 6) * 0.25
    w = air * sp ** 2 * 0.6
    buf[:, 0] += w * np.clip(1 - xs, 0, 1.5)
    buf[:, 1] += w * np.clip(1 + xs, 0, 1.5)
    return normalize(buf)


if __name__ == "__main__":
    cli(NAME, render_frame, N_FRAMES, audio,
        default_preview=[F_MATCH, F_MATCH + 1, F_MATCH + CYCLE // 2, F_MATCH - 20])
