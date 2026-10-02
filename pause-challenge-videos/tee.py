"""Cut-out of the hand-embroidered tee product photo (assets/embroidered_tee.webp)."""
import os

import cairo
import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d

from common import H, W, new_surface, surface_from_rgba

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "embroidered_tee.webp")


def _source():
    im = cv2.imread(SRC)
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    m = (g < 110).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    mask = np.zeros_like(m)
    cv2.drawContours(mask, [c], -1, 1, thickness=cv2.FILLED)   # fills the embroidery
    mask = cv2.erode(mask, np.ones((3, 3), np.uint8))           # drop the white fringe
    x, y, w, h = cv2.boundingRect(c)
    return im[y:y + h, x:x + w], mask[y:y + h, x:x + w]


def load_tee(width):
    """-> (cairo surface, alpha float32 HxW, (w, h), collar_top (x, y)) at `width` px."""
    im, mask = _source()
    h0, w0 = mask.shape
    height = int(round(h0 * width / w0))
    rgb = cv2.resize(im, (width, height), interpolation=cv2.INTER_LANCZOS4)
    blur = cv2.GaussianBlur(rgb, (0, 0), 1.2)
    rgb = cv2.addWeighted(rgb, 1.35, blur, -0.35, 0)            # gentle sharpen after upscale
    a = cv2.resize(mask.astype(np.float32), (width, height), interpolation=cv2.INTER_LINEAR)
    a = cv2.GaussianBlur(a, (0, 0), 0.9)
    a = np.clip((a - 0.5) * 1.6 + 0.5, 0, 1)
    rgba = np.dstack([rgb[..., ::-1], (a * 255).astype(np.uint8)])
    top = int(np.argmax(a.max(axis=1) > 0.5))
    xs = np.where(a[top + 2] > 0.5)[0]
    collar = (float(xs.mean()), float(top))
    return surface_from_rgba(rgba), a, (width, height), collar


def wobbly_outline(mask, dilate=24, width=22, color=(1.0, 0.12, 0.12), wobble=(4, 3, 2),
                   seed=3, fill=None):
    """Full-frame mask (HxW, 0..1) -> transparent surface with a hand-drawn outline."""
    m = (mask > 0.5).astype(np.uint8)
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate | 1, dilate | 1)))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)[:, 0, :].astype(np.float64)
    cc = np.r_[c, c[:1]]
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(cc, axis=0).T))]
    total = seg[-1]
    t = np.arange(0, total, 5.0)
    pts = np.stack([np.interp(t, seg, cc[:, 0]), np.interp(t, seg, cc[:, 1])], 1)
    pts = gaussian_filter1d(pts, 3, axis=0, mode="wrap")
    tang = np.gradient(pts, axis=0)
    nrm = np.stack([tang[:, 1], -tang[:, 0]], 1)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
    r = np.random.default_rng(seed)
    wob = sum(a * np.sin(2 * np.pi * t / total * k + r.uniform(0, 6))
              for a, k in zip(wobble, (7, 19, 41)))
    pts = pts + nrm * wob[:, None]
    s, ctx = new_surface()
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)

    def path():
        ctx.move_to(*pts[0])
        for p in pts[1:]:
            ctx.line_to(*p)
        ctx.close_path()

    if fill:
        path()
        ctx.set_source_rgba(*fill)
        ctx.fill()
    path()
    ctx.set_source_rgba(0, 0, 0, 0.22)
    ctx.set_line_width(width + 12)
    ctx.stroke()
    path()
    ctx.set_source_rgb(*color)
    ctx.set_line_width(width)
    ctx.stroke()
    s.flush()
    return s
