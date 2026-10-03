"""Check the voiceover with speech recognition before anything is rendered.

Transcribes every clause with Parakeet (sherpa-onnx, offline), compares it
with the script, and writes per-word start times (audio/vo_words.json) that
the captions use instead of estimates.
"""
import json, re, sys
import numpy as np, soundfile as sf
from scipy import signal
import sherpa_onnx

M = sys.argv[1]
rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{M}/encoder.int8.onnx", decoder=f"{M}/decoder.int8.onnx", joiner=f"{M}/joiner.int8.onnx",
    tokens=f"{M}/tokens.txt", model_type="nemo_transducer", num_threads=4)

def norm(s):
    s = s.lower().replace("’", "'").replace("colours", "colors").replace("colour", "color")
    return re.sub(r"[^a-z' ]+", " ", s).split()

clauses = json.load(open("audio/vo_clauses.json"))
words_out, bad = {}, 0
for c in clauses:
    audio, sr = sf.read(f"audio/vo_{c['id']}.wav", dtype="float32")
    pad = np.zeros(int(0.3 * sr), dtype=np.float32)          # context either side
    x = signal.resample_poly(np.concatenate([pad, audio, pad]), 2, 3).astype(np.float32)
    st = rec.create_stream()
    st.accept_waveform(16000, x)
    rec.decode_stream(st)
    r = st.result
    heard = norm(r.text)
    want = norm(" ".join(c["words"]).replace("Here’s", "Here's"))
    ok = heard == want
    bad += not ok
    # word starts: a token beginning with a space opens a new word
    starts, cur = [], None
    for tok, ts in zip(r.tokens, r.timestamps):
        if tok.startswith(" ") or cur is None:
            starts.append(max(0.0, ts - 0.3))
            cur = tok
    words_out[c["id"]] = starts if len(starts) == len(c["words"]) else None
    print(f"{'OK ' if ok else 'XX '} {c['id']:3s} heard: {r.text.strip()!r}" + ("" if ok else f"   want: {' '.join(want)!r}")
          + ("" if words_out[c['id']] else f"   [word count {len(starts)} != {len(c['words'])}, timing falls back to estimate]"))
json.dump(words_out, open("audio/vo_words.json", "w"), indent=1)
print(f"{len(clauses) - bad}/{len(clauses)} clauses transcribed exactly")
