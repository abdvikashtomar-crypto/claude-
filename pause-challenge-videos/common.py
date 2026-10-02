"""Shared helpers for the "pause at the right time" challenge videos.

Everything is drawn in a 2160x3840 (4K UHD, 9:16) coordinate space with
pycairo, piped as raw frames into ffmpeg, and muxed with a synthesized
soundtrack.
"""
import math
import os
import subprocess
import sys

import cairo
import numpy as np
from scipy import signal

W, H = 2160, 3840
FPS = 30
SR = 48000

FONT = "Montserrat Black"
YELLOW = (1.0, 0.83, 0.0)
WHITE = (1.0, 1.0, 1.0)
GREEN = (0.17, 1.0, 0.45)

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")


def hexc(h, a=None):
    h = h.lstrip("#")
    c = tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return c if a is None else c + (a,)


def mix(c1, c2, t):
    return tuple(a + (b - a) * t for a, b in zip(c1, c2))


def shade(c, k):
    return tuple(max(0.0, min(1.0, v * k)) for v in c[:3])


def smoothstep(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- surfaces

def new_surface(w=W, h=H, fmt=cairo.FORMAT_ARGB32):
    s = cairo.ImageSurface(fmt, w, h)
    return s, cairo.Context(s)


def surface_from_rgba(arr):
    """numpy HxWx4 uint8 RGBA (straight alpha) -> cairo ARGB32 surface."""
    h, w = arr.shape[:2]
    a = arr[..., 3:4].astype(np.float32) / 255.0
    rgb = (arr[..., :3].astype(np.float32) * a).round().astype(np.uint8)
    bgra = np.empty((h, w, 4), np.uint8)
    bgra[..., 0] = rgb[..., 2]
    bgra[..., 1] = rgb[..., 1]
    bgra[..., 2] = rgb[..., 0]
    bgra[..., 3] = arr[..., 3]
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, w, h)
    stride = s.get_stride()
    buf = np.ndarray((h, stride // 4, 4), np.uint8, s.get_data())
    buf[:, :w] = bgra
    s.mark_dirty()
    return s


def surface_alpha(s):
    """Return the alpha channel of an ARGB32 surface as float32 HxW in 0..1."""
    s.flush()
    h, w = s.get_height(), s.get_width()
    buf = np.ndarray((h, s.get_stride() // 4, 4), np.uint8, s.get_data())
    return buf[:, :w, 3].astype(np.float32) / 255.0


def blurred_shadow(mask, radius, color=(0, 0, 0), alpha=0.5, pad=None):
    """mask: float HxW 0..1 -> cairo surface of a soft shadow (padded)."""
    import cv2
    pad = pad if pad is not None else int(radius * 3)
    m = np.pad(mask, pad)
    k = int(radius * 3) | 1
    m = cv2.GaussianBlur(m, (k, k), radius)
    rgba = np.zeros(m.shape + (4,), np.uint8)
    rgba[..., 0] = int(color[0] * 255)
    rgba[..., 1] = int(color[1] * 255)
    rgba[..., 2] = int(color[2] * 255)
    rgba[..., 3] = np.clip(m * alpha * 255, 0, 255).astype(np.uint8)
    return surface_from_rgba(rgba), pad


def noise_texture(w, h, scale, seed=0, octaves=3):
    """Cheap smooth value noise in 0..1 (numpy + bilinear upsampling)."""
    import cv2
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gw = max(2, int(w / scale) + 2)
        gh = max(2, int(h / scale) + 2)
        g = rng.random((gh, gw)).astype(np.float32)
        out += amp * cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)
        tot += amp
        amp *= 0.5
        scale /= 2.0
    return np.clip(out / tot, 0, 1)


# ---------------------------------------------------------------- captions

def caption_surface(lines, y0, size=158, gap=1.13, stroke=0.17, max_w=1900):
    """lines: [[(text, rgb), ...], ...] -> transparent full-frame surface."""
    s, ctx = new_surface()
    ctx.select_font_face(FONT, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)
    widest = max(sum(ctx.text_extents(t).x_advance for t, _ in segs) for segs in lines)
    if widest > max_w:
        size = size * max_w / widest
        ctx.set_font_size(size)
    fo = cairo.FontOptions()
    fo.set_antialias(cairo.ANTIALIAS_BEST)
    fo.set_hint_style(cairo.HINT_STYLE_NONE)
    fo.set_hint_metrics(cairo.HINT_METRICS_OFF)
    ctx.set_font_options(fo)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)

    def line_path(segs, x, y, dx=0.0, dy=0.0):
        for t, _ in segs:
            ctx.move_to(x + dx, y + dy)
            ctx.text_path(t)
            x += ctx.text_extents(t).x_advance

    for i, segs in enumerate(lines):
        total = sum(ctx.text_extents(t).x_advance for t, _ in segs)
        x = W / 2 - total / 2
        y = y0 + i * size * gap
        # soft drop shadow
        for k, a in ((1.9, 0.10), (1.45, 0.14), (1.15, 0.2)):
            ctx.new_path()
            line_path(segs, x, y, 0, size * 0.07)
            ctx.set_source_rgba(0, 0, 0, a)
            ctx.set_line_width(size * stroke * k)
            ctx.stroke()
        # black outline
        ctx.new_path()
        line_path(segs, x, y)
        ctx.set_source_rgb(0.04, 0.04, 0.05)
        ctx.set_line_width(size * stroke)
        ctx.stroke()
        # fills
        xx = x
        for t, col in segs:
            ctx.new_path()
            ctx.move_to(xx, y)
            ctx.text_path(t)
            ctx.set_source_rgb(*col)
            ctx.fill()
            xx += ctx.text_extents(t).x_advance
    s.flush()
    return s


# ---------------------------------------------------------------- encoding

class Encoder:
    """Pipe BGRA cairo frames into ffmpeg -> H.264 High@5.1, 4K, bt709."""

    def __init__(self, path, w=W, h=H, fps=FPS, crf=17, preset="slow"):
        self.path = path
        self.w, self.h = w, h
        cmd = [
            "ffmpeg", "-y", "-v", "error",
            "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{w}x{h}",
            "-r", str(fps), "-i", "-",
            "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int",
            "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
            "-profile:v", "high", "-level:v", "5.1", "-pix_fmt", "yuv420p",
            "-g", str(fps), "-bf", "2",
            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
            "-color_range", "tv", "-movflags", "+faststart", path,
        ]
        self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    def write(self, surface):
        surface.flush()
        assert surface.get_stride() == self.w * 4
        self.proc.stdin.write(bytes(surface.get_data()))

    def close(self):
        self.proc.stdin.close()
        if self.proc.wait() != 0:
            raise RuntimeError("ffmpeg failed")


def mux(video_path, audio, out_path):
    """audio: float32 Nx2 in -1..1. Loudness-normalised AAC, video copied."""
    wav = out_path + ".wav"
    from scipy.io import wavfile
    wavfile.write(wav, SR, np.clip(audio, -1, 1).astype(np.float32))
    cmd = [
        "ffmpeg", "-y", "-v", "error", "-i", video_path, "-i", wav,
        "-map", "0:v", "-map", "1:a", "-c:v", "copy",
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000",
        "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
        "-shortest", "-movflags", "+faststart", out_path,
    ]
    subprocess.run(cmd, check=True)
    os.remove(wav)


def run(name, render_frame, n_frames, audio_fn, preview=None):
    """Render a whole video, or a few preview stills when preview=[frames]."""
    os.makedirs(OUT_DIR, exist_ok=True)
    if preview is not None:
        import cv2
        for f in preview:
            s = render_frame(f)
            s.flush()
            buf = np.ndarray((H, W, 4), np.uint8, s.get_data())
            small = cv2.resize(buf[..., :3], (W // 3, H // 3), interpolation=cv2.INTER_AREA)
            p = os.path.join(OUT_DIR, f"preview_{name}_{f:03d}.png")
            cv2.imwrite(p, small)
            print("wrote", p)
        return
    tmp = os.path.join(OUT_DIR, f".{name}_video.mp4")
    enc = Encoder(tmp)
    for f in range(n_frames):
        enc.write(render_frame(f))
        if f % 20 == 0:
            print(f"{name}: frame {f}/{n_frames}", flush=True)
    enc.close()
    out = os.path.join(OUT_DIR, f"{name}.mp4")
    mux(tmp, audio_fn(n_frames / FPS), out)
    os.remove(tmp)
    print("done", out)


def cli(name, render_frame, n_frames, audio_fn, default_preview):
    args = sys.argv[1:]
    if args and args[0] == "preview":
        frames = [int(a) for a in args[1:]] or default_preview
        run(name, render_frame, n_frames, audio_fn, preview=frames)
    else:
        run(name, render_frame, n_frames, audio_fn)


# ---------------------------------------------------------------- audio

def _t(dur):
    return np.arange(int(dur * SR)) / SR


def add(buf, sig, at, pan=0.0, gain=1.0):
    """Mix mono `sig` into stereo `buf` at time `at` (s). pan -1..1.
    Wraps around the end so loops stay seamless."""
    i0 = int(round(at * SR))
    l = math.cos((pan + 1) * math.pi / 4) * gain
    r = math.sin((pan + 1) * math.pi / 4) * gain
    n = len(buf)
    idx = (np.arange(len(sig)) + i0) % n
    np.add.at(buf[:, 0], idx, sig * l)
    np.add.at(buf[:, 1], idx, sig * r)


def kick(dur=0.45):
    t = _t(dur)
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) * 0.9


def tick(freq=2300, dur=0.05):
    t = _t(dur)
    rng = np.random.default_rng(int(freq))
    n = rng.standard_normal(len(t))
    b, a = signal.butter(2, [freq * 0.7, min(freq * 1.6, 20000)], "bandpass", fs=SR)
    return (signal.lfilter(b, a, n) * 0.5 + 0.35 * np.sin(2 * np.pi * freq * t)) * np.exp(-t * 90)


def thud(dur=0.12, seed=1):
    t = _t(dur)
    rng = np.random.default_rng(seed)
    low = np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 40)) * t) * np.exp(-t * 35)
    b, a = signal.butter(2, 1800, "lowpass", fs=SR)
    crunch = signal.lfilter(b, a, rng.standard_normal(len(t))) * np.exp(-t * 60) * 0.5
    return low * 0.8 + crunch


def filtered_noise(n, lo, hi, seed=0):
    rng = np.random.default_rng(seed)
    b, a = signal.butter(2, [lo, hi], "bandpass", fs=SR)
    return signal.lfilter(b, a, rng.standard_normal(n))


def whoosh(dur=0.7, seed=3):
    """Pass-by whoosh peaking in the middle."""
    t = _t(dur)
    n = len(t)
    env = np.exp(-((t - dur / 2) / (dur / 5)) ** 2)
    # sweep a band-pass by blending a few fixed bands
    bands = [(200, 600), (500, 1500), (1200, 3500), (2500, 6000)]
    pos = np.sin(np.pi * t / dur)  # 0 -> 1 -> 0
    out = np.zeros(n)
    for i, (lo, hi) in enumerate(bands):
        w = np.exp(-((pos * (len(bands) - 1) - i) ** 2) / 0.6)
        out += filtered_noise(n, lo, hi, seed + i) * w
    return out * env * 0.9


def tension_bed(dur, cycle_frames, beats_per_cycle=4, tick_div=2, seed=0):
    """Kick on the beat + clock ticks; length `dur` seconds, loop-aligned."""
    n = int(round(dur * SR))
    buf = np.zeros((n, 2))
    cycle = cycle_frames / FPS
    beat = cycle / beats_per_cycle
    k = kick()
    t1, t2 = tick(2400), tick(1700)
    nb = int(round(dur / beat))
    for i in range(nb):
        add(buf, k, i * beat, 0, 0.55)
        for j in range(tick_div):
            tk = t1 if (i * tick_div + j) % 2 == 0 else t2
            add(buf, tk, i * beat + j * beat / tick_div, 0.15 if j % 2 else -0.15, 0.22)
    # low drone
    t = np.arange(n) / SR
    drone = (np.sin(2 * np.pi * 55 * t) + 0.4 * np.sin(2 * np.pi * 82.5 * t)) * 0.05
    buf[:, 0] += drone
    buf[:, 1] += drone
    return buf


def normalize(buf, peak=0.89):
    m = np.max(np.abs(buf))
    return buf * (peak / m) if m > 0 else buf
