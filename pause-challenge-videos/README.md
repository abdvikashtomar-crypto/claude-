# "Only 1% can pause at the right time" — 4K vertical videos

Four takes on the viral pause-challenge format. In each one a target sits still while
something rushes past it, and it lines up perfectly on **exactly one frame per loop**.
Every video is a seamless loop (3 loops per file).

All files are 2160×3840 (4K UHD, 9:16), 30 fps, H.264 High@5.1, BT.709, with AAC 48 kHz
stereo audio normalised to about −14 LUFS. They're ready to upload to Reels, TikTok or Shorts.

| File | Approach | Perfect frames (time) |
|---|---|---|
| `output/01_silhouette_runner.mp4` | A runner sprints through a sunset park past a hand-drawn red outline (closest to the original) | 1.73 s · 4.40 s · 7.07 s |
| `output/02_puzzle_piece.mp4` | A jigsaw piece spins and zooms around a synthwave puzzle. It fits its hole once per loop, and half a loop later it lands in the hole upside-down as a fake-out | 1.53 s · 4.20 s · 6.87 s |
| `output/03_stop_the_needle.mp4` | A neon dial with a thin green zone. The needle crawls past it on a slow pass and just misses on both sides, then whips through and lands dead-centre | 2.10 s · 4.77 s · 7.43 s |
| `output/04_drift_parking.mp4` | Top-down parking lot. A sports car drifts through the lot (tyre smoke, skid marks) and passes through a car-shaped red outline in an empty stall | 1.40 s · 4.60 s · 7.80 s |

The frame on either side of each perfect frame is visibly off, so the challenge is real.
You can pin the answer time in the comments.

## Re-rendering / tweaking

Everything is drawn procedurally and the soundtrack is synthesized, so no stock footage or licensed music is used.

```bash
pip install numpy pycairo opencv-python-headless scipy
# Montserrat Black (OFL) must be installed, e.g. in ~/.fonts, then: fc-cache -f
python3 v1_silhouette_runner.py               # full 4K render -> output/
python3 v1_silhouette_runner.py preview 52    # quick PNG stills of chosen frames
```

Captions, colours, timing (`CYCLE`, `F_MATCH`, speeds) and the number of loops (`CYCLES`)
are constants at the top of each script. `common.py` holds the caption style, the ffmpeg
encoder settings and the synthesized soundtrack.
