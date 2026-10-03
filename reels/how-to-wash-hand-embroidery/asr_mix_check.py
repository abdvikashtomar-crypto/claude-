"""Clarity check on the finished mix: transcribe each voiceover line out of
the final video's audio (music and effects included) and compare it with
the script. Usage: python3 asr_mix_check.py <parakeet dir> <video>"""
import json, re, subprocess, sys
import numpy as np
import sherpa_onnx

M, video = sys.argv[1], sys.argv[2]
rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{M}/encoder.int8.onnx", decoder=f"{M}/decoder.int8.onnx", joiner=f"{M}/joiner.int8.onnx",
    tokens=f"{M}/tokens.txt", model_type="nemo_transducer", num_threads=4)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, dtype=np.float32)
VO = json.loads(re.search(r'window.VO = (\[.*?\]);', open('timeline.js').read(), re.S).group(1))
norm = lambda s: re.sub(r"[^a-z' ]+", " ", s.lower().replace("’", "'").replace("colours", "colors").replace("wring", "ring")).split()

def wer(ref, hyp):
    d = np.arange(len(hyp) + 1)
    for i, r in enumerate(ref, 1):
        prev, d[0] = d.copy(), i
        for j, h in enumerate(hyp, 1):
            d[j] = min(prev[j] + 1, d[j - 1] + 1, prev[j - 1] + (r != h))
    return d[-1]

errs = total = 0
for c in VO:
    a, b = int((c['start'] - 0.15) * 16000), int((c['end'] + 0.15) * 16000)
    st = rec.create_stream(); st.accept_waveform(16000, audio[max(0, a):b]); rec.decode_stream(st)
    ref, hyp = norm(' '.join(w['w'] for w in c['words'])), norm(st.result.text)
    e = wer(ref, hyp); errs += e; total += len(ref)
    print(f"{'OK ' if e == 0 else 'XX '} {c['id']:3s} {st.result.text.strip()!r}" + ('' if e == 0 else f"   want {' '.join(ref)!r}"))
print(f"word error rate on the final mix: {errs}/{total} = {100 * errs / total:.1f}%")
