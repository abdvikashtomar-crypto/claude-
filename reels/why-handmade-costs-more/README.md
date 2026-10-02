# Why Handmade Costs More — 36 s Reel

A 9:16 motion-graphics reel for Vee Threads that explains why hand-embroidered clothing costs more. The tone is warm and educational. It follows the eight style frames in `vee-threads-style-frames.zip` and adds a voiceover, animated captions, a score and sound design.

| | |
|---|---|
| **File** | `why-handmade-costs-more.mp4` |
| **Format** | 1080×1920, 30 fps, H.264 + AAC 48 kHz stereo, 36.0 s |
| **Loudness** | −14 LUFS integrated, −1.5 dBTP (the level Instagram and TikTok play at) |
| **Captions** | Burned in and animated. Also in `why-handmade-costs-more.srt` for upload |
| **Cover** | `cover.png` ("You're paying for her time.") |
| **Safe zones** | Nothing sits in the top 14%. Headlines stay above the bottom 35%, as in the style frames. Captions sit at the top edge of that band (y≈1270–1400) and inside x 120–960, clear of the Reels buttons and caption text. |

## Script and beats

| Time | Scene | Voiceover |
|---|---|---|
| 0:00 | Dark. A conveyor of printed tees | *Ever wondered why handmade costs more?* |
| 0:03 | Counter rolls 1→8 and lands on **8 SECONDS** | *A machine prints a T-shirt in eight seconds.* |
| 0:05 | Cream wipes up with a stitched hem. A tee draws on and a marigold flower is stitched petal by petal | *This one is stitched, by hand.* |
| 0:09 | Same T-shirt, three clocks: the seconds bar snaps full, the minutes bar machine-fills, *hours.* never gets a tick | *Printed: seconds. Machine embroidered: minutes. Hand embroidered, hours. One stitch, then the next.* |
| 0:17 | Hoop blooms. 25 ticks count the years | *By someone with twenty-five years in her fingers.* |
| 0:20 | An ink panel drops in: 8 grey hoops fill in lockstep. Below, one hoop fills slowly | *A machine runs eight at once. She makes one.* |
| 0:24 | PAID FAIRLY. Six ₹ coins strung on green thread, one per hour | *And she is paid fairly, for every hour.* |
| 0:26 | Thread green blooms out of the needle | *You're not paying for a T-shirt. You're paying for her time.* |
| 0:31 | The green folds into one thread, which becomes the dashed line. Knot, snip, then the end card | *(no voice, as in the storyboard: thread pull, knot, snip)* |

The **"still stitching"** line runs from 0:05 to 0:31 and is the reel's progress bar. The needle adds a dash at each beat, and the line completes on "her time".

**Captions** reveal word by word in time with the voice. Machine and number words get a marigold highlighter. Handmade words turn thread green and get a stitched underline. Twice the big type already spells out the spoken line: the opening question and "You're paying for her time". There the caption steps aside so the words are not doubled.

## How it's built

Every part is generated locally. There is no stock footage, stock music or paid API, so nothing in it needs a licence.

- `tts.py` creates the voiceover clause by clause with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (voice `af_heart`, 0.9× speed). Kokoro runs offline under Apache-2.0.
- `timeline.py` places each clause on its beat. It times each word from phoneme counts, anchored on the pauses found in each clause. It writes `audio/vo.wav`, `timeline.js` and the `.srt`.
- `reel.html` + `reel.js` hold the animation (GSAP + SVG + brand fonts). `window.seek(t)` sets every frame from the time value alone, so renders are frame-exact and repeatable. Sound cues are exported from the same timeline.
- `render.mjs` uses headless Chromium (Playwright) to render 1080 frames with 4 workers and pipe them to ffmpeg.
- `audio.py` writes a piano-and-pad score in D major (a B-minor drone under the machine opening). It adds sound design on the exported cues: conveyor clacks, counter ticks, stitch pulls, machine hum, clock ticks for the years, pentatonic coin chimes, then thread pull, knot and snip. The music ducks under the voice.
- `mux.py` joins the video and audio and runs a two-pass loudness normalisation.

To rebuild, run `KOKORO_DIR=/path/to/kokoro-models ./make.sh`. To preview frames, run `node render.mjs stills 4.9,19.6,30.8`; the PNGs land in `build/`.

Fonts are Montserrat and Playfair Display, both under the SIL Open Font License (see `assets/fonts/`).
