#!/bin/sh
# Rebuild the reel from scratch.
#   KOKORO_DIR: kokoro-v1.0.onnx + voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx, release model-files-v1.0)
#   ASR_DIR:    sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8 (github.com/k2-fsa/sherpa-onnx, release asr-models)
# Needs: python3 with kokoro-onnx sherpa-onnx soundfile numpy scipy, node with playwright, ffmpeg.
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || ln -s ../../node_modules node_modules
python3 tts.py "${KOKORO_DIR:?set KOKORO_DIR}"        # voice, one clause at a time -> audio/
python3 asr_check.py "${ASR_DIR:?set ASR_DIR}"        # transcribe each line, word timings -> audio/vo_words.json
python3 timeline.py                                   # beat-grid timeline -> timeline.js, audio/vo.wav, .srt
SCALE=2 node render.mjs video                         # 2160x3840 frames -> build/x2/, build/x2/cues.json
cp build/x2/cues.json build/cues.json
python3 audio.py                                      # groove + effects + voice -> build/mix.wav
python3 mux.py build/x2 how-to-wash-hand-embroidery-4k.mp4
python3 asr_mix_check.py "$ASR_DIR" how-to-wash-hand-embroidery-4k.mp4
ffmpeg -loglevel error -y -ss 5.2 -i how-to-wash-hand-embroidery-4k.mp4 -frames:v 1 cover.png
