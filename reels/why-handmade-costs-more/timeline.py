"""Place each voiceover clause on the reel timeline and time every word.

Writes audio/vo.wav (the full voice track) and timeline.js (clause and word
times the animation reads). Word times inside a clause are spread by phoneme
count, with the clause's own pauses (found as silences) used as anchors.
"""
import json
import numpy as np, soundfile as sf

FPS, LENGTH, SR = 30, 36.0, 24000

# clause id -> start time (s). Scenes are cut around these beats.
STARTS = {
    "hook": 0.30, "print": 2.85,
    "hand1": 5.90, "hand2": 7.30,
    "c1": 9.10, "c2": 10.60, "c3": 12.75, "c3b": 14.10, "c4": 15.10,
    "years": 17.10,
    "mach": 20.30, "one": 22.35,
    "paid": 23.95,
    "not": 27.05, "time": 29.05,
}

clauses = json.load(open("audio/vo_clauses.json"))
track = np.zeros(int(LENGTH * SR), dtype=np.float32)
out = []
for c in clauses:
    audio, sr = sf.read(f"audio/vo_{c['id']}.wav", dtype="float32")
    assert sr == SR
    t0 = STARTS[c["id"]]
    i0 = int(t0 * SR)
    track[i0:i0 + len(audio)] += audio

    # silences inside the clause (>= 90 ms under 4% of peak, 20 ms frames)
    hop = int(0.02 * SR)
    env = np.array([np.abs(audio[i:i + hop]).max() for i in range(0, len(audio), hop)])
    quiet = env < 0.04 * env.max()
    gaps, run = [], 0
    for i, q in enumerate(quiet):
        if q:
            run += 1
        else:
            if run >= 5 and i - run > 2:
                gaps.append(((i - run) * 0.02, i * 0.02))
            run = 0

    words, weights = c["words"], c["weights"]
    # split points: words ending in , : . ? inside the clause
    breaks = [i for i, w in enumerate(words[:-1]) if w[-1] in ",:.?"]
    gaps = sorted(sorted(gaps, key=lambda g: g[1] - g[0], reverse=True)[:len(breaks)])
    segs, spans, prev, pt = [], [], 0, 0.0
    if len(gaps) == len(breaks):
        for b, g in zip(breaks, gaps):
            segs.append((prev, b + 1)); spans.append((pt, g[0])); prev, pt = b + 1, g[1]
    segs.append((prev, len(words))); spans.append((pt, c["dur"] - 0.06))
    if len(gaps) != len(breaks):
        segs, spans = [(0, len(words))], [(0.0, c["dur"] - 0.06)]

    times = []
    for (a, b), (s, e) in zip(segs, spans):
        w = np.array(weights[a:b], dtype=float)
        edges = s + (e - s) * np.concatenate([[0], np.cumsum(w)]) / w.sum()
        for k in range(b - a):
            times.append([round(t0 + edges[k], 3), round(t0 + edges[k + 1], 3)])
    out.append({"id": c["id"], "start": t0, "end": round(t0 + c["dur"], 3),
                "words": [{"w": w, "s": s, "e": e} for w, (s, e) in zip(words, times)]})
    print(f"{c['id']:6s} {t0:5.2f}-{t0 + c['dur']:5.2f} gaps={[(round(a,2),round(b,2)) for a,b in gaps]} "
          + " ".join(f"{w}@{s:.2f}" for w, (s, e) in zip(words, times)))

# overlap check
ends = sorted((STARTS[c["id"]], STARTS[c["id"]] + c["dur"], c["id"]) for c in clauses)
for (s1, e1, a), (s2, e2, b) in zip(ends, ends[1:]):
    assert e1 + 0.15 <= s2, f"{a} runs into {b}: {e1:.2f} > {s2:.2f}"
sf.write("audio/vo.wav", track, SR)
open("timeline.js", "w").write("window.VO = " + json.dumps(out, indent=1) + ";\n")

# Captions as a sidecar .srt (for platforms that take uploaded captions)
def ts(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"

groups, merge = [], {"hand2": "hand1", "c3b": "c3"}
for c in out:
    words = " ".join(w["w"] for w in c["words"])
    if c["id"] in merge:
        groups[-1] = (groups[-1][0], c["end"], groups[-1][2] + " " + words)
    else:
        groups.append((c["start"], c["end"], words))
with open("why-handmade-costs-more.srt", "w") as f:
    for i, (s, e, text) in enumerate(groups, 1):
        nxt = groups[i][0] if i < len(groups) else LENGTH
        f.write(f"{i}\n{ts(s)} --> {ts(min(e + 0.3, nxt - 0.02))}\n{text}\n\n")
