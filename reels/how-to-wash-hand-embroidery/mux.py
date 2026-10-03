"""Join the rendered video segments and the mix into the final reel.

Audio is loudness-normalised in two passes to -14 LUFS / -1.5 dBTP, the
level Instagram and TikTok play reels at, so the platform does not turn it
down or squash it.
"""
import json, re, subprocess, sys

TARGET = 'I=-14:TP=-1.5:LRA=11'
# usage: python3 mux.py [segment dir] [output file]
SEGS = (sys.argv[1] if len(sys.argv) > 1 else 'build') + '/segments.txt'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'how-to-wash-hand-embroidery.mp4'

probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', 'build/mix.wav', '-af', f'loudnorm={TARGET}:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', probe, re.S).group(0))
norm = (f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
        f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', SEGS, '-i', 'build/mix.wav',
                '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', norm + ',aresample=48000', '-c:a', 'aac', '-b:a', '256k',
                '-movflags', '+faststart', '-shortest', OUT], check=True)
print('wrote', OUT, 'from input', m['input_i'], 'LUFS')
