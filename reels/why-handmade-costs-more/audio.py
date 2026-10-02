"""Mix the reel's sound: voiceover, a synthesized piano/pad score, and sound
design placed on the cues the animation exported (build/cues.json).

Everything is generated here from scratch, so the mix carries no licensing.
Writes build/mix.wav (48 kHz stereo, pre-loudness-normalisation).
"""
import json
import numpy as np
import soundfile as sf
from scipy import signal

SR, LEN = 48000, 36.0
N = int(SR * LEN)
rng = np.random.default_rng(7)


def tt(dur):
    return np.arange(int(SR * dur)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(track, sig, t, gain=1.0, pan=0.0):
    """Add a mono or stereo signal at time t (seconds) with constant-power pan."""
    i = int(round(t * SR))
    if i >= N:
        return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    j = min(N, i + len(sig))
    a = max(0, -i)
    track[max(i, 0):j] += sig[a:j - i] * gain


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x)


def noise(dur):
    return rng.standard_normal(int(SR * dur))


def sweep_lp(x, f0, f1):
    """One-pole low-pass whose cutoff glides from f0 to f1 (Hz) over x."""
    fc = np.geomspace(f0, f1, len(x))
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for k in range(len(x)):
        acc = (1 - a[k]) * x[k] + a[k] * acc
        y[k] = acc
    return y


# ---------------------------------------------------------------- instruments
def piano(freq, dur, vel=1.0):
    t = tt(dur)
    out = np.zeros_like(t)
    for h in range(1, 10):
        fh = freq * h * np.sqrt(1 + 0.00035 * h * h)
        amp = (1 / h ** 1.7) * (1.0 if h < 4 else 0.7)
        dec = np.exp(-t * (0.7 + 0.5 * h) * (freq / 260) ** 0.3)
        out += amp * np.sin(2 * np.pi * fh * t + rng.uniform(0, 6.28)) * dec
    out *= np.minimum(1, t / 0.005)
    out += lp(noise(dur), 2500) * np.exp(-t / 0.004) * 0.05      # felt hammer
    out *= np.clip((dur - t) / 0.3, 0, 1)                         # damper
    return lp(out, 3200) * vel


def pad(freqs, dur, att=1.4, rel=1.6):
    t = tt(dur)
    out = np.zeros_like(t)
    for f in freqs:
        for det in (-0.0022, 0.0, 0.0024):
            for h in range(1, 7):
                out += np.sin(2 * np.pi * f * (1 + det) * h * t + rng.uniform(0, 6.28)) / h ** 1.3
    out *= (1 + 0.08 * np.sin(2 * np.pi * 0.23 * t))
    env = np.minimum(1, t / att) * np.clip((dur - t) / rel, 0, 1)
    return lp(out * env, 1100) / (len(freqs) * 3)


def bell(freq, dur=1.4):
    t = tt(dur)
    parts = [(1, 1.0, 1.3), (2.0, 0.45, 0.9), (2.76, 0.32, 0.6), (5.4, 0.12, 0.3)]
    out = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / d) for r, a, d in parts)
    return out * np.minimum(1, t / 0.002)


# ---------------------------------------------------------------- sound design
def sfx(kind, c):
    if kind == 'clack':
        t = tt(0.09)
        return bp(noise(0.09), 1500, 5000) * np.exp(-t / 0.006) * 0.8 + np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.03) * 0.5, 0.09
    if kind == 'tick':
        t = tt(0.05)
        f = 1900 + 70 * c.get('n', 1)
        return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.01) + hp(noise(0.05), 3000) * np.exp(-t / 0.002) * 0.4, 0.10
    if kind == 'slam':
        t = tt(0.9)
        f = 45 + 50 * np.exp(-t / 0.08)
        boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.28)
        return boom + lp(noise(0.9), 400) * np.exp(-t / 0.05) * 0.5, 0.40
    if kind == 'thud':
        t = tt(0.6)
        f = 50 + 35 * np.exp(-t / 0.06)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18), 0.18 if c.get('soft') else 0.28
    if kind == 'whoosh':
        d = 0.55
        t = tt(d)
        env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
        return hp(sweep_lp(noise(d), 300, 4000), 150) * env, 0.12 if c.get('soft') else 0.2
    if kind == 'stitch':
        d = 0.24
        t = tt(d)
        env = np.clip(t / 0.17, 0, 1) ** 2 * np.clip((d - t) / 0.03, 0, 1)
        pull = bp(noise(d), 2200, 6500) * env
        pluck = np.sin(2 * np.pi * 330 * t) * np.exp(-(t - 0.17).clip(0) / 0.04) * (t > 0.17)
        return pull * 0.7 + pluck * 0.35, 0.11
    if kind == 'zip':
        t = tt(0.32)
        am = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 70 * t))
        return bp(noise(0.32), 800, 5000) * am * np.exp(-t / 0.15), 0.12
    if kind == 'check':
        t = tt(0.07)
        f = 900 + 500 * t / 0.07
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.02), 0.16
    if kind == 'pop':
        t = tt(0.09)
        f = 520 + 400 * t / 0.09
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.03), 0.16
    if kind == 'clunk':
        t = tt(0.25)
        return np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.05) + bp(noise(0.25), 800, 3000) * np.exp(-t / 0.01) * 0.6, 0.28
    if kind == 'machine':
        d = c.get('dur', 1.0)
        t = tt(d)
        hum = sum(np.sin(2 * np.pi * 110 * h * t) / h for h in range(1, 6))
        needle = 0.5 + 0.5 * np.sin(2 * np.pi * 26 * t)
        chatter = bp(noise(d), 1500, 4500) * (needle ** 6)
        env = np.minimum(1, t / 0.12) * np.clip((d - t) / 0.15, 0, 1)
        return lp(hum * 0.35 * (0.7 + 0.3 * needle) + chatter * 0.6, 3000) * env, 0.08
    if kind == 'yeartick':
        t = tt(0.04)
        f = 3400 if c['i'] % 2 == 0 else 2900
        return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.005) + hp(noise(0.04), 4000) * np.exp(-t / 0.0015) * 0.5, 0.06
    if kind == 'coin':
        notes = [74, 76, 78, 81, 83, 86]                           # D major pentatonic, rising
        return bell(mtof(notes[c['i']])), 0.055
    if kind == 'bloom':
        d = 1.4
        t = tt(d)
        rise = np.clip(t / 0.9, 0, 1) ** 2.5 * np.clip((d - t) / 0.45, 0, 1)
        swell = hp(sweep_lp(noise(d), 200, 6000), 200) * rise
        f = 48 + 30 * np.exp(-(t - 0.6).clip(0) / 0.08)
        hit = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-(t - 0.6).clip(0) / 0.35) * (t > 0.6)
        return swell * 0.35 + hit * 0.8, 0.2
    if kind == 'threadpull':
        d = 0.8
        t = tt(d)
        env = np.clip(t / 0.5, 0, 1) ** 1.5 * np.clip((d - t) / 0.08, 0, 1)
        fr = bp(noise(d), 1800, 7000) * env
        return fr * (0.75 + 0.25 * np.sin(2 * np.pi * 37 * t)), 0.22
    if kind == 'knot':
        t = tt(0.3)
        return np.sin(2 * np.pi * 160 * t) * np.exp(-t / 0.06) + bp(noise(0.3), 500, 2000) * np.exp(-t / 0.015) * 0.5, 0.3
    if kind == 'snip':
        def blade(f1, f2):
            t = tt(0.06)
            return hp(noise(0.06), 3500) * np.exp(-t / 0.002) * 0.8 + (np.sin(2 * np.pi * f1 * t) + 0.6 * np.sin(2 * np.pi * f2 * t)) * np.exp(-t / 0.012) * 0.5
        out = np.zeros(int(SR * 0.12))
        a = blade(3800, 5200)
        out[:len(a)] += a
        b = blade(4300, 6100)
        k = int(0.045 * SR)
        out[k:k + len(b)] += b[:len(out) - k]
        return out, 0.3
    raise ValueError(kind)


# ---------------------------------------------------------------- score
def score():
    mus = np.zeros((N, 2))
    # S1: the machine. A low, uneasy B-minor drone under the conveyor.
    drone = pad([mtof(35), mtof(42), mtof(50)], 5.9, att=1.2, rel=0.8)
    place(mus, drone, 0.0, 0.55)

    # S2 onward: the hand. Piano in D major, one chord per 3.2 s bar.
    BAR, T0 = 3.2, 5.55
    chords = [  # bass, chord tones (midi)
        (38, [50, 54, 57]),   # D
        (37, [49, 52, 57]),   # A/C#
        (35, [47, 50, 54]),   # Bm
        (31, [43, 47, 50]),   # G
        (42, [50, 54, 57]),   # D/F#
        (31, [43, 47, 50]),   # G
        (40, [47, 50, 55]),   # Em7
        (33, [45, 50, 52]),   # Asus4 (resolves below)
    ]
    for k, (bass, tones) in enumerate(chords):
        t0 = T0 + k * BAR
        full = k >= 3                       # quarter notes first, eighths from S4
        pattern = [bass, tones[1], tones[0] + 12, tones[2], tones[1] + 12, tones[2], tones[0] + 12, tones[1]]
        if k == 7:
            pattern = [bass, 52, 57, 62, 61, 57, 64, 61]   # sus4 -> 3rd (D -> C#)
        for j, m in enumerate(pattern):
            if not full and j % 2:
                continue
            tj = t0 + j * BAR / 8 + rng.uniform(-0.008, 0.008)
            vel = (0.55 if j == 0 else 0.32) * (0.85 + 0.3 * (k / 7))
            place(mus, piano(mtof(m), 2.4), tj, vel, pan=-0.25 if m < 50 else 0.2)
        if k >= 3:                           # strings-like pad joins for S4..S7
            place(mus, pad([mtof(tones[0]), mtof(tones[1]), mtof(tones[2])], BAR + 0.6, att=0.9, rel=0.9), t0, 0.16 + 0.07 * (k - 3))
    # a simple top line from S6 into S7
    for t0, m, d in [(24.75, 71, 1.6), (26.35, 69, 1.6), (27.95, 67, 0.8), (28.75, 66, 0.8), (29.55, 64, 1.6)]:
        place(mus, piano(mtof(m), d + 1.2), t0, 0.36, pan=0.1)
    # S8: resolve to D add9, let it ring out
    T_END = 31.15
    for m, v in [(26, 0.5), (38, 0.45), (50, 0.32), (54, 0.3), (57, 0.3), (64, 0.26), (66, 0.32), (74, 0.24)]:
        place(mus, piano(mtof(m), 4.8), T_END + (0.03 if m > 60 else 0) + (0.06 if m > 70 else 0), v)
    place(mus, pad([mtof(50), mtof(54), mtof(57), mtof(64)], 4.85, att=0.4, rel=2.6), T_END, 0.32)

    # room: stereo exponential-noise reverb
    ir_t = tt(2.4)
    ir = np.stack([lp(noise(2.4), 5000) * np.exp(-ir_t / 0.55) for _ in range(2)], 1)
    ir[:int(0.012 * SR)] = 0
    wet = np.stack([signal.fftconvolve(mus[:, c], ir[:, c])[:N] for c in range(2)], 1)
    wet *= np.abs(mus).max() / (np.abs(wet).max() + 1e-9) * 0.55
    return mus + wet


def main():
    vo24, sr = sf.read('audio/vo.wav', dtype='float64')
    assert sr == 24000
    vo = signal.resample_poly(vo24, 2, 1)[:N]
    vo = np.pad(vo, (0, N - len(vo)))
    vo = hp(vo, 75)
    vo = vo / np.abs(vo).max() * 0.70
    vo_room = signal.fftconvolve(vo, lp(noise(0.8), 4000) * np.exp(-tt(0.8) / 0.12))[:N]
    vo = vo + vo_room / np.abs(vo_room).max() * 0.035
    vo_st = np.stack([vo, vo], 1)

    mus = score()
    mus /= np.abs(mus).max()

    # duck the music under the voice (fast attack, slow release)
    hop = int(0.01 * SR)
    rms = np.sqrt(np.convolve(vo ** 2, np.ones(hop) / hop, 'same'))
    gate = np.clip(rms / 0.05, 0, 1)
    g, duck = 0.0, np.zeros(N)
    for k in range(0, N, hop):
        target = gate[k]
        g += (target - g) * (0.5 if target > g else 0.035)
        duck[k:k + hop] = g
    duck = 1 - 0.5 * duck
    mus *= duck[:, None]
    # no voice on the end card: let the score carry it
    mus *= (1 + 0.5 * np.clip((tt(LEN)[:N] - 30.9) / 0.6, 0, 1))[:, None]

    fx = np.zeros((N, 2))
    for c in json.load(open('build/cues.json')):
        sig, gain = sfx(c['type'], c)
        t = c['t'] - (0.6 if c['type'] == 'bloom' else 0)
        pan = (c['i'] - 2.5) * 0.12 if c['type'] == 'coin' else 0.0
        place(fx, sig, t, gain, pan)

    mix = vo_st + mus * 0.25 + fx
    mix *= np.minimum(1, tt(LEN)[:N, None] / 0.02)
    mix *= np.clip((LEN - tt(LEN)[:N, None]) / 0.4, 0, 1)
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    sf.write('build/mix.wav', mix.astype(np.float32), SR)
    print(f'peak {np.abs(mix).max():.3f}, music duck min {duck.min():.2f}')


if __name__ == '__main__':
    main()
