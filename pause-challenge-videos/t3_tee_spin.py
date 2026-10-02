"""T3 - Tee spin (uses the real product photo).

The embroidered tee itself is the needle: it spins on a dial with a changing
speed (same timing engine as V3, with near misses). On exactly one frame per
loop it is perfectly upright inside the red outline.
"""
import math

import cairo

import v3_stop_the_needle as nd
from common import (H, W, GREEN, WHITE, YELLOW, blurred_shadow, caption_surface, cli, hexc,
                    new_surface, surface_alpha)
from tee import load_tee, wobbly_outline

NAME = "07_tee_spin"
CYCLE, CYCLES, N_FRAMES = nd.CYCLE, nd.CYCLES, nd.N_FRAMES
F_MATCH = nd.F_MATCH
C = (W / 2, 2210)
R = 1000
ZONE = nd.ZONE
TEE, TEE_A, (TW, TH), _ = load_tee(1300)
SHADOW, SPAD = blurred_shadow(TEE_A, 28, color=(0.35, 0.15, 0.15), alpha=0.42)


def spin(f):
    """Tee rotation in degrees (0 = upright) for frame f."""
    return ((nd.angle(f) - nd.TARGET + 180) % 360) - 180


def pol(r, deg):
    a = math.radians(deg - 90)
    return C[0] + r * math.cos(a), C[1] + r * math.sin(a)


def build_background():
    s, ctx = new_surface()
    g = cairo.RadialGradient(C[0], C[1] - 200, 150, C[0], C[1], 2700)
    g.add_color_stop_rgb(0, *hexc("#f7e6e1"))
    g.add_color_stop_rgb(0.5, *hexc("#e3c3bb"))
    g.add_color_stop_rgb(1, *hexc("#b98c84"))
    ctx.set_source(g)
    ctx.paint()
    # dial face
    g = cairo.RadialGradient(C[0], C[1], 300, C[0], C[1], R + 40)
    g.add_color_stop_rgba(0, 1, 1, 1, 0.35)
    g.add_color_stop_rgba(1, 1, 1, 1, 0.08)
    ctx.set_source(g)
    ctx.arc(C[0], C[1], R, 0, 2 * math.pi)
    ctx.fill()
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for i in range(60):
        d = i * 6
        major = i % 5 == 0
        ctx.move_to(*pol(R - (90 if major else 50), d))
        ctx.line_to(*pol(R - 18, d))
        ctx.set_source_rgba(0.24, 0.13, 0.13, 0.8 if major else 0.35)
        ctx.set_line_width(12 if major else 6)
        ctx.stroke()
    ctx.set_source_rgb(*hexc("#3b2424"))
    ctx.set_line_width(24)
    ctx.arc(C[0], C[1], R, 0, 2 * math.pi)
    ctx.stroke()
    # green "upright" zone on the ring + marker
    for pad, al in ((6, 0.12), (3, 0.25), (0, 1.0)):
        ctx.arc(C[0], C[1], R, math.radians(-90 - ZONE - pad), math.radians(-90 + ZONE + pad))
        ctx.set_source_rgba(*GREEN, al)
        ctx.set_line_width(46 + pad * 6)
        ctx.set_line_cap(cairo.LINE_CAP_BUTT)
        ctx.stroke()
    tip = pol(R + 50, 0)
    ctx.move_to(*tip)
    ctx.line_to(*pol(R + 150, -4.5))
    ctx.line_to(*pol(R + 150, 4.5))
    ctx.close_path()
    ctx.set_source_rgb(*GREEN)
    ctx.fill_preserve()
    ctx.set_source_rgba(0, 0, 0, 0.35)
    ctx.set_line_width(4)
    ctx.stroke()
    s.flush()
    return s


def build_outline():
    s, ctx = new_surface()
    ctx.set_source_surface(TEE, C[0] - TW / 2, C[1] - TH / 2)
    ctx.paint()
    s.flush()
    return wobbly_outline(surface_alpha(s), dilate=27, width=22)


def paint_tee(ctx, deg, src=TEE, pad=0.0, alpha=1.0, dx=0.0, dy=0.0):
    ctx.save()
    ctx.translate(C[0] + dx, C[1] + dy)
    ctx.rotate(math.radians(deg))
    ctx.set_source_surface(src, -TW / 2 - pad, -TH / 2 - pad)
    ctx.get_source().set_filter(cairo.FILTER_GOOD)
    ctx.paint_with_alpha(alpha)
    ctx.restore()


BG = build_background()
OVERLAY, octx = new_surface()
octx.set_source_surface(build_outline())
octx.paint()
octx.set_source_surface(caption_surface([[("Pause when it's", WHITE)],
                                         [("PERFECTLY", YELLOW), (" straight!", WHITE)]], y0=500))
octx.paint()
FRAME, fctx = new_surface()


def render_frame(f):
    fctx.set_source_surface(BG)
    fctx.paint()
    a = spin(f)
    sweep = (nd.angle(f) - nd.angle(f - 1)) % 360
    paint_tee(fctx, a, SHADOW, SPAD, 1.0, 34, 56)
    for k, al in ((0.66, 0.1), (0.33, 0.16)):          # motion ghosts
        paint_tee(fctx, a - sweep * k, alpha=al)
    paint_tee(fctx, a)
    fctx.set_source_surface(OVERLAY)
    fctx.paint()
    return FRAME


if __name__ == "__main__":
    print("match", F_MATCH, "closest miss %.2f deg" % nd.NEAR)
    cli(NAME, render_frame, N_FRAMES, nd.audio, default_preview=[F_MATCH, F_MATCH + 1, 2, 3])
