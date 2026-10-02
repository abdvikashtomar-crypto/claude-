"""Prepare everything the renderer needs from the raw founder videos.

Inputs (in $WORK):
  src/v1.mp4 v2.mp4 v3.mp4   founder videos (WhatsApp exports)
  src/mansi.jpg               founder photo (Instagram screenshot)
  sep/v{1,2,3}_voc.wav        founder voice isolated with UVR-MDX-NET-Voc_FT
  src/words.json              word timestamps (Parakeet TDT 0.6B v2)
Outputs (in $WORK/build):
  voice/<id>.wav, voice.json  trimmed voice lines + word timings
  foot/<id>/0001.jpg ...      cropped footage frames, 30 fps
  stickers/<name>.png         emoji illustrations with sticker border
  mansi_sticker.png           founder cut-out with sticker border
"""
import json, os, subprocess
import numpy as np
import soundfile as sf
from PIL import Image, ImageFilter, ImageOps

WORK = os.environ["WORK"]
B = f"{WORK}/build"
SR = 48000

# id: (source video, first word start, last word start) -- times from words.json
VOICE = {
    "hi":       ("v3", 0.16, 2.40),
    "every":    ("v3", 20.64, 23.12),
    "made":     ("v3", 23.76, 24.72),
    "mistake":  ("v2", 6.80, 7.68),
    "tiny":     ("v2", 9.92, 11.44),
    "thousand": ("v2", 15.68, 16.72),
    "thicker":  ("v2", 17.36, 20.40),
    "week":     ("v2", 24.32, 25.04),
    "mix":      ("v2", 29.60, 36.40),
    "perry":    ("v3", 10.16, 12.96),
    "excited":  ("v3", 14.80, 20.16),
    "sign":     ("v3", 28.16, 28.56),
    "go":       ("v3", 29.12, 30.88),
}
# hand-checked cut points (loudness traces) where the automatic trim lands inside a word
OVERRIDE = {"hi": {"e": 2.80}, "tiny": {"s": 10.05}, "thousand": {"s": 15.60}, "week": {"s": 24.19}}
# ASR spelling fixes for on-screen captions
FIX = {"notes": "knots", "notes.": "knots.", "V": "Vee"}

# id: (source, start, end, crop x0,y0,x1,y1 as fractions) -- crops stay above the burned-in captions
FOOT = {
    "v3_every":   ("v3", 20.40, 25.60, (0.05, 0.05, 0.95, 0.615)),
    "v2_diary":   ("v2", 6.40, 21.40, (0.00, 0.07, 1.00, 0.665)),
    "v2_paint":   ("v2", 21.20, 23.70, (0.00, 0.00, 1.00, 0.660)),
    "v2_mixA":    ("v2", 29.90, 32.55, (0.00, 0.00, 1.00, 0.660)),   # hoop close-ups
    "v2_mixB":    ("v2", 29.30, 36.70, (0.00, 0.22, 0.78, 0.665)),   # wide shots, reframed on Mansi + rack
    "v2_final":   ("v2", 36.70, 39.30, (0.00, 0.00, 1.00, 0.660)),
    "v3_perry":   ("v3", 9.80, 13.70, (0.00, 0.00, 1.00, 0.610)),
    "v3_excited": ("v3", 14.50, 20.90, (0.05, 0.05, 0.95, 0.615)),
}
# The source reels carry Instagram's download watermark (icon + @vee.threads), which jumps between two fixed
# spots. Each spot gets a pixel mask learned from frames where it sits on a plain wall; frames are inpainted there.
WATERMARK = {
    # icon template top-left, template source (video, time), frames to learn the mask from, search box
    "R": ((494, 258), ("v3", 22.0), [("v3", 22.0), ("v2", 7.5), ("v2", 25.0), ("v3", 1.0)], (408, 250, 540, 338)),
    "L": ((42, 556), ("v3", 11.5), [("v3", 11.5), ("v2", 10.0), ("v3", 16.0)], (36, 546, 182, 640)),
}

STICKERS = """eagle sloth honeybee octopus red-apple worm soccer-ball cherry-blossom sunflower cow
round-pushpin house-with-garden sheaf-of-rice sewing-needle thread yarn robot printer adhesive-bandage
exploding-head smiling-face-with-sunglasses crown grimacing-face pinching-hand magnifying-glass-tilted-left
face-with-spiral-eyes flexed-biceps hourglass-not-done cloud sun-behind-cloud sparkles eyes flushed-face
red-heart yellow-heart backhand-index-pointing-right globe-showing-asia-australia sweat-droplets fire
hundred-points notebook artist-palette paintbrush waving-hand party-popper trophy check-mark-button
cross-mark star-struck smiling-face-with-heart-eyes woman-raising-hand""".split()


def sh(*a):
    subprocess.run(a, check=True)


def rms_db(x, sr, hop=0.01):
    n = int(sr * hop)
    m = len(x) // n
    r = np.sqrt(np.mean(x[: m * n].reshape(m, n) ** 2, axis=1) + 1e-12)
    return 20 * np.log10(r)


def prep_voice():
    os.makedirs(f"{B}/voice", exist_ok=True)
    words = json.load(open(f"{WORK}/src/words.json"))
    tracks = {}
    for v in ("v1", "v2", "v3"):
        a, sr = sf.read(f"{WORK}/sep/{v}_voc.wav", dtype="float32")
        a = a.mean(axis=1) if a.ndim > 1 else a
        # resample 44.1k -> 48k via ffmpeg-quality polyphase is overkill here; use numpy interp at high quality
        t_old = np.arange(len(a)) / sr
        t_new = np.arange(int(len(a) * SR / sr)) / SR
        tracks[v] = np.interp(t_new, t_old, a).astype(np.float32)
    out = {}
    for vid, (v, s0, s1) in VOICE.items():
        x = tracks[v]
        db = rms_db(x, SR)
        hop = 0.01
        thr = max(-46.0, db.max() - 40.0)
        ws = words[v]
        i0 = next(k for k, w in enumerate(ws) if abs(w["s"] - s0) < 0.01)
        i1 = next(k for k, w in enumerate(ws) if abs(w["s"] - s1) < 0.01)
        nxt = ws[i1 + 1]["s"] if i1 + 1 < len(ws) else len(x) / SR
        prv = ws[i0 - 1]["s"] + 0.12 if i0 > 0 else 0.0
        # start: last silent 10ms frame just before the first word, else the quietest frame there
        lo, hi = int(max(prv, s0 - 0.25) / hop), int((s0 + 0.02) / hop)
        quiet = [f for f in range(lo, hi + 1) if db[f] < thr]
        start = (quiet[-1] if quiet else lo + int(np.argmin(db[lo:hi + 1]))) * hop
        # end: first 60ms of silence after the last word, else the quietest frame before the next word
        lo, hi = int((s1 + 0.12) / hop), int(min(nxt + 0.02, len(x) / SR - 0.07) / hop)
        run = [f for f in range(lo, hi) if all(db[f:f + 6] < thr)]
        if run:
            end = run[0] * hop + 0.04
        else:
            lo2 = int((s1 + 0.15) / hop)
            end = (lo2 + int(np.argmin(db[lo2:hi + 1]))) * hop
        start = OVERRIDE.get(vid, {}).get("s", start)
        end = OVERRIDE.get(vid, {}).get("e", end)
        seg = x[int(start * SR):int(end * SR)].copy()
        fi, fo = int(0.012 * SR), int(0.03 * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fo:] *= np.linspace(1, 0, fo)
        sf.write(f"{B}/voice/{vid}.wav", seg, SR)
        cap = []
        for w in ws[i0:i1 + 1]:
            if w["s"] < start - 0.02:
                continue
            cap.append({"w": FIX.get(w["w"], w["w"]), "t": round(w["s"] - start, 3)})
        out[vid] = {"src": v, "s": round(start, 3), "e": round(end, 3), "dur": round(end - start, 3), "words": cap}
        print(f"{vid:9s} {v} {start:6.2f}-{end:6.2f} ({end - start:4.2f}s) " + " ".join(c["w"] for c in cap))
    json.dump(out, open(f"{B}/voice.json", "w"), indent=1)


def grab(v, t):
    import cv2
    cap = cv2.VideoCapture(f"{WORK}/src/{v}.mp4")
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, f = cap.read()
    return f


def watermark_models():
    import cv2
    models = {}
    for k, ((ix, iy), (tv, tt), learn, (x0, y0, x1, y1)) in WATERMARK.items():
        g = cv2.cvtColor(grab(tv, tt), cv2.COLOR_BGR2GRAY)
        tpl = g[iy:iy + 40, ix:ix + 39].copy()
        mask = None
        for lv, lt in learn:
            gg = cv2.cvtColor(grab(lv, lt), cv2.COLOR_BGR2GRAY)
            diff = gg.astype(np.int16) - cv2.medianBlur(gg, 21).astype(np.int16)
            m = (diff > 22).astype(np.uint8)
            mask = m if mask is None else mask & m
        box = np.zeros_like(mask)
        box[y0:y1, x0:x1] = 1
        mask = cv2.dilate(mask * box, np.ones((3, 3), np.uint8), iterations=2) * 255
        models[k] = (tpl, mask, (ix, iy))
    return models


def clean_frame(f, models):
    import cv2
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    for tpl, mask, (ix, iy) in models.values():
        win = g[iy - 6:iy + 46, ix - 6:ix + 45]
        score = cv2.matchTemplate(win, tpl, cv2.TM_CCOEFF_NORMED).max()
        if score > 0.45:
            f = cv2.inpaint(f, mask, 5, cv2.INPAINT_TELEA)
    return f


def prep_footage():
    import cv2
    models = watermark_models()
    for fid, (v, s, e, (x0, y0, x1, y1)) in FOOT.items():
        d = f"{B}/foot/{fid}"
        os.makedirs(d, exist_ok=True)
        cap = cv2.VideoCapture(f"{WORK}/src/{v}.mp4")
        cap.set(cv2.CAP_PROP_POS_MSEC, s * 1000)
        n = 0
        while cap.get(cv2.CAP_PROP_POS_MSEC) < e * 1000:
            ok, f = cap.read()
            if not ok:
                break
            f = clean_frame(f, models)
            h, w = f.shape[:2]
            f = f[int(h * y0):int(h * y1), int(w * x0):int(w * x1)]
            f = cv2.resize(f, (920, round(f.shape[0] * 920 / f.shape[1])), interpolation=cv2.INTER_LANCZOS4)
            blur = cv2.GaussianBlur(f, (0, 0), 1.6)
            f = cv2.addWeighted(f, 1.6, blur, -0.6, 0)
            hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[..., 1] = np.clip(hsv[..., 1] * 1.08, 0, 255)
            f = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
            f = cv2.convertScaleAbs(f, alpha=1.04, beta=-4)
            n += 1
            cv2.imwrite(f"{d}/{n:04d}.jpg", f, [cv2.IMWRITE_JPEG_QUALITY, 93])
        json.dump({"src": v, "s": s, "e": e}, open(f"{d}/meta.json", "w"))
        print("footage", fid, n, "frames")


def stickerize(im, border, outline, ink=(28, 25, 23)):
    """White sticker border + thin ink outline around an RGBA image."""
    pad = border + outline + 6
    im = ImageOps.expand(im, pad, fill=(0, 0, 0, 0))
    a = im.getchannel("A")

    def grow(mask, r):
        g = mask.filter(ImageFilter.GaussianBlur(r * 0.75))
        return g.point(lambda p: 255 if p > 10 else int(p * 25.5))

    white = grow(a, border)
    black = grow(white, outline)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(Image.new("RGBA", im.size, ink + (255,)), (0, 0), black)
    out.paste(Image.new("RGBA", im.size, (255, 255, 255, 255)), (0, 0), white)
    out.alpha_composite(im)
    return out


def prep_stickers():
    import cairosvg
    d = f"{B}/stickers"
    os.makedirs(d, exist_ok=True)
    data = json.load(open(f"{WORK}/assets/npm/package/icons.json"))
    icons, aliases = data["icons"], data.get("aliases", {})
    for name in STICKERS:
        key = name
        while key not in icons:
            key = aliases[key]["parent"]
        body = icons[key]["body"]
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="360" height="360">{body}</svg>'
        png = cairosvg.svg2png(bytestring=svg.encode())
        from io import BytesIO
        im = Image.open(BytesIO(png)).convert("RGBA")
        stickerize(im, 12, 5).save(f"{d}/{name}.png")
    print("stickers", len(STICKERS))


def prep_mansi():
    im = Image.open(f"{WORK}/assets/cut/mansi_birefnet-portrait.png").convert("RGBA")
    im = im.resize((im.width * 3 // 2, im.height * 3 // 2), Image.LANCZOS)
    stickerize(im, 16, 6).save(f"{B}/mansi_sticker.png")
    print("mansi sticker", im.size)


if __name__ == "__main__":
    import sys
    os.makedirs(B, exist_ok=True)
    steps = sys.argv[1:] or ["voice", "footage", "stickers", "mansi"]
    if "voice" in steps:
        prep_voice()
    if "footage" in steps:
        prep_footage()
    if "stickers" in steps:
        prep_stickers()
    if "mansi" in steps:
        prep_mansi()
