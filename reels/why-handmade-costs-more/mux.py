"""Join the rendered video segments and the mix into the final reel.

Audio is loudness-normalised in two passes to -14 LUFS / -1.5 dBTP, the
level Instagram and TikTok play reels at, so the platform does not turn it
down or squash it.
"""
import json, re, subprocess

TARGET = 'I=-14:TP=-1.5:LRA=11'
OUT = 'why-handmade-costs-more.mp4'

probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', 'build/mix.wav', '-af', f'loudnorm={TARGET}:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', probe, re.S).group(0))
norm = (f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
        f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'build/segments.txt', '-i', 'build/mix.wav',
                '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', norm + ',aresample=48000', '-c:a', 'aac', '-b:a', '256k',
                '-movflags', '+faststart', '-shortest', OUT], check=True)
print('wrote', OUT, 'from input', m['input_i'], 'LUFS')
