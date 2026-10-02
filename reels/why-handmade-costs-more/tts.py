"""Synthesize the voiceover clause by clause with Kokoro (local, offline).

Each clause is rendered on its own so the timeline can place it on an exact
beat, and so caption timing is known per clause. Word timings inside a clause
are spread by phoneme count across the spoken span.
"""
import json, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from phonemizer.backend.espeak.wrapper import EspeakWrapper
import espeakng_loader
from phonemizer import phonemize

MODEL_DIR = sys.argv[1]
VOICE, SPEED = "af_heart", 0.9

EspeakWrapper.set_library(espeakng_loader.get_library_path())
EspeakWrapper.set_data_path(espeakng_loader.get_data_path())

# id, spoken text (what the voice says), caption text (what the viewer reads)
CLAUSES = [
    ("hook",   "Ever wondered why handmade costs more?", None),
    ("print",  "A machine prints a T-shirt in eight seconds.", "A machine prints a T-shirt in 8 seconds."),
    ("hand1",  "This one is stitched,", None),
    ("hand2",  "by hand.", None),
    ("c1",     "Printed: seconds.", None),
    ("c2",     "Machine embroidered: minutes.", None),
    ("c3",     "Hand embroidered,", None),
    ("c3b",    "hours.", None),
    ("c4",     "One stitch, then the next.", None),
    ("years",  "By someone with twenty-five years in her fingers.", "By someone with 25 years in her fingers."),
    ("mach",   "A machine runs eight at once.", "A machine runs 8 at once."),
    ("one",    "She makes one.", None),
    ("paid",   "And she is paid fairly, for every hour.", None),
    ("not",    "You're not paying for a T-shirt.", "You’re not paying for a T-shirt."),
    ("time",   "You're paying for her time.", "You’re paying for her time."),
]

k = Kokoro(f"{MODEL_DIR}/kokoro-v1.0.onnx", f"{MODEL_DIR}/voices-v1.0.bin")
out = []
for cid, spoken, caption in CLAUSES:
    audio, sr = k.create(spoken, voice=VOICE, speed=SPEED, lang="en-us")
    audio = np.asarray(audio, dtype=np.float32)
    # trim to the voiced span with a small tail so consonants are not clipped
    env = np.abs(audio)
    thr = 0.02 * env.max()
    idx = np.where(env > thr)[0]
    a, b = max(idx[0] - int(0.02 * sr), 0), min(idx[-1] + int(0.08 * sr), len(audio))
    audio = audio[a:b]
    sf.write(f"audio/vo_{cid}.wav", audio, sr)
    words = (caption or spoken).split()
    spoken_words = spoken.split()
    weights = []
    for w in spoken_words:
        ph = phonemize(w.strip(".,:?"), language="en-us", backend="espeak", strip=True)
        weights.append(max(len(ph.replace(" ", "")), 1))
    out.append({"id": cid, "dur": len(audio) / sr, "words": words, "weights": weights})
    print(f"{cid:6s} {len(audio)/sr:5.2f}s  {spoken}")
json.dump(out, open("audio/vo_clauses.json", "w"), indent=1)
