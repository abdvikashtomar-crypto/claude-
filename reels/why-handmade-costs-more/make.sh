#!/bin/sh
# Rebuild the reel from scratch.
#   KOKORO_DIR must hold kokoro-v1.0.onnx and voices-v1.0.bin
#   (github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0).
# Needs: python3 with kokoro-onnx soundfile numpy scipy, node with playwright, ffmpeg.
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || ln -s ../../node_modules node_modules
python3 tts.py "${KOKORO_DIR:?set KOKORO_DIR}"   # voice clauses  -> audio/
python3 timeline.py                             # timing         -> audio/vo.wav, timeline.js, .srt
node render.mjs video                           # 1080 frames    -> build/seg*.mp4, build/cues.json
python3 audio.py                                # score + sfx    -> build/mix.wav
python3 mux.py                                  # final          -> why-handmade-costs-more.mp4
ffmpeg -loglevel error -y -ss 30.8 -i why-handmade-costs-more.mp4 -frames:v 1 cover.png
