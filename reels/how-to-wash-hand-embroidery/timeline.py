"""Place the voiceover on the reel's timeline and time every word.

Scenes cut on a 120 BPM eighth-note grid (0.25 s) so the edit lands on the
music. Inside a scene, lines follow each other tightly. Word start times come
from speech recognition (audio/vo_words.json) and fall back to phoneme-count
estimates. Writes audio/vo.wav, timeline.js and the .srt captions.
"""
import json, math
import numpy as np, soundfile as sf

SR, GRID = 24000, 0.25
# scene id -> its voiceover clauses, in order
SCENES = [
    ("hook",   ["h1", "h2", "h3"]),
    ("test",   ["t1", "t2"]),
    ("inside", ["in"]),
    ("cold",   ["c1", "c2"]),
    ("soap",   ["d1", "d2"]),
    ("swish",  ["g1", "g2"]),
    ("rinse",  ["r1"]),
    ("towel",  ["tw"]),
    ("dry",    ["f1", "f2"]),
    ("iron",   ["ir"]),
    ("acc",    ["a1", "a2"]),
    ("recap",  ["o1"]),
    ("end",    ["o2"]),
]
LEAD, SAME, CUT_PAD, LEAD_IN, TAIL = 0.15, 0.13, 0.10, 0.08, 3.6
GAP_AFTER = {"h1": 0.18, "h2": 0.22}   # breathing room inside the hook

clauses = {c["id"]: c for c in json.load(open("audio/vo_clauses.json"))}
asr = json.load(open("audio/vo_words.json"))

t = LEAD
placed, cuts = {}, {}
for si, (scene, ids) in enumerate(SCENES):
    if si:
        cut = math.ceil((t + CUT_PAD) / GRID) * GRID          # next grid line after the last line ends
        cuts[scene] = cut
        t = cut + LEAD_IN
    else:
        cuts[scene] = 0.0
    for i, cid in enumerate(ids):
        placed[cid] = t
        t += clauses[cid]["dur"]
        if i < len(ids) - 1:
            t += GAP_AFTER.get(cid, SAME)
LENGTH = math.ceil((t + TAIL) / GRID) * GRID

track = np.zeros(int(LENGTH * SR), dtype=np.float32)
out = []
for scene, ids in SCENES:
    for cid in ids:
        c, t0 = clauses[cid], placed[cid]
        audio, sr = sf.read(f"audio/vo_{cid}.wav", dtype="float32")
        i0 = int(round(t0 * SR))
        track[i0:i0 + len(audio)] += audio
        n = len(c["words"])
        if asr.get(cid):
            starts = [min(s, c["dur"] - 0.05) for s in asr[cid]]
        else:
            w = np.array(c["weights"], float)
            starts = list((c["dur"] - 0.06) * np.concatenate([[0], np.cumsum(w)])[:-1] / w.sum())
        ends = starts[1:] + [c["dur"] - 0.04]
        out.append({"id": cid, "scene": scene, "start": round(t0, 3), "end": round(t0 + c["dur"], 3),
                    "words": [{"w": w, "s": round(t0 + s, 3), "e": round(t0 + e, 3)} for w, s, e in zip(c["words"], starts, ends)]})

sf.write("audio/vo.wav", track, SR)
open("timeline.js", "w").write("window.VO = " + json.dumps(out, indent=1) + ";\nwindow.CUTS = "
                                + json.dumps(cuts) + ";\nwindow.LENGTH = " + str(LENGTH) + ";\n")

def ts(x):
    ms = int(round(x * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
with open("how-to-wash-hand-embroidery.srt", "w") as f:
    for i, c in enumerate(out):
        nxt = out[i + 1]["start"] if i + 1 < len(out) else LENGTH
        f.write(f"{i + 1}\n{ts(c['start'])} --> {ts(min(c['end'] + 0.25, nxt - 0.02))}\n{' '.join(w['w'] for w in c['words'])}\n\n")

for scene, ids in SCENES:
    print(f"{scene:6s} cut {cuts[scene]:5.2f}  " + "  ".join(f"{cid}@{placed[cid]:.2f}-{placed[cid] + clauses[cid]['dur']:.2f}" for cid in ids))
print("LENGTH", LENGTH)
