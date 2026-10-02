"""V2 - Puzzle piece.

A synthwave jigsaw puzzle is missing one piece. The piece whips around the
board, spinning and zooming; on exactly one frame per loop it sits perfectly
in its hole. Half a loop later it lands in the hole upside-down (fake-out).
"""
import math

import cairo
import numpy as np

from common import (H, W, FPS, SR, WHITE, YELLOW, add, blurred_shadow, caption_surface,
                    cli, filtered_noise, hexc, mix, new_surface, normalize, surface_alpha,
                    tension_bed)

NAME = "02_puzzle_piece"
CYCLE = 80
CYCLES = 3
N_FRAMES = CYCLE * CYCLES
F_MATCH = 46

COLS, ROWS, P = 3, 4, 560
BX, BY = (W - COLS * P) // 2, 900          # board origin on screen
BW, BH = COLS * P, ROWS * P
HOLE = (2, 1)                                # (row, col)
HOLE_C = (BX + (HOLE[1] + 0.5) * P, BY + (HOLE[0] + 0.5) * P)
HZ = 1500                                    # horizon in board coords
VP = (BW / 2, HZ)

rng = np.random.default_rng(11)

# --------------------------------------------------------------- jigsaw edges
TAB = [
    ((0.0, 0.0), (0.37, 0.0), (0.37, 0.0)),
    ((0.42, 0.0), (0.45, 0.06), (0.405, 0.12)),
    ((0.33, 0.22), (0.40, 0.31), (0.50, 0.31)),
    ((0.60, 0.31), (0.67, 0.22), (0.595, 0.12)),
    ((0.55, 0.06), (0.58, 0.0), (0.63, 0.0)),
    ((0.63, 0.0), (1.0, 0.0), (1.0, 0.0)),
]


def make_edge(A, B, sign):
    du = rng.uniform(-0.035, 0.035)
    sv = rng.uniform(0.92, 1.04) * sign
    dx, dy = B[0] - A[0], B[1] - A[1]
    nx, ny = -dy, dx

    def m(u, v):
        if 0 < u < 1:
            u += du
        return (A[0] + u * dx + v * sv * nx, A[1] + u * dy + v * sv * ny)

    return A, [(m(*c1), m(*c2), m(*p)) for c1, c2, p in TAB]


HE = {(r, c): make_edge((c * P, r * P), ((c + 1) * P, r * P), rng.choice([-1, 1]))
      for r in range(1, ROWS) for c in range(COLS)}
VE = {(r, c): make_edge((c * P, r * P), (c * P, (r + 1) * P), rng.choice([-1, 1]))
      for r in range(ROWS) for c in range(1, COLS)}
# make sure the missing piece has a mix of tabs and blanks
HE[(2, 1)] = make_edge((P, 2 * P), (2 * P, 2 * P), -1)   # top: tab out (up)
HE[(3, 1)] = make_edge((P, 3 * P), (2 * P, 3 * P), 1)    # bottom: tab out (down)
VE[(2, 1)] = make_edge((P, 2 * P), (P, 3 * P), 1)        # left: blank
VE[(2, 2)] = make_edge((2 * P, 2 * P), (2 * P, 3 * P), 1)  # right: tab out


def follow(ctx, edge, reverse=False):
    A, segs = edge
    if not reverse:
        for c1, c2, p in segs:
            ctx.curve_to(*c1, *c2, *p)
    else:
        starts = [A] + [s[2] for s in segs[:-1]]
        for (c1, c2, p), s0 in reversed(list(zip(segs, starts))):
            ctx.curve_to(*c2, *c1, *s0)


def piece_path(ctx, r, c):
    x0, y0 = c * P, r * P
    ctx.move_to(x0, y0)
    if r == 0:
        ctx.line_to(x0 + P, y0)
    else:
        follow(ctx, HE[(r, c)])
    if c == COLS - 1:
        ctx.line_to(x0 + P, y0 + P)
    else:
        follow(ctx, VE[(r, c + 1)])
    if r == ROWS - 1:
        ctx.line_to(x0, y0 + P)
    else:
        follow(ctx, HE[(r + 1, c)], reverse=True)
    if c == 0:
        ctx.line_to(x0, y0)
    else:
        follow(ctx, VE[(r, c)], reverse=True)
    ctx.close_path()


# --------------------------------------------------------------- illustration

def palm(ctx, x, y, h, lean, flip):
    ctx.set_source_rgb(*hexc("#0b0418"))
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    top = (x + lean * h, y - h)
    ctx.set_line_width(h * 0.045)
    ctx.move_to(x, y)
    ctx.curve_to(x + lean * h * 0.1, y - h * 0.5, x + lean * h * 0.7, y - h * 0.85, *top)
    ctx.stroke()
    for k in range(7):
        a = math.radians(-170 + k * 27) if flip > 0 else math.radians(-10 - k * 27)
        ln = h * (0.42 + 0.08 * math.sin(k * 2.3))
        ex, ey = top[0] + math.cos(a) * ln, top[1] + math.sin(a) * ln * 0.75 + ln * 0.35
        mx, my = top[0] + math.cos(a) * ln * 0.5, top[1] + math.sin(a) * ln * 0.5 - ln * 0.12
        ctx.move_to(*top)
        ctx.curve_to(mx, my - ln * 0.08, mx, my - ln * 0.08, ex, ey)
        ctx.curve_to(mx, my + ln * 0.1, mx, my + ln * 0.1, *top)
        ctx.fill()


def draw_art(ctx):
    """Synthwave sunset in board coordinates (0..BW, 0..BH)."""
    g = cairo.LinearGradient(0, 0, 0, HZ)
    for t, c in ((0, "#0d0628"), (0.35, "#2a0b55"), (0.7, "#7a1a7a"), (0.92, "#e8466e"), (1, "#ff8a4c")):
        g.add_color_stop_rgb(t, *hexc(c))
    ctx.set_source(g)
    ctx.rectangle(0, 0, BW, HZ)
    ctx.fill()
    for i in range(260):
        x, y = rng.uniform(0, BW), rng.uniform(0, HZ * 0.62)
        ctx.set_source_rgba(1, 1, 1, rng.uniform(0.25, 0.9))
        ctx.arc(x, y, rng.uniform(1.5, 4.5), 0, 2 * math.pi)
        ctx.fill()
    # sun glow + striped sun
    cx, cy, R = BW / 2, 1270, 400
    g = cairo.RadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.9)
    g.add_color_stop_rgba(0, 1, 0.45, 0.5, 0.55)
    g.add_color_stop_rgba(1, 1, 0.3, 0.5, 0)
    ctx.set_source(g)
    ctx.rectangle(0, 0, BW, HZ)
    ctx.fill()
    ctx.save()
    ctx.rectangle(0, 0, BW, cy - 40)
    y, gap, band = cy - 40, 10, 46
    while y < HZ:
        ctx.rectangle(0, y, BW, band)
        y += band + gap
        gap += 6
        band = max(14, band - 4)
    ctx.clip()
    g = cairo.LinearGradient(0, cy - R, 0, cy + R)
    g.add_color_stop_rgb(0, *hexc("#fff27a"))
    g.add_color_stop_rgb(0.5, *hexc("#ffb341"))
    g.add_color_stop_rgb(1, *hexc("#ff2f86"))
    ctx.set_source(g)
    ctx.arc(cx, cy, R, 0, 2 * math.pi)
    ctx.fill()
    ctx.restore()
    # mountains
    for pts, col, edge in (
        ([(0, 1080), (210, 1200), (380, 1010), (560, 1290), (700, 1390), (760, HZ)], "#2b0f5a", "#ff5fc8"),
        ([(BW, 990), (1500, 1150), (1340, 1060), (1150, 1300), (980, 1420), (930, HZ)], "#2b0f5a", "#ff5fc8"),
        ([(0, 1290), (150, 1350), (330, 1260), (520, 1420), (640, HZ)], "#1c0840", "#b54bff"),
        ([(BW, 1270), (1530, 1370), (1380, 1300), (1200, 1450), (1100, HZ)], "#1c0840", "#b54bff"),
    ):
        ctx.move_to(pts[0][0], HZ)
        for p in pts:
            ctx.line_to(*p)
        ctx.line_to(pts[-1][0], HZ)
        ctx.close_path()
        g = cairo.LinearGradient(0, 1000, 0, HZ)
        g.add_color_stop_rgb(0, *mix(hexc(col), hexc("#8a3fd0"), 0.35))
        g.add_color_stop_rgb(1, *hexc(col))
        ctx.set_source(g)
        ctx.fill()
        ctx.move_to(*pts[0])
        for p in pts[1:]:
            ctx.line_to(*p)
        ctx.set_source_rgba(*hexc(edge), 0.9)
        ctx.set_line_width(6)
        ctx.stroke()
    # ground grid
    g = cairo.LinearGradient(0, HZ, 0, BH)
    g.add_color_stop_rgb(0, *hexc("#2a0640"))
    g.add_color_stop_rgb(1, *hexc("#07020f"))
    ctx.set_source(g)
    ctx.rectangle(0, HZ, BW, BH - HZ)
    ctx.fill()
    ctx.set_line_cap(cairo.LINE_CAP_BUTT)
    for k in range(1, 22):
        y = HZ + (BH - HZ) * (k / 21.0) ** 2.1
        ctx.set_source_rgba(1, 0.17, 0.84, 0.35 + 0.6 * k / 21)
        ctx.set_line_width(3 + 7 * k / 21)
        ctx.move_to(0, y)
        ctx.line_to(BW, y)
        ctx.stroke()
    for k in range(-14, 15):
        xb = VP[0] + k * 230
        ctx.set_source_rgba(1, 0.17, 0.84, 0.85)
        ctx.set_line_width(5)
        ctx.move_to(VP[0] + k * 22, HZ)
        ctx.line_to(xb, BH)
        ctx.stroke()
    g = cairo.LinearGradient(0, HZ - 40, 0, HZ + 120)
    g.add_color_stop_rgba(0, 1, 0.5, 0.6, 0)
    g.add_color_stop_rgba(0.3, 1, 0.55, 0.65, 0.85)
    g.add_color_stop_rgba(1, 1, 0.3, 0.7, 0)
    ctx.set_source(g)
    ctx.rectangle(0, HZ - 40, BW, 160)
    ctx.fill()
    palm(ctx, 160, 1640, 980, 0.18, 1)
    palm(ctx, 1540, 1700, 860, -0.22, -1)


def art_surface():
    s, ctx = new_surface(BW, BH)
    draw_art(ctx)
    s.flush()
    return s


ART = art_surface()


def bevel(ctx, r, c):
    """Embossed edge inside the current clip (piece path in board coords)."""
    for dx, dy, col in ((-3, -3, (1, 1, 1, 0.35)), (4, 4, (0, 0, 0, 0.45))):
        ctx.save()
        ctx.translate(dx, dy)
        piece_path(ctx, r, c)
        ctx.restore()
        ctx.set_source_rgba(*col)
        ctx.set_line_width(8)
        ctx.stroke()
    piece_path(ctx, r, c)
    ctx.set_source_rgba(0.05, 0.0, 0.1, 0.7)
    ctx.set_line_width(4)
    ctx.stroke()


def build_background():
    s, ctx = new_surface()
    g = cairo.RadialGradient(W / 2, H * 0.55, 200, W / 2, H * 0.55, H * 0.75)
    g.add_color_stop_rgb(0, *hexc("#2b2f3d"))
    g.add_color_stop_rgb(1, *hexc("#0b0c12"))
    ctx.set_source(g)
    ctx.paint()
    # wood-ish table grain
    for i in range(500):
        y = rng.uniform(0, H)
        ctx.set_source_rgba(1, 1, 1, rng.uniform(0.008, 0.03))
        ctx.set_line_width(rng.uniform(2, 10))
        ctx.move_to(0, y)
        ctx.curve_to(W * 0.3, y + rng.uniform(-30, 30), W * 0.7, y + rng.uniform(-30, 30), W, y)
        ctx.stroke()
    # board shadow
    m = np.zeros((BH + 2, BW + 2), np.float32)
    m[1:-1, 1:-1] = 1
    sh, pad = blurred_shadow(m, 40, alpha=0.75)
    ctx.set_source_surface(sh, BX - pad + 10, BY - pad + 40)
    ctx.paint()
    ctx.save()
    ctx.translate(BX, BY)
    ctx.set_source_surface(ART)
    ctx.paint()
    for r in range(ROWS):
        for c in range(COLS):
            if (r, c) == HOLE:
                continue
            ctx.save()
            piece_path(ctx, r, c)
            ctx.clip()
            bevel(ctx, r, c)
            ctx.restore()
    # the hole
    ctx.save()
    piece_path(ctx, *HOLE)
    ctx.clip()
    g = cairo.LinearGradient(0, HOLE[0] * P, 0, (HOLE[0] + 1) * P)
    g.add_color_stop_rgb(0, *hexc("#141019"))
    g.add_color_stop_rgb(1, *hexc("#211b29"))
    ctx.set_source(g)
    ctx.paint()
    for w, a in ((90, 0.18), (60, 0.2), (34, 0.25), (14, 0.35)):
        piece_path(ctx, *HOLE)
        ctx.set_source_rgba(0, 0, 0, a)
        ctx.set_line_width(w)
        ctx.stroke()
    ctx.restore()
    piece_path(ctx, *HOLE)
    ctx.set_source_rgba(1, 1, 1, 0.55)
    ctx.set_line_width(5)
    ctx.stroke()
    ctx.restore()
    s.flush()
    return s


def build_piece():
    """Sprite of the missing piece, centred; returns (surface, half_size)."""
    S = int(P * 1.8)
    s, ctx = new_surface(S, S)
    r, c = HOLE
    ctx.translate(S / 2 - (c + 0.5) * P, S / 2 - (r + 0.5) * P)
    piece_path(ctx, r, c)
    ctx.clip()
    ctx.set_source_surface(ART)
    ctx.paint()
    bevel(ctx, r, c)
    s.flush()
    return s, S / 2


BG = build_background()
PIECE, HALF = build_piece()
SHADOW, SPAD = blurred_shadow(surface_alpha(PIECE), 22, alpha=0.7)
CAPTION = caption_surface([[("Pause when the piece", WHITE)],
                           [("fits ", WHITE), ("PERFECTLY!", YELLOW)]], y0=520)
FRAME, fctx = new_surface()


def motion(t):
    """t: frames relative to the match (any real). -> dx, dy, angle, scale."""
    tau = t / CYCLE
    a = 2 * math.pi * tau
    dx = 500 * math.sin(a) + 150 * math.sin(3 * a)
    dy = 520 * math.sin(2 * a) + 70 * math.sin(6 * a)
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
    t = np.arange(n) / SR * FPS               # time in frames
    rel = (t % CYCLE) - F_MATCH
    eps = 0.05
    m1 = np.array([motion(r) for r in rel[::40]])
    m2 = np.array([motion(r + eps) for r in rel[::40]])
    sp = np.hypot(m2[:, 0] - m1[:, 0], m2[:, 1] - m1[:, 1]) / eps + 300 * np.abs(m2[:, 2] - m1[:, 2]) / eps
    sp = np.interp(np.arange(n), np.arange(0, n, 40)[:len(sp)], sp)
    sp = sp / sp.max()
    air = filtered_noise(n, 500, 3500, 5) * 0.9 + filtered_noise(n, 3000, 8000, 6) * 0.25
    xs = np.interp(np.arange(n), np.arange(0, n, 40)[:len(m1)], m1[:, 0]) / 700
    w = air * sp ** 2 * 0.6
    buf[:, 0] += w * np.clip(1 - xs, 0, 1.5)
    buf[:, 1] += w * np.clip(1 + xs, 0, 1.5)
    return normalize(buf)


if __name__ == "__main__":
    cli(NAME, render_frame, N_FRAMES, audio,
        default_preview=[F_MATCH, F_MATCH + 1, F_MATCH + CYCLE // 2, F_MATCH - 20])
