"""V4 - Drift parking.

Top-down parking lot. A red outline of the car waits in an empty stall. The
car drifts in from the bottom-left, smoking its tyres, slides through the
stall and drifts out the top; on exactly one frame per loop it is perfectly
parked inside the outline.
"""
import math

import cairo
import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d

from common import (H, W, FPS, SR, WHITE, YELLOW, add, blurred_shadow, caption_surface,
                    cli, filtered_noise, hexc, mix, new_surface, noise_texture, normalize,
                    shade, smoothstep, surface_alpha, tension_bed, whoosh)

NAME = "04_drift_parking"
CL, CW = 860, 400              # car length / width (px)
STALL_W, STALL_D = 520, 1000
LINES_X = [40 + STALL_W * i for i in range(5)]
ROW_A = (1250, 2250)
ROW_B = (2250, 3250)
TARGET = (LINES_X[1] + STALL_W / 2, (ROW_A[0] + ROW_A[1]) / 2)
SPEED = 74                     # px per frame along the path
FRONT_AX, REAR_AX, TRACK = -CL / 2 + 190, CL / 2 - 180, CW / 2 - 26

rng = np.random.default_rng(21)


# ---------------------------------------------------------------- path

def catmull(pts, n=240):
    pts = np.asarray(pts, float)
    P = np.vstack([pts[0], pts, pts[-1]])
    out = []
    t = np.linspace(0, 1, n, endpoint=False)[:, None]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1:])
    return np.vstack(out)


def build_path():
    way = [(-760, 3700), (120, 3480), (600, 3060), (790, 2400), TARGET,
           (850, 1120), (1180, 640), (1950, 430), (3000, 400)]
    raw = catmull(way)
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(raw, axis=0).T))]
    s = np.arange(0, seg[-1], 2.0)
    pos = np.stack([np.interp(s, seg, raw[:, 0]), np.interp(s, seg, raw[:, 1])], 1)
    d = np.gradient(pos, axis=0)
    th = np.unwrap(np.arctan2(d[:, 1], d[:, 0]))
    kappa = gaussian_filter1d(np.gradient(th) / 2.0, 70)          # per px
    # drift: the car yaws into the turn (tail out), lagging the curve slightly
    beta = np.clip(gaussian_filter1d(np.roll(kappa, 40) * 330, 30), -0.75, 0.75)
    head = th + beta
    im = int(np.argmin(np.hypot(pos[:, 0] - TARGET[0], pos[:, 1] - TARGET[1])))
    # rotate the whole path about the match point so the car is exactly upright
    dlt = -math.pi / 2 - head[im]
    c, sn = math.cos(dlt), math.sin(dlt)
    rel = pos - pos[im]
    pos = np.stack([rel[:, 0] * c - rel[:, 1] * sn, rel[:, 0] * sn + rel[:, 1] * c], 1) + TARGET
    return pos, th + dlt, head + dlt, beta, s[im]


POS, VEL_DIR, HEAD, BETA, S_MATCH = build_path()
S_MAX = (len(POS) - 1) * 2.0
F_MATCH = int(math.ceil(S_MATCH / SPEED)) + 2
F_EXIT = F_MATCH + int(math.ceil((S_MAX - S_MATCH) / SPEED))
CYCLE = F_EXIT + 12
CYCLES = 3
N_FRAMES = CYCLE * CYCLES


def state(s):
    i = int(round(min(max(s, 0), S_MAX) / 2.0))
    return POS[i], HEAD[i], VEL_DIR[i], BETA[i]


def s_of(f):
    return S_MATCH + SPEED * ((f % CYCLE) - F_MATCH)


def to_world(p, ang, local):
    a = ang + math.pi / 2
    c, s = math.cos(a), math.sin(a)
    return (p[0] + local[0] * c - local[1] * s, p[1] + local[0] * s + local[1] * c)


# ---------------------------------------------------------------- car sprite

def body_path(ctx, hw, hl):
    ctx.move_to(-hw + 95, -hl)
    ctx.line_to(hw - 95, -hl)
    ctx.curve_to(hw - 30, -hl, hw, -hl + 45, hw, -hl + 130)
    ctx.curve_to(hw + 8, -hl + 300, hw - 10, hl - 300, hw, hl - 110)
    ctx.curve_to(hw, hl - 40, hw - 30, hl, hw - 85, hl)
    ctx.line_to(-hw + 85, hl)
    ctx.curve_to(-hw + 30, hl, -hw, hl - 40, -hw, hl - 110)
    ctx.curve_to(-hw + 10, hl - 300, -hw - 8, -hl + 300, -hw, -hl + 130)
    ctx.curve_to(-hw, -hl + 45, -hw + 30, -hl, -hw + 95, -hl)
    ctx.close_path()


def make_car(color, stripes=True, with_wheels=False):
    S_W, S_H = CW + 200, CL + 200
    s, ctx = new_surface(S_W, S_H)
    ctx.translate(S_W / 2, S_H / 2)
    hw, hl = CW / 2, CL / 2
    if with_wheels:
        for ax in (FRONT_AX, REAR_AX):
            for sx in (-1, 1):
                draw_tire(ctx, sx * TRACK, ax, 0)
    # mirrors
    for sx in (-1, 1):
        ctx.save()
        ctx.translate(sx * (hw + 18), -hl + 330)
        ctx.rotate(sx * 0.25)
        ctx.rectangle(-26, -16, 52, 32)
        ctx.set_source_rgb(*shade(color, 0.8))
        ctx.fill()
        ctx.restore()
    body_path(ctx, hw, hl)
    g = cairo.LinearGradient(-hw, 0, hw, 0)
    g.add_color_stop_rgb(0, *shade(color, 0.55))
    g.add_color_stop_rgb(0.18, *shade(color, 0.95))
    g.add_color_stop_rgb(0.5, *mix(color, (1, 1, 1), 0.18))
    g.add_color_stop_rgb(0.82, *shade(color, 0.95))
    g.add_color_stop_rgb(1, *shade(color, 0.55))
    ctx.set_source(g)
    ctx.fill_preserve()
    ctx.set_source_rgba(0, 0, 0, 0.55)
    ctx.set_line_width(5)
    ctx.stroke()
    if stripes:
        for sx in (-1, 1):
            ctx.rectangle(sx * 30 - (34 if sx < 0 else 0), -hl + 4, 34, CL - 8)
        ctx.set_source_rgba(1, 1, 1, 0.92)
        ctx.fill()
    # hood creases
    ctx.set_source_rgba(0, 0, 0, 0.18)
    ctx.set_line_width(4)
    for sx in (-1, 1):
        ctx.move_to(sx * 120, -hl + 40)
        ctx.curve_to(sx * 135, -hl + 140, sx * 140, -hl + 220, sx * 140, -hl + 290)
        ctx.stroke()

    def glass(y0, y1, w0, w1, light):
        ctx.move_to(-w0, y0)
        ctx.line_to(w0, y0)
        ctx.line_to(w1, y1)
        ctx.line_to(-w1, y1)
        ctx.close_path()
        g = cairo.LinearGradient(0, y0, 0, y1)
        g.add_color_stop_rgb(0, *hexc("#1d2b3a" if light else "#0c131b"))
        g.add_color_stop_rgb(1, *hexc("#0c131b" if light else "#1d2b3a"))
        ctx.set_source(g)
        ctx.fill()

    glass(-hl + 300, -hl + 430, hw - 38, hw - 62, True)
    glass(hl - 230, hl - 140, hw - 70, hw - 52, False)
    # roof
    ctx.rectangle(-hw + 62, -hl + 430, CW - 124, hl * 2 - 660)
    g = cairo.LinearGradient(-hw + 62, 0, hw - 62, 0)
    g.add_color_stop_rgb(0, *shade(color, 0.85))
    g.add_color_stop_rgb(0.5, *mix(color, (1, 1, 1), 0.28))
    g.add_color_stop_rgb(1, *shade(color, 0.85))
    ctx.set_source(g)
    ctx.fill()
    if stripes:
        for sx in (-1, 1):
            ctx.rectangle(sx * 30 - (34 if sx < 0 else 0), -hl + 430, 34, hl * 2 - 660)
        ctx.set_source_rgba(1, 1, 1, 0.92)
        ctx.fill()
    # side windows
    for sx in (-1, 1):
        ctx.move_to(sx * (hw - 40), -hl + 310)
        ctx.line_to(sx * (hw - 62), -hl + 430)
        ctx.line_to(sx * (hw - 62), hl - 230)
        ctx.line_to(sx * (hw - 52), hl - 150)
        ctx.line_to(sx * (hw - 24), hl - 180)
        ctx.line_to(sx * (hw - 18), -hl + 330)
        ctx.close_path()
        ctx.set_source_rgb(*hexc("#111a24"))
        ctx.fill()
    # windshield reflection
    ctx.move_to(-hw + 90, -hl + 312)
    ctx.line_to(-hw + 150, -hl + 312)
    ctx.line_to(-hw + 110, -hl + 420)
    ctx.line_to(-hw + 80, -hl + 420)
    ctx.close_path()
    ctx.set_source_rgba(1, 1, 1, 0.22)
    ctx.fill()
    # lights
    for sx in (-1, 1):
        ctx.save()
        ctx.translate(sx * (hw - 70), -hl + 22)
        ctx.scale(60, 18)
        ctx.arc(0, 0, 1, 0, 2 * math.pi)
        ctx.restore()
        ctx.set_source_rgb(*hexc("#fff6d0"))
        ctx.fill()
        ctx.rectangle(sx * (hw - 30) - (60 if sx > 0 else 0), hl - 26, 60, 18)
        ctx.set_source_rgb(*hexc("#ff2a2a"))
        ctx.fill()
    s.flush()
    return s, S_W / 2, S_H / 2


def draw_tire(ctx, x, y, steer):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(steer)
    ctx.rectangle(-32, -66, 64, 132)
    ctx.set_source_rgb(0.07, 0.07, 0.08)
    ctx.fill()
    ctx.set_source_rgba(1, 1, 1, 0.08)
    for k in range(-60, 61, 16):
        ctx.rectangle(-32, k, 64, 5)
    ctx.fill()
    ctx.restore()


RED_CAR = hexc("#d71c2a")
CAR, CHW, CHH = make_car(RED_CAR)
CAR_SHADOW, CSPAD = blurred_shadow(surface_alpha(make_car(RED_CAR, with_wheels=True)[0]), 26, alpha=0.6)


# ---------------------------------------------------------------- background

def build_background():
    s, ctx = new_surface()
    tex = noise_texture(W // 4, H // 4, 60, seed=3, octaves=4)
    fine = rng.random((H // 2, W // 2)).astype(np.float32)
    tex = cv2.resize(tex, (W, H), interpolation=cv2.INTER_CUBIC)
    fine = cv2.resize(fine, (W, H), interpolation=cv2.INTER_NEAREST)
    lum = 0.17 + 0.05 * tex + 0.035 * fine
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., 0] = np.clip(lum * 255 * 1.0, 0, 255)
    rgba[..., 1] = np.clip(lum * 255 * 1.02, 0, 255)
    rgba[..., 2] = np.clip(lum * 255 * 1.08, 0, 255)
    rgba[..., 3] = 255
    from common import surface_from_rgba
    ctx.set_source_surface(surface_from_rgba(rgba))
    ctx.paint()
    # oil stains & patches
    for i in range(14):
        x, y = rng.uniform(0, W), rng.uniform(800, 3600)
        g = cairo.RadialGradient(x, y, 0, x, y, rng.uniform(60, 180))
        g.add_color_stop_rgba(0, 0, 0, 0, 0.35)
        g.add_color_stop_rgba(1, 0, 0, 0, 0)
        ctx.set_source(g)
        ctx.paint()
    # cracks
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for i in range(16):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        ctx.move_to(x, y)
        a = rng.uniform(0, 2 * math.pi)
        for k in range(12):
            a += rng.uniform(-0.6, 0.6)
            x += math.cos(a) * 28
            y += math.sin(a) * 28
            ctx.line_to(x, y)
        ctx.set_source_rgba(0.04, 0.04, 0.05, 0.6)
        ctx.set_line_width(3)
        ctx.stroke()
    # parking lines (slightly worn)
    paint, pctx = new_surface()
    pctx.set_source_rgb(0.95, 0.95, 0.92)
    for x in LINES_X:
        pctx.rectangle(x - 7, ROW_A[0], 14, ROW_B[1] - ROW_A[0])
    pctx.rectangle(LINES_X[0] - 7, ROW_A[1] - 7, LINES_X[-1] - LINES_X[0] + 14, 14)
    pctx.fill()
    # aisle arrows
    for (x, y, ang) in ((1500, 3560, 0), (600, 960, 0), (1650, 960, 0)):
        pctx.save()
        pctx.translate(x, y)
        pctx.rotate(ang)
        pctx.move_to(-170, -22)
        pctx.line_to(60, -22)
        pctx.line_to(60, -70)
        pctx.line_to(170, 0)
        pctx.line_to(60, 70)
        pctx.line_to(60, 22)
        pctx.line_to(-170, 22)
        pctx.close_path()
        pctx.fill()
        pctx.restore()
    paint.flush()
    wear = noise_texture(W // 4, H // 4, 8, seed=9, octaves=2)
    wear = cv2.resize(wear, (W, H))
    pa = np.ndarray((H, W, 4), np.uint8, paint.get_data())
    pa[...] = (pa.astype(np.float32) * np.clip(0.5 + wear, 0, 1)[..., None] * 0.9).astype(np.uint8)
    paint.mark_dirty()
    ctx.set_source_surface(paint)
    ctx.paint()
    # parked cars
    for col, row, color, flip in ((3, ROW_A, "#f2f2f0", False), (3, ROW_B, "#1d2733", True),
                                  (0, ROW_A, "#f4c21f", True)):
        spr, hw_, hh_ = make_car(hexc(color), stripes=False, with_wheels=False)
        cx = LINES_X[col] + STALL_W / 2
        cy = (row[0] + row[1]) / 2
        sh, pad = blurred_shadow(surface_alpha(spr), 24, alpha=0.55)
        ctx.save()
        ctx.translate(cx + 14, cy + 22)
        if flip:
            ctx.rotate(math.pi)
        ctx.set_source_surface(sh, -hw_ - pad, -hh_ - pad)
        ctx.paint()
        ctx.restore()
        ctx.save()
        ctx.translate(cx, cy)
        if flip:
            ctx.rotate(math.pi)
        ctx.set_source_surface(spr, -hw_, -hh_)
        ctx.paint()
        ctx.restore()
    # soft light / vignette
    g = cairo.RadialGradient(W * 0.4, H * 0.45, 300, W * 0.5, H * 0.5, H * 0.8)
    g.add_color_stop_rgba(0, 1, 0.95, 0.85, 0.06)
    g.add_color_stop_rgba(0.6, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, 0.45)
    ctx.set_source(g)
    ctx.paint()
    s.flush()
    return s


def build_outline():
    s, ctx = new_surface()
    ctx.translate(*TARGET)
    ctx.set_source_surface(make_car(RED_CAR, with_wheels=True)[0], -CHW, -CHH)
    ctx.paint()
    s.flush()
    a = surface_alpha(s)
    mask = (a > 0.5).astype(np.uint8)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (29, 29)))
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)[:, 0, :].astype(np.float64)
    c = gaussian_filter1d(c, 4, axis=0, mode="wrap")
    o, octx = new_surface()
    octx.set_line_join(cairo.LINE_JOIN_ROUND)

    def path():
        octx.move_to(*c[0])
        for p in c[1:]:
            octx.line_to(*p)
        octx.close_path()

    path()
    octx.set_source_rgba(1, 0.1, 0.1, 0.07)
    octx.fill()
    path()
    octx.set_source_rgba(0, 0, 0, 0.3)
    octx.set_line_width(30)
    octx.stroke()
    path()
    octx.set_source_rgb(*hexc("#ff1f1f"))
    octx.set_line_width(20)
    octx.stroke()
    o.flush()
    return o


BG = build_background()
OVERLAY, octx = new_surface()
octx.set_source_surface(build_outline())
octx.paint()
octx.set_source_surface(caption_surface([[("Pause when it's", WHITE)],
                                         [("PERFECTLY", YELLOW), (" parked!", WHITE)]], y0=470))
octx.paint()
FRAME, fctx = new_surface()

# precomputed tyre marks: (s, [rear-left, rear-right], alpha)
MARK_STEP = 10
MARKS = []
for s in np.arange(0, S_MAX, MARK_STEP):
    p, hd, vd, b = state(s)
    a = smoothstep(0.12, 0.5, abs(b))
    MARKS.append((s, [to_world(p, hd, (sx * TRACK, REAR_AX)) for sx in (-1, 1)],
                  [to_world(p, hd, (sx * TRACK, FRONT_AX)) for sx in (-1, 1)], a))


def render_frame(f):
    fctx.set_source_surface(BG)
    fctx.paint()
    fc = f % CYCLE
    s_now = s_of(f)
    fade = 1 - smoothstep(F_EXIT - 2, CYCLE - 1, fc)
    # tyre marks
    fctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for i in range(1, len(MARKS)):
        s, rear, front, a = MARKS[i]
        if s > s_now:
            break
        if a < 0.02:
            continue
        _, rear0, front0, _ = MARKS[i - 1]
        for k in range(2):
            fctx.move_to(*rear0[k])
            fctx.line_to(*rear[k])
        fctx.set_source_rgba(0.03, 0.03, 0.035, 0.55 * a * fade)
        fctx.set_line_width(54)
        fctx.stroke()
        for k in range(2):
            fctx.move_to(*front0[k])
            fctx.line_to(*front[k])
        fctx.set_source_rgba(0.03, 0.03, 0.035, 0.22 * a * fade)
        fctx.set_line_width(48)
        fctx.stroke()
    # tyre smoke (spawned on previous frames)
    for age in range(26, -1, -1):
        sk = s_of(f - age) if fc - age >= 0 else -1
        if not (0 <= sk <= S_MAX):
            continue
        p, hd, vd, b = state(sk)
        strength = smoothstep(0.15, 0.55, abs(b))
        if strength <= 0:
            continue
        r2 = np.random.default_rng(int(sk))
        for sx in (-1, 1):
            wx, wy = to_world(p, hd, (sx * (TRACK + 20), REAR_AX + 40))
            dx, dy = r2.normal(0, 1, 2)
            x = wx + dx * age * 7 - math.cos(vd) * age * 5
            y = wy + dy * age * 7 - math.sin(vd) * age * 5
            r = 70 + 17 * age
            al = 0.4 * strength * (1 - age / 27) ** 1.6
            g = cairo.RadialGradient(x, y, 0, x, y, r)
            g.add_color_stop_rgba(0, 0.86, 0.86, 0.88, al)
            g.add_color_stop_rgba(1, 0.86, 0.86, 0.88, 0)
            fctx.set_source(g)
            fctx.arc(x, y, r, 0, 2 * math.pi)
            fctx.fill()
    # car
    if 0 <= s_now <= S_MAX:
        p, hd, vd, b = state(s_now)
        rot = hd + math.pi / 2
        fctx.save()
        fctx.translate(p[0] + 16, p[1] + 26)
        fctx.rotate(rot)
        fctx.set_source_surface(CAR_SHADOW, -CHW - CSPAD, -CHH - CSPAD)
        fctx.paint()
        fctx.restore()
        fctx.save()
        fctx.translate(*p)
        fctx.rotate(rot)
        steer = max(-0.55, min(0.55, vd - hd))
        for ax, st in ((FRONT_AX, steer), (REAR_AX, 0)):
            for sx in (-1, 1):
                draw_tire(fctx, sx * TRACK, ax, st)
        fctx.set_source_surface(CAR, -CHW, -CHH)
        fctx.paint()
        fctx.restore()
    fctx.set_source_surface(OVERLAY)
    fctx.paint()
    return FRAME


def audio(dur):
    buf = tension_bed(dur, CYCLE, beats_per_cycle=4)
    n = len(buf)
    tf = np.arange(n) / SR * FPS
    fc = tf % CYCLE
    s = S_MATCH + SPEED * (fc - F_MATCH)
    on = ((s >= -600) & (s <= S_MAX + 600)).astype(float)
    on = gaussian_filter1d(on, SR * 0.05)
    idx = (np.clip(s, 0, S_MAX) / 2.0).round().astype(int)
    slip = np.abs(BETA[idx])
    x = POS[idx, 0]
    pan = np.clip((x - W / 2) / (W / 2), -1, 1)
    # engine: harmonic buzz whose pitch rises out of the drifts
    f0 = 62 + 55 * gaussian_filter1d(1 - np.clip(slip / 0.6, 0, 1), SR * 0.08)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    eng = sum(np.sin(h * ph) / h ** 0.8 for h in range(1, 9)) * 0.22
    eng += filtered_noise(n, 80, 600, 4) * 0.25
    # tyre screech
    scr_env = gaussian_filter1d(np.clip((slip - 0.12) / 0.45, 0, 1), SR * 0.03)
    vib = np.sin(2 * np.pi * 7 * np.arange(n) / SR) * 40
    tone = (np.sin(2 * np.pi * np.cumsum(1900 + vib) / SR) + 0.6 * np.sin(2 * np.pi * np.cumsum(2650 - vib) / SR))
    scr = (filtered_noise(n, 1500, 4200, 8) * 0.9 + tone * 0.12) * scr_env * 0.55
    mono = (eng + scr) * on
    buf[:, 0] += mono * np.cos((pan + 1) * np.pi / 4) * 1.2
    buf[:, 1] += mono * np.sin((pan + 1) * np.pi / 4) * 1.2
    return normalize(buf)


if __name__ == "__main__":
    print("cycle", CYCLE, "match", F_MATCH, "exit", F_EXIT)
    cli(NAME, render_frame, N_FRAMES, audio,
        default_preview=[F_MATCH, F_MATCH + 1, F_MATCH - 8, F_MATCH + 9])
