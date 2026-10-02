# Hand Embroidered T-Shirts: doodle reel (9:16)

A 55-second Instagram Reel for the [Hand Embroidered T-Shirts](https://veethreads.com/collections/hand-embroidered-t-shirts) collection. It uses doodle and motion-graphics styling, and Mansi Chaudhary's own voice throughout.

**Final files** (in `out/`):

| File | Use it for |
|---|---|
| `veethreads-hand-embroidered-reel.mp4` | Upload this. 1080×1920, 30 fps, H.264/AAC, −14 LUFS. Voice + SFX + music. |
| `veethreads-hand-embroidered-reel-no-music.mp4` | Same edit with voice + SFX only, so you can add a trending sound in Instagram (keep it at ~10–15 % volume). |

## Script / beat sheet

Every spoken line is Mansi, cut from her three recent reels. Nothing is AI-voiced. Her voice was separated from the old background music, so each line sits cleanly on the new edit, and the footage stays lip-synced.

| Time | Scene | On screen (doodles + text) | Mansi says | SFX |
|---|---|---|---|---|
| 0.0 | **Hook** | Yellow paper. Her cut-out sticker pops up. Headline builds: "ONLY A FEW BRANDS MAKE PURE HANDMADE CLOTHES WITH WESTERN VIBES". Red stamp: "& WE'RE ONE OF THEM". Crown lands on her head; name tag + arrow. | "Hi, I'm Mansi Chaudhary, the founder of Vee Threads." | whoosh, boing, pops, marker squeak, ding, boom, stamp |
| 3.4 | **Pattern interrupt** | Dark chalkboard. "WE DON'T DO:" 🤖 machine embroidery ❌, 🖨️ prints ❌, 🩹 iron-on patches ❌. Then "JUST 2 HANDS + 1 NEEDLE". | (music muffled) | buzzers, ding |
| 6.5 | **Made by hand, in our village** | "EVERY TEE IS STITCHED BY HAND". Pin drops: Bulandshahr, U.P. Sticky note: "#1 BEST-SELLER IS AT THE END 👀" (open loop). Hearts burst on "you". | "At Vee Threads, every t-shirt and sweatshirt we make… made just for you." | paper, sparkle |
| 11.2 | **Founder's design diary** | "MISTAKE?!" stamp slams onto a freeze-frame. Then a magnifier circles "TOO TINY!", the counter pops "1000s!!", and the fix lands: "THICKER THREAD". | "I made a huge mistake." / "French knots were too small," / "thousands of French knots." / "So, with the final sample, I decided to use thicker strands" | record scratch, boom, sad trombone, ticks, ding |
| 21.9 | **A whole week** | "THIS ONE TOOK…": a calendar crossed off Mon→Sun, then "A WHOLE WEEK!" over the painted close-up. | "This week-long process" | ticks, stamp |
| 23.8 | **Mix of stitches** | "A MIX OF STITCHES = PURE MAGIC". Tags pop as she speaks: French knots, lazy daisy, kantha, running stitch. Clouds drift in on "cloudy day". | "By using a mix of embroidery stitches, I am capable of capturing the movement and atmosphere of a cloudy day." | pops, whoosh |
| 30.8 | **Reveal** | "THE FINAL PIECE" + sparkles, tag "hand-embroidered + hand-painted". | (music) | sparkle, ding |
| 32.5 | **100+ designs** | "100+ DESIGNS. ALL HAND-STITCHED 🤯", then 7 design cards with funny captions: Eagle ("main character energy"), Lazy Jungle Tales ("me on a monday"), Bumblebee ("bee-autiful (sorry)"), Octopus ("8 arms. 0 machines."), Apple ("yes, the worm is on purpose"), Meadow Herd ("a cow in sunflowers. iconic."), Match Day. | (music) | boom, whoosh + pop per card |
| 39.1 | **Custom name: the payoff** | "WAIT… YOUR NAME ON A TEE?!" + "#1 BEST-SELLER" badge (closes the open loop). Perry's name being stitched on the hoop. A mini doodle tee writes "your name". | "Her name is Perry and she asked me to customize her name" / "I still get so excited when someone personalizes something because it's not just clothing, it's theirs." | boom, sparkle, pop, squeak |
| 49.1 | **CTA** | Her sticker again. "THIS IS YOUR SIGN" → pink "GO CUSTOMIZE NOW" button → "LINK IN BIO". | "It's your sign. Go customize now. Link is in bio." | boing, ding, tap, pop |
| 52.8 | **End card** | veethreads.com · @vee.threads · "from our village to your hearts" · "handmade in India – ships worldwide" | (final chord) | whoosh, sparkle |

The facts on screen come from the store and the Instagram bio:
- Artisans in Bulandshahr, UP, and "no machine embroidery, iron-on patch or print": the collection description.
- 106 products, shown as "100+": the collection.
- The best-seller badge: custom-name tees top the collection's best-selling sort.
- "From our village to your hearts": the Instagram bio.

## Suggested Instagram caption

> Only a few brands still make clothes 100% by hand… and we're one of them 🧵✋
>
> Every tee is stitched one at a time by our artisans in Bulandshahr, U.P. No machines, no prints, no iron-on patches. Just hands, a needle and a lot of patience. Some pieces take a whole week 😮‍💨
>
> 100+ designs, or put YOUR name on one ✍️ Link in bio → veethreads.com
>
> #handembroidery #handembroidered #embroideredtshirt #slowfashion #handmadeinindia #madeinindia #customtshirt #nameembroidery #oversizedtshirt #indianartisans #vocalforlocal #embroideryart #veethreads

For the cover, pick a frame around 2.6 s, where the full hook headline and Mansi are both on screen.

## Rebuilding

The pipeline is plain Python: Cairo for drawing, PIL for text, OpenCV for footage clean-up, numpy/scipy for audio, ffmpeg for encoding.

```sh
pip install pillow numpy scipy soundfile opencv-python-headless cairocffi cairosvg
export WORK=/path/to/workdir   # holds src/, sep/, assets/, build/, out/
python prep.py                 # voice lines, footage frames, stickers, founder cut-out
python audio.py                # SFX + music + voice -> out/mix.wav, out/mix_nomusic.wav
python render.py stills 2.6 13 # quick layout checks
python render.py video         # $WORK/out/video.mp4 (silent master)
python render.py final         # ./out/*.mp4, upload-ready, with and without music
```

`$WORK` needs these inputs:
- `src/v1.mp4 v2.mp4 v3.mp4`: the founder reels.
- `src/mansi.jpg`: her photo.
- `src/words.json`: word timestamps from Parakeet TDT 0.6B v2, via sherpa-onnx.
- `sep/v*_voc.wav`: her voice isolated with UVR-MDX-NET-Voc_FT, via `audio-separator`.
- `assets/cut/mansi_birefnet-portrait.png`: her cut-out (rembg, BiRefNet portrait).
- `assets/fonts/`: the Google Fonts listed below.
- `assets/npm/package/icons.json`: `@iconify-json/fluent-emoji-flat`.

**Swapping in real product photos.** The design cards currently use doodle tees with illustrations of each design. To use real shots instead, drop photos into `$WORK/build/products/` named after the card slugs in `scenes.py` (`eagle.jpg`, `lazy-jungle.jpg`, `bumblebee.jpg`, `octopus.jpg`, `apple.jpg`, `meadow-herd.jpg`, `match-day.jpg`), then re-run `render.py video`. Each card then shows the photo in a doodle polaroid.

**Changing the edit.** Voice lines and cut points live in `prep.py` (`VOICE`, `OVERRIDE`). Timing, text and doodles live in `scenes.py`. Sounds live in `audio.py`.

## Credits and licences

- **Voice and footage:** Mansi Chaudhary / Vee Threads.
- **Fonts:** Luckiest Guy and Permanent Marker (Apache 2.0); Gochi Hand, Caveat Brush and Patrick Hand (SIL OFL).
- **Illustrations:** Microsoft Fluent Emoji, flat style (MIT).
- **Music and sound effects:** synthesized from scratch in `audio.py`. No samples, nothing to license, safe from copyright claims.
