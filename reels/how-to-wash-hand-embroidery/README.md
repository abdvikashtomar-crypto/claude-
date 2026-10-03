# How to Wash Hand Embroidery — 43.5 s Reel

A fast-cut 9:16 motion-graphics reel for Vee Threads. It explains how to wash hand-embroidered clothes and accessories in nine steps plus a bonus tip for caps and bags. It uses the same brand system as `why-handmade-costs-more` (cream, ink, thread green, marigold; Montserrat and Playfair Display) and adds one muted teal for water.

| | |
|---|---|
| **Files** | `how-to-wash-hand-embroidery-4k.mp4`: 2160×3840 master · `how-to-wash-hand-embroidery-1080.mp4`: 1080×1920 for posting. Both 30 fps, H.264 + AAC 48 kHz stereo, 43.5 s |
| **Loudness** | −14 LUFS integrated, under −1.5 dBTP |
| **Captions** | Burned in, word by word. Also in `how-to-wash-hand-embroidery.srt` for upload |
| **Cover** | `cover.png` (the title card) |
| **Safe zones** | Nothing sits in the top 14%. Graphics stay above the bottom 35%. Captions sit at the top of that band (y≈1270–1400 at 1080 wide), clear of the Reels buttons |

## Script (fact-checked against published care guides)

| Time | Shot | Voiceover |
|---|---|---|
| 0:00 | A flower stitches itself as a clock spins. **HOURS.** | *Hand embroidery takes hours.* |
| 0:02 | A washing machine spins faster, then bursts. **RUINED.** | *One wrong wash can ruin it.* |
| 0:03 | Rewind: the petals fly back. Iris to the title | *Here's how to wash it right.* |
| 0:05 | **1 · Test the colours.** A damp white cloth dabs a hidden stitch; it comes away clean | *First, test the colours. Dab a hidden stitch with a damp white cloth.* |
| 0:09 | **2 · Inside out.** The tee spins over, showing the back of the stitches | *Turn it inside out.* |
| 0:11 | **3 · Cold water.** Ice drops in and the thermometer falls under 30 °C. Hot vs cold: dye bleeds, the tee shrinks ⃠ | *Use cold water. Hot water makes threads bleed and shrink.* |
| 0:14 | **4 · Mild detergent.** Three drops (counted), foam; bleach slammed with ⃠ | *Add a few drops of mild detergent. No bleach.* |
| 0:17 | **5 · Swish gently.** Water sloshes; then **NEVER**: scrub ⃠, wring ⃠ | *Swish gently. Never scrub. Never wring.* |
| 0:20 | **6 · Rinse till clear.** The soapy water drains through a vortex, the tap refills it clear | *Rinse in cool water till it runs clear.* |
| 0:23 | **7 · Roll & press.** The towel rolls up, arrows press, water squirts out | *Roll it in a towel and press the water out.* |
| 0:25 | **8 · Dry flat in shade.** The tee lands on a rack and a shade slides over; then direct sun fades a flower ⃠ | *Dry it flat, in the shade. Sunlight fades thread.* |
| 0:28 | **9 · Iron on the reverse.** A cross-section: iron, back of fabric, stitches face down, soft towel | *Iron on the reverse, over a towel, so the stitches stay raised.* |
| 0:32 | **Bonus · Caps & bags.** A damp cloth dabs stains away. Text: don't soak them | *Caps and bags? Just spot clean with a damp cloth.* |
| 0:35 | Recap: nine ticked tiles | *Be gentle, and it will last for years.* |
| 0:38 | Save icon, then the Vee Threads end card | *Save this for wash day.* |

On-screen details add what the voice has no time for: *under 30 °C*, *pH neutral*, *no softener*, *soak a few minutes*, *until no suds are left*, *never twist it*, *low to medium heat*, *don't soak caps and bags*.

## Checks run before the final render

- **Voice clarity.** Every voiceover line was transcribed back with a speech-recognition model (Parakeet TDT 0.6B v2, run locally). It was transcribed again from the finished mix, music and effects included, and came back with **0 errors in 120 words**. "Wring" is heard as its sound-alike "ring" and counted as correct. One line that came back unclear ("Treat it gently" heard as "treated gently") was rewritten.
- **Caption sync.** Word timings come from the same recognizer, so captions pop on the spoken word.
- **Frames.** Every half second was reviewed, plus six frames around each of the 17 cuts. Fixes from that pass: zoom cuts rebuilt as fly-throughs (they showed black edges), payoffs (✓ and ⃠) moved earlier so they land before each cut, overlaps cleared, the towel roll centred, and the iron diagram lifted.
- **Mix.** The music sits 14 dB under the voice while it speaks and the effects 11 dB under; effect peaks are capped below the voice.

## How it's built

- `tts.py` creates the voice with Kokoro (`af_heart`, offline). `asr_check.py` transcribes each line and records word timings.
- `timeline.py` places lines and cuts the scenes on a 120 BPM eighth-note grid (0.25 s), so cuts land on the beat. It writes `timeline.js`, `audio/vo.wav` and the `.srt`.
- `engine.js` holds the frame-exact timeline, a seeded stateless particle system (bubbles, splashes, steam, dye, petals, sparks, speed lines), camera shake, seven transition types, step chips and captions. `icons.js` holds the illustrations. `scenes.js` holds the 18 shots.
- `render.mjs` renders in headless Chromium (`SCALE=2` for 4K). `audio.py` synthesizes the groove (tape-stop and rewind in the hook) and about 40 kinds of sound effect on the exported cues, then mixes them. `mux.py` normalises loudness. `asr_mix_check.py` re-checks clarity on the final file.

To rebuild, run `KOKORO_DIR=… ASR_DIR=… ./make.sh`.
