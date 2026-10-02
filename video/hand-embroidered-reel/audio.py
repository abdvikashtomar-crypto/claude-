"""Sound for the reel: Mansi's voice lines, synthesized cartoon SFX and an original ukulele-pop music bed.

  python audio.py   -> $WORK/out/mix.wav (voice + sfx + music) and mix_nomusic.wav (voice + sfx)
All SFX and music are generated here from oscillators and noise, so there is nothing to license.
"""
import functools, os, subprocess
import numpy as np
import scipy.signal as sg
import soundfile as sf
import scenes as S
from doodle import WORK, B

SR = 48000
OUT = f"{WORK}/out"
RNG = np.random.default_rng(3)


# ---------------------------------------------------------------- building blocks
def tt(dur):
    return np.arange(int(dur * SR)) / SR


def sweep(f0, f1, dur, curve="exp"):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur) if curve == "exp" else f0 + (f1 - f0) * t / dur
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def fm(fn, dur):
    """Sine whose frequency follows fn(t)."""
    t = tt(dur)
    return np.sin(2 * np.pi * np.cumsum(fn(t)) / SR)


def noise(dur):
    return RNG.normal(0, 1, int(dur * SR))


def filt(x, kind, f, order=2):
    sos = sg.butter(order, f, kind, fs=SR, output="sos")
    return sg.sosfilt(sos, x)


def decay(n, tau, attack=0.002):
    t = np.arange(n) / SR
    return np.exp(-t / tau) * np.clip(t / attack, 0, 1)


def norm(x, peak=1.0):
    return x / (np.abs(x).max() + 1e-9) * peak


def moving_band(x, centers, width=0.6):
    """Band-pass with a moving centre frequency (STFT mask); centers: array over time in Hz."""
    f, t, Z = sg.stft(x, SR, nperseg=1024)
    c = np.interp(t, np.linspace(0, t[-1], len(centers)), centers)
    mask = np.exp(-0.5 * (np.log2((f[:, None] + 20) / c[None, :]) / width) ** 2)
    _, y = sg.istft(Z * mask, SR, nperseg=1024)
    return y[:len(x)]


# ---------------------------------------------------------------- sound effects
def sfx_pop():
    x = sweep(260, 1150, 0.07) * decay(int(0.07 * SR), 0.03)
    return norm(x + 0.15 * filt(noise(0.07), "highpass", 2000) * decay(int(0.07 * SR), 0.004))


def sfx_tap():
    x = sweep(180, 480, 0.08) * decay(int(0.08 * SR), 0.035)
    return norm(x + 0.3 * filt(noise(0.08), "bandpass", [1500, 5000]) * decay(int(0.08 * SR), 0.006))


def sfx_boing():
    d = 0.65
    x = fm(lambda t: 210 * (1 + 0.38 * np.sin(2 * np.pi * 11 * t) * np.exp(-4.5 * t)) * (1 + 0.5 * t), d)
    x2 = fm(lambda t: 420 * (1 + 0.38 * np.sin(2 * np.pi * 11 * t) * np.exp(-4.5 * t)) * (1 + 0.5 * t), d)
    return norm((x + 0.35 * x2) * decay(len(x), 0.22, 0.004))


def sfx_whoosh():
    d = 0.42
    n = noise(d)
    c = np.concatenate([np.geomspace(350, 2600, 30), np.geomspace(2600, 700, 20)])
    y = moving_band(n, c, 0.7)
    e = np.sin(np.linspace(0, np.pi, len(y))) ** 2
    return norm(y * e)


def sfx_boom():
    d = 1.3
    t = tt(d)
    f = 34 + 60 * np.exp(-t / 0.18)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(len(t), 0.5, 0.004)
    x = np.tanh(2.5 * x)
    thump = filt(noise(d), "lowpass", 180) * decay(len(t), 0.05)
    return norm(filt(x + 0.6 * norm(thump), "lowpass", 1600))


def sfx_ding():
    d = 1.3
    t = tt(d)
    f0 = 1568
    x = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / tau)
            for r, a, tau in ((1, 1, 0.8), (2.0, 0.25, 0.4), (2.76, 0.35, 0.3), (5.4, 0.12, 0.12)))
    return norm(x * np.clip(t / 0.002, 0, 1))


def sfx_buzzer():
    d = 0.34
    t = tt(d)
    x = np.sign(np.sin(2 * np.pi * 118 * t)) + np.sign(np.sin(2 * np.pi * 125 * t))
    e = np.clip(t / 0.01, 0, 1) * np.clip((d - t) / 0.04, 0, 1)
    return norm(filt(x * e, "lowpass", 2200))


def sfx_scratch():
    d = 0.42
    t = tt(d)
    tri = np.abs(((t / 0.105) % 2) - 1)            # up/down hand movement
    f = 140 + 1300 * tri ** 1.5
    saw = sg.sawtooth(2 * np.pi * np.cumsum(f) / SR)
    nz = moving_band(noise(d), 600 + 2400 * tri[::200], 0.8)[:len(t)]
    e = np.clip(t / 0.005, 0, 1) * np.clip((d - t) / 0.03, 0, 1)
    return norm(filt(0.5 * saw + norm(nz), "bandpass", [200, 6000]) * e)


def sfx_trombone():
    notes = [(293.66, 0.27), (277.18, 0.27), (261.63, 0.27), (246.94, 0.95)]
    out = []
    for i, (f, d) in enumerate(notes):
        t = tt(d)
        vib = 1 + (0.018 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.2) / 0.2, 0, 1) if i == 3 else 0)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        cut = 450 + 1300 * np.sin(np.pi * np.clip(t / (0.22 if i < 3 else 0.5), 0, 1)) ** 2
        x = np.zeros_like(t)
        for n in range(1, 15):
            g = 1 / (1 + (n * f / cut) ** 4)
            x += g / n ** 0.6 * np.sin(n * ph)
        e = np.clip(t / 0.03, 0, 1) * np.clip((d - t) / 0.05, 0, 1)
        out.append(x * e)
    return norm(np.concatenate(out))


def sfx_tick():
    d = 0.05
    x = np.sin(2 * np.pi * 2300 * tt(d)) * decay(int(d * SR), 0.008)
    return norm(x + 0.4 * filt(noise(d), "highpass", 4000) * decay(int(d * SR), 0.002))


def sfx_sparkle():
    out = np.zeros(int(0.8 * SR))
    for i, f in enumerate([2093, 2349, 2637, 3136, 3520, 4186, 4699]):
        t = tt(0.4)
        p = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.12) * np.clip(t / 0.002, 0, 1)
        k = int(i * 0.035 * SR)
        out[k:k + len(p)] += p * (0.6 + 0.4 * (i % 2))
    return norm(out)


def sfx_squeak():
    out = np.zeros(int(0.32 * SR))
    for i in range(3):
        d = 0.07
        t = tt(d)
        s = fm(lambda u: 2900 + 500 * np.sin(2 * np.pi * 37 * u), d) * 0.5 + filt(noise(d), "bandpass", [2500, 6500])
        e = np.sin(np.pi * t / d) ** 2
        k = int(i * 0.1 * SR)
        out[k:k + len(t)] += s * e * (0.7 + 0.3 * i)
    return norm(out)


def sfx_stamp():
    d = 0.35
    t = tt(d)
    low = np.sin(2 * np.pi * np.cumsum(60 + 70 * np.exp(-t / 0.03)) / SR) * decay(len(t), 0.11)
    slap = filt(noise(d), "bandpass", [700, 4000]) * decay(len(t), 0.025)
    return norm(1.0 * low + 0.5 * norm(slap))


def sfx_paper():
    d = 0.16
    x = filt(noise(d), "bandpass", [900, 5000]) * decay(int(d * SR), 0.045, 0.008)
    return norm(x)


SFX = dict(pop=sfx_pop, tap=sfx_tap, boing=sfx_boing, whoosh=sfx_whoosh, boom=sfx_boom, ding=sfx_ding,
           buzzer=sfx_buzzer, scratch=sfx_scratch, trombone=sfx_trombone, tick=sfx_tick, sparkle=sfx_sparkle,
           squeak=sfx_squeak, stamp=sfx_stamp, paper=sfx_paper)


# ---------------------------------------------------------------- music: 110 bpm ukulele pop, I-V-vi-IV
BPM = 110
BEAT = 60 / BPM
BAR = 4 * BEAT
CHORDS = [[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [57, 60, 65, 69]]   # C G Am F
ROOTS = [36, 43, 45, 41]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


@functools.lru_cache(maxsize=None)
def pluck(m, d=0.9, bright=1.0):
    t = tt(d)
    f = hz(m)
    x = sum((1 / n ** 1.25) * np.sin(2 * np.pi * n * f * t * (1 + 0.0007 * n)) * np.exp(-t * (2.2 + 1.9 * n / bright))
            for n in range(1, 10))
    return x * np.clip(t / 0.003, 0, 1)


@functools.lru_cache(maxsize=None)
def mallet(m):
    t = tt(0.9)
    f = hz(m)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.45) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.08)) \
        * np.clip(t / 0.002, 0, 1)


@functools.lru_cache(maxsize=None)
def bassnote(m):
    t = tt(0.5)
    f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.1 * np.sin(6 * np.pi * f * t)
    return np.tanh(1.5 * x) * np.exp(-t / 0.22) * np.clip(t / 0.004, 0, 1)


def kick():
    t = tt(0.4)
    x = np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-t / 0.035)) / SR) * np.exp(-t / 0.16)
    return x + 0.2 * filt(noise(0.4), "highpass", 3000) * np.exp(-t / 0.003)


def clap():
    d = 0.25
    t = tt(d)
    n = filt(noise(d), "bandpass", [900, 3500])
    e = sum(np.exp(-np.clip(t - o, 0, None) / 0.007) * (t >= o) for o in (0, 0.011, 0.022)) * 0.6
    e += np.exp(-np.clip(t - 0.03, 0, None) / 0.07) * (t >= 0.03)
    return n * e


def hat(open_=False):
    d = 0.3 if open_ else 0.06
    return filt(noise(d), "highpass", 7000) * np.exp(-tt(d) / (0.09 if open_ else 0.018))


def add(buf, x, t, gain=1.0, pan=0.0):
    k = int(t * SR)
    if k >= len(buf) or k + len(x) <= 0:
        return
    x = x[: len(buf) - k]
    ang = (pan + 1) * np.pi / 4                      # equal-power pan, unity gain at centre
    buf[k:k + len(x), 0] += x * gain * np.cos(ang) * np.sqrt(2)
    buf[k:k + len(x), 1] += x * gain * np.sin(ang) * np.sqrt(2)


def music(total):
    stems = {k: np.zeros((int(total * SR) + SR, 2)) for k in ("drums", "bass", "uke", "bell")}
    K, C, H, OH = kick(), clap(), hat(), hat(True)
    motif = [[(0, 76), (0.5, 79), (1, 81), (1.5, 79), (2.5, 76), (3, 74)],
             [(0, 72), (1, 74), (1.5, 76), (2, 79), (3, 76)]]
    nbars = int(S.OUTRO / BAR) + 1
    for b in range(nbars):
        t0 = b * BAR
        ch = b % 4
        for beat in (0, 2):
            add(stems["drums"], K, t0 + beat * BEAT, 0.9)
        add(stems["drums"], K, t0 + 2.5 * BEAT, 0.5)
        for beat in (1, 3):
            add(stems["drums"], C, t0 + beat * BEAT, 0.45, 0.1)
        for e in range(8):
            add(stems["drums"], OH if e == 7 else H, t0 + e * BEAT / 2, 0.16 if e % 2 else 0.1, 0.35)
        for beat, m in ((0, 0), (1.5, 0), (2, 0), (3.5, 12)):
            add(stems["bass"], bassnote(ROOTS[ch] + m), t0 + beat * BEAT, 0.55)
        for beat, down, g in ((0, 1, 1.0), (1, 1, 0.8), (1.5, 0, 0.55), (2.5, 0, 0.6), (3, 1, 0.8), (3.5, 0, 0.55)):
            notes = CHORDS[ch] if down else CHORDS[ch][::-1]
            for i, m in enumerate(notes):
                add(stems["uke"], pluck(m), t0 + beat * BEAT + i * 0.012, 0.16 * g, -0.3)
        if b % 2 == 0 or b >= 2:
            for beat, m in motif[b % 2]:
                add(stems["bell"], mallet(m), t0 + beat * BEAT, 0.13, 0.35)
    # final ringing chord on the end card
    for i, m in enumerate(CHORDS[0] + [84]):
        add(stems["uke"], pluck(m, 2.5, 0.6), S.OUTRO + 0.05 + i * 0.02, 0.22, -0.2)
        add(stems["bell"], mallet(m + 12), S.OUTRO + 0.05 + i * 0.05, 0.08, 0.3)
    add(stems["drums"], K, S.OUTRO + 0.05, 0.9)
    # arrangement envelopes
    n = len(stems["drums"])
    tline = np.arange(n) / SR
    g_drums = np.ones(n)
    g_all = np.ones(n)
    g_drums[(tline >= S.OUTRO + 0.2)] = 0
    # pattern interrupt: everything muffled on the dark "we don't do" scene
    muffle = ((tline >= S.S2) & (tline < S.S3 - 0.1)).astype(float)
    muffle = np.convolve(muffle, np.ones(2400) / 2400, mode="same")
    # record scratch stops the music for the mistake gag
    stop = (tline >= S.AT["mistake"] - 0.2) & (tline < S.AT["tiny"] - 0.05)
    g_all[stop] = 0
    g_all = np.convolve(g_all, np.ones(480) / 480, mode="same")
    mix = stems["drums"] * g_drums[:, None] + stems["bass"] + stems["uke"] + stems["bell"]
    # small room: synthetic decaying-noise impulse response
    ir_t = tt(1.1)
    ir = RNG.normal(0, 1, (len(ir_t), 2)) * np.exp(-ir_t / 0.28)[:, None]
    wet = np.stack([sg.fftconvolve(mix[:, c], ir[:, c])[:n] for c in range(2)], 1)
    mix = mix + 0.06 * wet / (np.abs(wet).max() + 1e-9) * np.abs(mix).max()
    muff = np.stack([filt(mix[:, c], "lowpass", 500, 4) for c in range(2)], 1) * 1.6
    mix = mix * (1 - muffle[:, None]) + muff * muffle[:, None]
    fade = np.clip((S.END + 0.6 - tline) / 1.2, 0, 1)
    return mix * g_all[:, None] * fade[:, None]


# ---------------------------------------------------------------- voice
def voice_stem(total):
    raw = f"{OUT}/voice_raw.wav"
    buf = np.zeros(int(total * SR) + SR)
    for vid, at in S.AT.items():
        x, sr = sf.read(f"{B}/voice/{vid}.wav", dtype="float64")
        x = filt(x, "highpass", 75)
        n = int(0.02 * SR)
        r = np.sqrt(np.convolve(x ** 2, np.ones(n) / n, mode="same"))
        active = r > r.max() * 0.08
        x *= 10 ** (-18 / 20) / (np.sqrt(np.mean(x[active] ** 2)) + 1e-9)    # same loudness for every line
        k = int(at * SR)
        buf[k:k + len(x)] += x
    sf.write(raw, buf, SR, subtype="FLOAT")
    proc = f"{OUT}/voice_proc.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
                    "acompressor=threshold=-24dB:ratio=3:attack=5:release=90:makeup=3,"
                    "equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=220:t=q:w=1:g=-1.5,deesser=i=0.35",
                    "-c:a", "pcm_f32le", proc], check=True)
    y, _ = sf.read(proc, dtype="float64")
    y = y[:len(buf)]
    # ducking envelope from where the voice actually is
    n = int(0.03 * SR)
    r = np.sqrt(np.convolve(buf ** 2, np.ones(n) / n, mode="same"))
    act = (r > 10 ** (-38 / 20)).astype(float)
    att = np.convolve(act, np.ones(int(0.25 * SR)) / int(0.25 * SR), mode="same")
    duck = np.clip(att * 1.8, 0, 1)
    return y, duck


def main():
    os.makedirs(OUT, exist_ok=True)
    total = S.END + 0.2
    v, duck = voice_stem(total)
    n = int(total * SR)
    v, duck = v[:n], duck[:n]
    fx = np.zeros((n + SR * 2, 2))
    cache = {}
    for t0, name, gain in S.CUES:
        if name not in cache:
            cache[name] = SFX[name]()
        pan = float(np.sin(t0 * 7.3)) * 0.25
        add(fx, cache[name], t0, gain * 0.32, pan)
    fx = fx[:n]
    mu = music(total)[:n]
    mu = mu / (np.sqrt(np.mean(mu ** 2)) + 1e-9) * 10 ** (-16 / 20)
    mu *= (1 - 0.7 * duck)[:, None]
    voice = np.stack([v, v], 1)
    for name, parts in (("mix", (voice, fx, mu)), ("mix_nomusic", (voice, fx))):
        pre = sum(parts)
        sf.write(f"{OUT}/{name}_pre.wav", pre, SR, subtype="FLOAT")
        # two-pass loudness normalisation to Instagram's -14 LUFS
        a = subprocess.run(["ffmpeg", "-hide_banner", "-i", f"{OUT}/{name}_pre.wav", "-af",
                            "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
        import json, re
        m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", a, re.S).group(0))
        af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:"
              "linear=true")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{OUT}/{name}_pre.wav", "-af", af, "-ar", "48000",
                        "-c:a", "pcm_s16le", f"{OUT}/{name}.wav"], check=True)
        print(name, "input LUFS", m["input_i"])


if __name__ == "__main__":
    main()
