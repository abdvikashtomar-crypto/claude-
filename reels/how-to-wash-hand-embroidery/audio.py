"""Sound for the wash-care reel: voiceover, a 120 BPM groove locked to the
cut grid, and sound design on the cues the animation exported.

The hook builds on ticks and a rising machine spin, tape-stops on "ruin",
rewinds, then the groove drops in under the title. Everything is
synthesized here, so nothing needs a licence. Writes build/mix.wav.
"""
import json
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
LEN = float(open('timeline.js').read().split('window.LENGTH = ')[1].split(';')[0])
N = int(SR * LEN)
rng = np.random.default_rng(11)
BEAT = 0.5                      # 120 BPM, the edit's 0.25 s grid is an eighth note
GROOVE0 = 4.0                   # first downbeat of the groove


def tt(d):
    return np.arange(int(SR * d)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(track, sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= len(track) or i + len(sig) <= 0:
        return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        sig = np.stack([sig * l, sig * r], 1)
    a = max(0, -i)
    j = min(len(track), i + len(sig))
    track[max(i, 0):j] += sig[a:j - i] * gain


def bp(x, lo, hi, o=2):
    return signal.sosfilt(signal.butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)


def lp(x, f, o=2):
    return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, o=2):
    return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x)


def noise(d):
    return rng.standard_normal(int(SR * d))


def sweep(f0, f1, d, shape='exp'):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d) if shape == 'exp' else f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def env(d, a=0.005, r=None, tau=None):
    t = tt(d)
    e = np.minimum(1, t / max(a, 1e-4))
    if tau:
        e = e * np.exp(-t / tau)
    if r:
        e = e * np.clip((d - t) / r, 0, 1)
    return e


def sweep_bp(x, f0, f1, q=3.0):
    """band-pass whose centre glides from f0 to f1 (block-wise)."""
    out = np.zeros_like(x)
    blk = 512
    nb = max(1, len(x) // blk)
    for b in range(nb + 1):
        s, e = b * blk, min(len(x), (b + 1) * blk)
        if s >= e:
            break
        fc = f0 * (f1 / f0) ** (b / max(nb, 1))
        lo, hi = fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 - 100)
        sos = signal.butter(2, [lo, hi], 'band', fs=SR, output='sos')
        out[s:e] = signal.sosfilt(sos, x[max(0, s - 2048):e])[-(e - s):]
    return out


# ------------------------------------------------------------------ instruments
def kick(v=1.0):
    d = 0.35
    t = tt(d)
    f = 48 + 110 * np.exp(-t / 0.035)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) + hp(noise(d), 2000) * np.exp(-t / 0.004) * 0.15) * v


def clap(v=1.0):
    d = 0.25
    out = np.zeros(int(SR * d))
    for k, off in enumerate([0, 0.011, 0.022]):
        b = bp(noise(0.03), 900, 3200) * np.exp(-tt(0.03) / 0.006)
        i = int(off * SR)
        out[i:i + len(b)] += b
    out += bp(noise(d), 1000, 2800) * np.exp(-tt(d) / 0.07) * 0.6
    return out * v


def hat(v=1.0, open_=False):
    d = 0.2 if open_ else 0.06
    return hp(noise(d), 7000) * np.exp(-tt(d) / (0.09 if open_ else 0.016)) * v


def shaker(v=1.0):
    d = 0.05
    return bp(noise(d), 5000, 11000) * env(d, a=0.01, tau=0.015) * v


def crash(v=1.0):
    d = 1.6
    return hp(noise(d), 3500) * np.exp(-tt(d) / 0.55) * v


def bass(freq, d=0.22, v=1.0):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * freq * h * t) / h for h in range(1, 7))
    return lp(x, 900) * env(d, a=0.004, tau=0.12, r=0.03) * v


def pluck(freq, d=0.45, v=1.0):
    t = tt(d)
    x = np.sin(2 * np.pi * freq * t) + 0.32 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t / 0.08) + 0.12 * np.sin(2 * np.pi * freq * 3.98 * t) * np.exp(-t / 0.04)
    return x * env(d, a=0.002, tau=0.18, r=0.05) * v


def pad(freqs, d, v=1.0):
    t = tt(d)
    x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.003, 0, 0.003):
            x += sum(np.sin(2 * np.pi * f * (1 + det) * h * t + rng.uniform(0, 6)) / h ** 1.2 for h in range(1, 6))
    return lp(x, 1600) * env(d, a=0.08, r=0.15) / (len(freqs) * 3) * v


def bell(freq, d=1.2, v=1.0):
    t = tt(d)
    return sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / dd) for r, a, dd in [(1, 1, 0.9), (2.0, 0.4, 0.5), (2.76, 0.3, 0.35), (5.4, 0.12, 0.2)]) * env(d, a=0.002) * v


# ------------------------------------------------------------------ score
CHORDS = [  # root (bass midi), chord tones
    (38, [62, 66, 69]),   # D
    (33, [61, 64, 69]),   # A
    (35, [62, 66, 71]),   # Bm
    (31, [62, 67, 71]),   # G
]


def score(cuts):
    mus = np.zeros((N, 2))
    drums = np.zeros((N, 2))
    t_ruin, t_rew0, t_rew1 = cuts['ruin'], cuts['rew0'], cuts['rew1']

    # --- hook: pulse + ticks building to the spin, a riser into "ruin"
    pre = np.zeros((int(SR * (t_ruin + 0.6)), 2))
    for k in range(int((t_ruin + 0.5) / 0.25)):
        tk = k * 0.25
        place(pre, bass(mtof(38), 0.2, 0.55 + 0.35 * tk / t_ruin), tk)
        place(pre, hat(0.25 + 0.3 * tk / t_ruin), tk + 0.125, pan=0.3)
    for k in range(int((t_ruin - 1.9) / 0.125)):                     # snare roll accelerating into the burst
        tk = 1.9 + k * 0.125 * (1 - 0.35 * k / 12)
        if tk < t_ruin:
            place(pre, clap(0.15 + 0.4 * (tk - 1.9) / (t_ruin - 1.9)), tk)
    rise = sweep(220, 1400, t_ruin + 0.6) * np.linspace(0, 1, int(SR * (t_ruin + 0.6))) ** 2 * 0.18
    place(pre, lp(rise, 3000), 0.0)
    place(pre, pad([mtof(50), mtof(53), mtof(57)], t_ruin + 0.6, 0.6), 0.0)
    # tape stop: the hook slows to a halt in 0.4 s
    i0, stop = int(t_ruin * SR), int(0.4 * SR)
    speed = np.linspace(1, 0, stop) ** 1.3
    pos = i0 + np.cumsum(speed)
    warped = np.stack([np.interp(pos, np.arange(len(pre)), pre[:, c]) for c in range(2)], 1) * np.linspace(1, 0.2, stop)[:, None]
    pre[i0:i0 + stop] = warped
    pre[i0 + stop:] = 0
    mus[:len(pre)] += pre

    # --- groove from the first downbeat after the rewind
    t_end = cuts['end']
    nbars = int(np.ceil((LEN - GROOVE0) / (4 * BEAT)))
    for b in range(nbars):
        t0 = GROOVE0 + b * 4 * BEAT
        root, tones = CHORDS[b % 4]
        ending = t0 >= t_end - 0.01
        build = cuts['recap'] <= t0 < t_end
        for beat in range(4):
            tb = t0 + beat * BEAT
            if tb >= LEN:
                break
            if not ending:
                if beat in (0, 2) or (build and beat in (1, 3)):
                    place(drums, kick(0.95), tb)
                if beat in (1, 3):
                    place(drums, clap(0.55), tb, pan=0.05)
                for e in range(2):
                    place(drums, hat(0.3 if e else 0.18), tb + e * BEAT / 2, pan=0.35)
                for s16 in range(4):
                    place(drums, shaker(0.12 if s16 % 2 else 0.07), tb + s16 * BEAT / 4, pan=-0.4)
            # bass on eighths with an octave hop
            for e in range(2):
                tn = tb + e * BEAT / 2
                if tn < LEN and not ending:
                    place(mus, bass(mtof(root + (12 if (beat == 3 and e == 1) else 0)), 0.22, 0.75), tn)
            # plucked arpeggio on eighths
            arp = [tones[0], tones[1], tones[2], tones[1] + 12, tones[2], tones[1], tones[0] + 12, tones[2]]
            for e in range(2):
                tn = tb + e * BEAT / 2
                if tn < LEN:
                    note = arp[(beat * 2 + e) % 8]
                    place(mus, pluck(mtof(note), 0.4, 0.42 if not ending else 0.3), tn, pan=0.25 if e else -0.15)
        if not ending:
            place(mus, pad([mtof(n - 12) for n in tones], 4 * BEAT, 0.5), t0)
        if b % 4 == 0 and not ending:
            place(drums, crash(0.35), t0, pan=-0.2)
    # big entrance on the first downbeat, riser into the end card
    place(drums, crash(0.7), GROOVE0)
    place(drums, kick(1.2), GROOVE0)
    rl = t_end - cuts['recap']
    place(mus, lp(sweep(300, 2400, rl) * np.linspace(0, 1, int(SR * rl)) ** 2, 4000) * 0.12, cuts['recap'])
    for k in range(16):
        place(drums, clap(0.12 + 0.35 * k / 16), t_end - 1.0 + k * (1.0 / 16))
    # end card: a bright resolve and a sting on the logo
    place(drums, crash(0.8), t_end)
    place(drums, kick(1.2), t_end)
    for m, v in [(38, 0.5), (50, 0.4), (62, 0.3), (66, 0.3), (69, 0.3), (76, 0.25)]:
        place(mus, pluck(mtof(m), 2.6, v), t_end + (0.02 if m > 60 else 0))
    place(mus, pad([mtof(50), mtof(54), mtof(57), mtof(64)], LEN - t_end, 0.7), t_end)
    for k, m in enumerate([74, 78, 81, 86]):
        place(mus, bell(mtof(m), 1.4, 0.25), cuts['logo'] + k * 0.07, pan=-0.3 + 0.2 * k)
    # sidechain pump from the kick
    kicks = np.zeros(N)
    for b in range(nbars):
        for beat in (0, 2):
            tk = GROOVE0 + b * 4 * BEAT + beat * BEAT
            i = int(tk * SR)
            if i < N and tk < t_end:
                seg = min(N - i, int(0.3 * SR))
                kicks[i:i + seg] = np.maximum(kicks[i:i + seg], np.exp(-np.arange(seg) / SR / 0.11))
    mus *= (1 - 0.45 * kicks)[:, None]
    # room
    ir = np.stack([lp(noise(1.6), 6000) * np.exp(-tt(1.6) / 0.35) for _ in range(2)], 1)
    ir[:int(0.01 * SR)] = 0
    wet = np.stack([signal.fftconvolve(mus[:, c], ir[:, c])[:N] for c in range(2)], 1)
    mus = mus + wet / (np.abs(wet).max() + 1e-9) * np.abs(mus).max() * 0.35
    return mus, drums


# ------------------------------------------------------------------ sound design
def sfx(kind, c):
    d_ = c.get('dur', 0.5)
    soft = c.get('soft', False)
    if kind == 'tick':
        t = tt(0.04)
        f = 2400 + 60 * (c.get('n', 0) % 9)
        return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.008) + hp(noise(0.04), 4000) * np.exp(-t / 0.002) * 0.4, 0.07 if soft else 0.1
    if kind in ('hit', 'stamp'):
        d = 0.6
        t = tt(d)
        boom = sweep(110, 42, d) * np.exp(-t / (0.16 if kind == 'stamp' else 0.25))
        slap = bp(noise(d), 600, 4000) * np.exp(-t / 0.012)
        return boom + slap * (0.8 if kind == 'stamp' else 0.5), 0.42 if kind == 'stamp' else 0.5
    if kind in ('whip', 'whoosh', 'flip'):
        d = {'whip': 0.34, 'whoosh': 0.4, 'flip': 0.18}[kind]
        x = sweep_bp(noise(d), 500, 5000, 2.0) if kind != 'flip' else sweep_bp(noise(d), 900, 3000, 2.5)
        return x * np.sin(np.pi * np.clip(tt(d) / d, 0, 1)) ** 2, (0.1 if soft else 0.22) if kind != 'flip' else 0.14
    if kind == 'zoom':
        d = 0.42
        x = sweep_bp(noise(d), 300, 6000, 2.2) * np.sin(np.pi * np.clip(tt(d) / d, 0, 1)) ** 1.5
        return x + sweep(200, 900, d) * 0.15 * np.sin(np.pi * tt(d) / d), 0.24
    if kind == 'iris':
        d = 0.4
        x = sweep_bp(noise(d), 1500, 400, 2.0) * np.sin(np.pi * tt(d) / d) ** 2
        return x + bell(mtof(86), d, 0.15)[:len(x)], 0.2
    if kind == 'spin':
        d = 0.45
        x = sweep_bp(noise(d), 300, 3000, 3.0) * (0.6 + 0.4 * np.sin(2 * np.pi * np.linspace(6, 22, int(SR * d)) * tt(d)))
        return x * np.sin(np.pi * tt(d) / d), 0.22
    if kind == 'slats':
        d = 0.45
        out = np.zeros(int(SR * d))
        for k in range(6):
            b = sweep_bp(noise(0.07), 800, 4000, 3) * np.sin(np.pi * tt(0.07) / 0.07)
            i = int(k * 0.035 * SR)
            out[i:i + len(b)] += b
        return out, 0.2
    if kind == 'wave':
        d = 0.6
        x = lp(noise(d), 2500) * np.sin(np.pi * np.clip(tt(d) / d, 0, 1)) ** 1.2
        bub = sum(sweep(rng.uniform(500, 900), rng.uniform(1200, 2200), 0.05) * env(0.05, a=0.003, tau=0.015) for _ in range(1))
        out = x.copy()
        for k in range(10):
            i = int(rng.uniform(0.05, 0.5) * SR)
            out[i:i + len(bub)] += bub * 0.4
        return out, 0.28
    if kind == 'ding':
        return bell(mtof(88), 0.9, 1) + bell(mtof(93), 0.9, 0.5), 0.09
    if kind == 'pop':
        t = tt(0.1)
        return sweep(500, 1000, 0.1) * np.exp(-t / 0.035), 0.16
    if kind == 'machine':
        d = d_
        t = tt(d)
        spd = np.linspace(0.3, 1, len(t)) ** 2
        hum = sum(np.sin(2 * np.pi * np.cumsum(55 * h * (1 + spd)) / SR) / h for h in range(1, 5))
        rattle = bp(noise(d), 800, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(4 + 18 * spd) / SR)) ** 4
        return (lp(hum, 600) * 0.5 + rattle * 0.5) * env(d, a=0.1) * spd, 0.3
    if kind == 'explode':
        d = 1.2
        t = tt(d)
        boom = sweep(90, 30, d) * np.exp(-t / 0.4)
        crack = hp(noise(d), 1500) * np.exp(-t / 0.08)
        debris = np.zeros_like(t)
        for k in range(30):
            i = int(rng.uniform(0.05, 0.8) * SR)
            b = hp(noise(0.02), 3000) * np.exp(-tt(0.02) / 0.004)
            debris[i:i + len(b)] += b * rng.uniform(0.1, 0.4)
        return boom + crack * 0.7 + debris, 0.6
    if kind == 'tapestop':
        return np.zeros(10), 0
    if kind == 'rewind':
        d = 0.42
        t = tt(d)
        chatter = bp(noise(d), 1500, 6000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(np.linspace(18, 60, len(t))) / SR)))
        rev = (hp(noise(d), 3000) * np.linspace(0, 1, len(t)) ** 3)
        return (chatter * 0.6 + rev * 0.6 + sweep(300, 1600, d) * 0.15) * np.clip((d - t) / 0.03, 0, 1), 0.3
    if kind == 'dab':
        t = tt(0.12)
        return lp(noise(0.12), 1200) * np.exp(-t / 0.02) + np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.03) * 0.5, 0.2
    if kind in ('splash', 'drop'):
        if kind == 'drop':
            t = tt(0.12)
            bloop = sweep(1500, 520, 0.12) * np.exp(-t / 0.05)
            return bloop + bp(noise(0.12), 1500, 6000) * np.exp(-t / 0.02) * 0.4, 0.2
        d = 0.45
        t = tt(d)
        x = bp(noise(d), 800, 7000) * np.exp(-t / 0.09)
        for k in range(5):
            b = sweep(rng.uniform(600, 1000), rng.uniform(1500, 2500), 0.04) * env(0.04, a=0.002, tau=0.012)
            i = int(rng.uniform(0.02, 0.3) * SR)
            x[i:i + len(b)] += b * 0.3
        return x, 0.14 if soft else 0.24
    if kind == 'ice':
        t = tt(0.25)
        return (np.sin(2 * np.pi * 2900 * t) + 0.6 * np.sin(2 * np.pi * 4300 * t)) * np.exp(-t / 0.03), 0.08
    if kind == 'steam':
        d = d_
        t = tt(d)
        return hp(noise(d), 3500) * env(d, a=0.2, r=0.3) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * t)), 0.05 if soft else 0.09
    if kind == 'boing':
        d = 0.45
        t = tt(d)
        f = 260 * (1 + 0.25 * np.sin(2 * np.pi * 14 * t) * np.exp(-t / 0.15))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15), 0.2
    if kind == 'slosh':
        d = 0.5
        return lp(noise(d), 1800) * np.sin(np.pi * tt(d) / d) ** 2, 0.14
    if kind == 'scrub':
        d = d_
        t = tt(d)
        return bp(noise(d), 1500, 6000) * (0.5 + 0.5 * np.sin(2 * np.pi * 8.4 * t)) ** 2 * env(d, a=0.03, r=0.05), 0.12
    if kind == 'wring':
        d = 0.5
        t = tt(d)
        creak = sweep_bp(noise(d), 300, 1200, 8) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * t)) ** 3
        return creak * np.sin(np.pi * t / d) + bp(noise(d), 500, 2500) * np.exp(-np.abs(t - 0.3) / 0.05) * 0.4, 0.2
    if kind == 'drain':
        d = d_
        out = lp(noise(d), 700) * env(d, a=0.1, r=0.15) * 0.6
        for k in range(int(d * 14)):
            b = sweep(rng.uniform(150, 260), rng.uniform(300, 500), 0.06) * env(0.06, a=0.005, tau=0.02)
            i = int(rng.uniform(0, d - 0.06) * SR)
            out[i:i + len(b)] += b * 0.5
        return out, 0.2
    if kind == 'pour':
        d = d_
        t = tt(d)
        return lp(hp(noise(d), 300), 4000) * env(d, a=0.08, r=0.12) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t)), 0.14
    if kind == 'squish':
        t = tt(0.3)
        return bp(noise(0.3), 400, 2200) * np.exp(-t / 0.07) + np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.06) * 0.6, 0.26
    if kind == 'roll':
        d = d_
        return lp(noise(d), 1200) * np.sin(np.pi * np.clip(tt(d) / d, 0, 1)), 0.12
    if kind == 'flap':
        t = tt(0.2)
        return lp(noise(0.2), 1500) * np.exp(-t / 0.04) + np.sin(2 * np.pi * 120 * t) * np.exp(-t / 0.05) * 0.5, 0.24
    if kind == 'sizzle':
        d = d_
        out = hp(noise(d), 5000) * 0.25 * env(d, a=0.1, r=0.1)
        for k in range(int(d * 60)):
            i = int(rng.uniform(0, d - 0.005) * SR)
            out[i:i + 120] += hp(noise(0.0025), 3000) * rng.uniform(0.3, 1)
        return out, 0.06
    if kind == 'glide':
        d = d_
        t = tt(d)
        spd = np.abs(np.cos(2 * np.pi * 0.55 * t))
        return bp(noise(d), 300, 2000) * spd * env(d, a=0.1, r=0.2), 0.08
    if kind == 'splat':
        t = tt(0.2)
        return lp(noise(0.2), 2000) * np.exp(-t / 0.03) + np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.04) * 0.5, 0.18
    if kind == 'shimmer':
        out = np.zeros(int(SR * 1.2))
        for k, m in enumerate([81, 85, 88, 93, 97]):
            b = bell(mtof(m), 0.9, 0.5)
            i = int(k * 0.05 * SR)
            out[i:i + len(b)] += b[:len(out) - i]
        return out, 0.08
    if kind == 'threadpull':
        d = 0.6
        t = tt(d)
        return bp(noise(d), 2000, 7000) * np.clip(t / 0.4, 0, 1) ** 1.5 * np.clip((d - t) / 0.06, 0, 1), 0.16
    if kind == 'knot':
        t = tt(0.25)
        return np.sin(2 * np.pi * 170 * t) * np.exp(-t / 0.05) + bp(noise(0.25), 600, 2400) * np.exp(-t / 0.015) * 0.5, 0.22
    raise ValueError(kind)


def main():
    import re
    tl = open('timeline.js').read()
    vo_meta = json.loads(re.search(r'window.VO = (\[.*?\]);', tl, re.S).group(1))
    cuts = json.loads(re.search(r'window.CUTS = (\{.*?\});', tl, re.S).group(1))
    cue_list = json.load(open('build/cues.json'))
    first = lambda k: next(c['t'] for c in cue_list if c['type'] == k)
    cuts['ruin'] = first('tapestop') + 0.02
    cuts['rew0'] = first('rewind')
    cuts['rew1'] = cuts['rew0'] + 0.36
    pops = [c['t'] for c in cue_list if c['type'] == 'pop' and c['t'] > cuts['end']]
    cuts['logo'] = pops[-1] if pops else cuts['end'] + 3

    vo24, sr = sf.read('audio/vo.wav', dtype='float64')
    vo = signal.resample_poly(vo24, 2, 1)[:N]
    vo = np.pad(vo, (0, N - len(vo)))
    vo = hp(vo, 80)
    # gentle presence lift and a light compressor so every word reads over the beat
    vo = vo + bp(vo, 2500, 5500) * 0.25
    envv = np.sqrt(np.convolve(vo ** 2, np.ones(480) / 480, 'same')) + 1e-6
    gain = np.minimum(1, (0.12 / envv) ** 0.35)
    vo = vo * signal.savgol_filter(gain, 2401, 1)
    vo = vo / np.abs(vo).max() * 0.72

    mus, drums = score(cuts)
    # calibrate every stem against the voice so it always reads first:
    # music bed -14 dB under the voice while it speaks, effects -11 dB overall
    spk = np.zeros(N, bool)
    for c in vo_meta:
        spk[int(c['start'] * SR):int(c['end'] * SR)] = True
    rms = lambda x: np.sqrt(np.mean(np.square(x))) + 1e-12
    v_rms = rms(vo[spk])
    hop = int(0.01 * SR)
    lvl = np.sqrt(np.convolve(vo ** 2, np.ones(hop) / hop, 'same'))
    gate = np.clip(lvl / 0.04, 0, 1)
    g, duck = 0.0, np.zeros(N)
    for k in range(0, N, hop):
        tgt = gate[k]
        g += (tgt - g) * (0.6 if tgt > g else 0.05)
        duck[k:k + hop] = g
    duck_gain = 1 - 0.6 * duck                                   # about -8 dB under speech
    bed = mus * 0.45 + drums * 0.55
    bed *= duck_gain[:, None]
    bed *= v_rms * 10 ** (-14 / 20) / rms(bed[spk])
    fx = np.zeros((N, 2))
    for c in cue_list:
        sig, gain_ = sfx(c['type'], c)
        if gain_:
            place(fx, sig, c['t'], gain_, c.get('pan', 0.0))
    fx *= (1 - 0.35 * duck)[:, None]
    fx *= v_rms * 10 ** (-11 / 20) / rms(fx[np.abs(fx).max(1) > 1e-4])
    fx = np.tanh(fx / (0.85 * np.abs(vo).max())) * 0.85 * np.abs(vo).max()   # no effect peaks above the voice
    print(f'voice rms {20 * np.log10(v_rms):.1f} dB, bed under speech {20 * np.log10(rms(bed[spk])):.1f} dB, bed in gaps {20 * np.log10(rms(bed[~spk])):.1f} dB')
    mix = np.stack([vo, vo], 1) + bed + fx
    mix *= np.minimum(1, tt(LEN)[:N, None] / 0.01)
    mix *= np.clip((LEN - tt(LEN)[:N, None]) / 0.5, 0, 1)
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    sf.write('build/mix.wav', mix.astype(np.float32), SR)
    sf.write('build/stem-vo.wav', vo.astype(np.float32), SR)
    sf.write('build/stem-bed.wav', (bed + fx).astype(np.float32), SR)
    print(f'peak {np.abs(mix).max():.3f}, duck min {1 - 0.5 * duck.max():.2f}')


if __name__ == '__main__':
    main()
