"""Synthesize the voiceover clause by clause with Kokoro (local, offline).

Each clause is rendered on its own so the timeline can place it on an exact
beat, and so caption timing is known per clause. Word timings inside a clause
are spread by phoneme count across the spoken span (see timeline.py).
"""
import json, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from phonemizer.backend.espeak.wrapper import EspeakWrapper
import espeakng_loader
from phonemizer import phonemize

MODEL_DIR = sys.argv[1]
VOICE, SPEED = "af_heart", 1.0

EspeakWrapper.set_library(espeakng_loader.get_library_path())
EspeakWrapper.set_data_path(espeakng_loader.get_data_path())

# id, spoken text (what the voice says), caption text (what the viewer reads)
CLAUSES = [
    ("h1",  "Hand embroidery takes hours.", None),
    ("h2",  "One wrong wash can ruin it.", None),
    ("h3",  "Here's how to wash it right.", "Here’s how to wash it right."),
    ("t1",  "First, test the colours.", None),
    ("t2",  "Dab a hidden stitch with a damp white cloth.", None),
    ("in",  "Turn it inside out.", None),
    ("c1",  "Use cold water.", None),
    ("c2",  "Hot water makes threads bleed and shrink.", None),
    ("d1",  "Add a few drops of mild detergent.", None),
    ("d2",  "No bleach.", None),
    ("g1",  "Swish gently.", None),
    ("g2",  "Never scrub. Never wring.", None),
    ("r1",  "Rinse in cool water till it runs clear.", None),
    ("tw",  "Roll it in a towel and press the water out.", None),
    ("f1",  "Dry it flat, in the shade.", None),
    ("f2",  "Sunlight fades thread.", None),
    ("ir",  "Iron on the reverse, over a towel, so the stitches stay raised.", None),
    ("a1",  "Caps and bags?", None),
    ("a2",  "Just spot clean with a damp cloth.", None),
    ("o1",  "Be gentle, and it will last for years.", None),
    ("o2",  "Save this for wash day.", None),
]

k = Kokoro(f"{MODEL_DIR}/kokoro-v1.0.onnx", f"{MODEL_DIR}/voices-v1.0.bin")
out = []
for cid, spoken, caption in CLAUSES:
    audio, sr = k.create(spoken, voice=VOICE, speed=SPEED, lang="en-us")
    audio = np.asarray(audio, dtype=np.float32)
    env = np.abs(audio)
    idx = np.where(env > 0.02 * env.max())[0]
    a, b = max(idx[0] - int(0.02 * sr), 0), min(idx[-1] + int(0.08 * sr), len(audio))
    audio = audio[a:b]
    sf.write(f"audio/vo_{cid}.wav", audio, sr)
    words = (caption or spoken).split()
    weights = []
    for w in spoken.split():
        ph = phonemize(w.strip(".,:?!"), language="en-us", backend="espeak", strip=True)
        weights.append(max(len(ph.replace(" ", "")), 1))
    assert len(words) == len(weights), cid
    out.append({"id": cid, "dur": len(audio) / sr, "words": words, "weights": weights})
    print(f"{cid:3s} {len(audio)/sr:5.2f}s  {spoken}")
json.dump(out, open("audio/vo_clauses.json", "w"), indent=1)
print(f"total speech {sum(c['dur'] for c in out):.2f}s")
