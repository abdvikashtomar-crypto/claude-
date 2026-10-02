"""Render the reel frames.

  python render.py stills 0.5 2.4 9      -> $WORK/out/still_<t>.png for quick layout checks
  python render.py video                 -> $WORK/out/video.mp4 (silent, 1080x1920 @30fps)
"""
import math, os, subprocess, sys
from multiprocessing import Pool
import numpy as np
import cairocffi as cairo
import scenes as S
from doodle import W, H, FPS, rgb, WORK

OUT = f"{WORK}/out"


class Renderer:
    def __init__(self):
        self.surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)

    def frame(self, t):
        ctx = cairo.Context(self.surf)
        name = S.scene_at(t)
        ctx.set_source_surface(S.bg_surface(S.bg_color(name, t), S.boil(t, 6) % 3), 0, 0)
        ctx.paint()
        ctx.save()
        dx, dy = S.shake(t)
        z = S.punch(t)
        ctx.translate(W / 2 + dx, H / 2 + dy)
        ctx.scale(z, z)
        ctx.translate(-W / 2, -H / 2)
        S.SCENE_FN[name](ctx, t)
        ctx.restore()
        S.captions(ctx, t)
        S.progress(ctx, t)
        S.wipe(ctx, t)
        self.surf.flush()
        return self.surf


def stills(times):
    os.makedirs(OUT, exist_ok=True)
    r = Renderer()
    for t in times:
        r.frame(t).write_to_png(f"{OUT}/still_{t:05.2f}.png")
        print("still", t, S.scene_at(t))


def chunk(args):
    k, f0, f1 = args
    r = Renderer()
    path = f"{OUT}/part{k}.mp4"
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "15",
                           "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for f in range(f0, f1):
        ff.stdin.write(bytes(r.frame(f / FPS).get_data()))
    ff.stdin.close()
    ff.wait()
    return path


def video(workers=4):
    os.makedirs(OUT, exist_ok=True)
    n = math.ceil(S.END * FPS)
    bounds = np.linspace(0, n, workers * 3 + 1).astype(int)
    jobs = [(k, bounds[k], bounds[k + 1]) for k in range(len(bounds) - 1)]
    with Pool(workers) as p:
        parts = p.map(chunk, jobs, chunksize=1)
    with open(f"{OUT}/parts.txt", "w") as f:
        f.writelines(f"file '{x}'\n" for x in parts)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{OUT}/parts.txt", "-c",
                    "copy", f"{OUT}/video.mp4"], check=True)
    print("video", n, "frames,", S.END, "s")


def final(dest):
    """Upload-ready files: one H.264 encode, muxed with each audio mix."""
    os.makedirs(dest, exist_ok=True)
    enc = f"{OUT}/video_final.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{OUT}/video.mp4", "-c:v", "libx264", "-preset", "slow",
                    "-crf", "18", "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p", "-maxrate", "16M",
                    "-bufsize", "32M", "-g", "60", enc], check=True)
    for audio, name in (("mix", "veethreads-hand-embroidered-reel"),
                        ("mix_nomusic", "veethreads-hand-embroidered-reel-no-music")):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", enc, "-i", f"{OUT}/{audio}.wav", "-map", "0:v", "-map",
                        "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest",
                        "-movflags", "+faststart", f"{dest}/{name}.mp4"], check=True)
        print("wrote", f"{dest}/{name}.mp4")


if __name__ == "__main__":
    if sys.argv[1] == "stills":
        stills([float(x) for x in sys.argv[2:]])
    elif sys.argv[1] == "final":
        final(sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"))
    else:
        video()
