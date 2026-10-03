/* Engine for the wash-care reel.
   Every frame is a pure function of time: seek(t) poses the whole reel.
   GSAP tweens the authored motion; per-frame callbacks draw what is computed
   (water, transitions, shake), and a seeded, stateless particle system draws
   bubbles, drops, steam and sparks on a canvas inside each scene. Sound cues
   are collected so the mix lands on the same frames. */
window.Engine = async function Engine() {
  const C = {
    cream: '#F3EDE3', shade: '#E8DFD1', ink: '#1A1917', warm: '#FCF8F0', green: '#136207', mari: '#F2B01E',
    lint: '#87837D', fabric: '#F7F3EC', vein: '#D39A12', untouched: '#D3CDC3', inside: '#E6DCCB',
    water: '#8CC4BD', waterDeep: '#4F978F', waterLight: '#D2EAE5', stain: '#A08D72',
  };
  // text colours per ground
  const TH = {
    cream: { text: C.ink, sub: C.green, muted: '#6B675F', on: C.green, off: '#D3CDC3', cur: C.mari, no: C.ink, badge: C.green, mark: C.warm },
    dark: { text: C.warm, sub: C.mari, muted: '#A8A39B', on: C.warm, off: 'rgba(252,248,240,.22)', cur: C.mari, no: C.warm, badge: C.green, mark: C.warm },
    green: { text: C.warm, sub: C.mari, muted: 'rgba(252,248,240,.78)', on: C.warm, off: 'rgba(252,248,240,.25)', cur: C.mari, no: C.warm, badge: C.mari, mark: C.ink },
    mari: { text: C.ink, sub: C.green, muted: 'rgba(26,25,23,.72)', on: C.ink, off: 'rgba(26,25,23,.22)', cur: C.warm, no: C.ink, badge: C.green, mark: C.warm },
  };
  const NS = 'http://www.w3.org/2000/svg';
  const stage = document.getElementById('stage');
  const tl = gsap.timeline({ paused: true });
  // GSAP shifts every child when one is inserted at a negative time; refuse that outright
  for (const m of ['to', 'from', 'fromTo', 'set']) {
    const f = tl[m].bind(tl);
    tl[m] = (...a) => { const pos = a[a.length - 1]; if (typeof pos === 'number' && pos < 0) throw new Error(`tween at negative time ${pos}`); return f(...a); };
  }
  const P = {};
  const CUES = [];
  const DYN = [];
  const TRANS = [];
  const cue = (type, t, o = {}) => CUES.push({ type, t: +t.toFixed(3), ...o });

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, f) => a + (b - a) * f;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    out3: f => 1 - Math.pow(1 - f, 3), in3: f => f * f * f,
    io3: f => (f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2),
    outBack: (f, s = 1.7) => 1 + (s + 1) * Math.pow(f - 1, 3) + s * Math.pow(f - 1, 2),
    io2: f => (f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2),
  };
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const R = (r, a, b) => a + (b - a) * r();

  const clause = id => VO.find(c => c.id === id);
  const cs = id => clause(id).start, ce = id => clause(id).end;
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  /** start time of a word in a clause, by its text (first match after `after`) */
  function W(id, text, nth = 0) {
    const hits = clause(id).words.filter(w => norm(w.w) === norm(text));
    if (!hits[nth]) throw new Error(`word "${text}" not in ${id}`);
    return hits[nth].s;
  }

  await Promise.all([
    document.fonts.load('900 100px Montserrat'), document.fonts.load('700 100px Montserrat'), document.fonts.load('600 100px Montserrat'),
    document.fonts.load('italic 500 100px Playfair'), document.fonts.load('italic 400 100px Playfair'),
  ]);
  const METRICS = {};
  {
    const ctx = document.createElement('canvas').getContext('2d');
    for (const [k, font] of [['m', '800 100px Montserrat'], ['p', 'italic 500 100px Playfair']]) {
      ctx.font = font;
      const m = ctx.measureText('Hxg');
      const A = m.fontBoundingBoxAscent / 100, D = m.fontBoundingBoxDescent / 100;
      METRICS[k] = (1 - (A + D)) / 2 + A;
    }
  }

  // ---------------------------------------------------------------- DOM builders
  function div(parent, cls = '', css = {}) {
    const e = document.createElement('div');
    if (cls) e.className = cls;
    Object.assign(e.style, css);
    parent.appendChild(e);
    return e;
  }
  function S(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const fullSvg = parent => S('svg', { class: 'full', viewBox: '0 0 1080 1920', width: 1080, height: 1920 }, parent);
  let uid = 0;
  const id = p => `${p}${++uid}`;

  /* Text placed by baseline. split: 'words' wraps each word (optionally in a
     clipping mask), 'chars' wraps each letter grouped by word. */
  function T(parent, text, o) {
    const fam = o.fam || 'm';
    const e = div(parent, 'tx ' + fam);
    const size = o.size;
    Object.assign(e.style, {
      fontSize: size + 'px', lineHeight: size + 'px', color: o.color || C.ink,
      fontWeight: o.wt || (fam === 'p' ? 500 : 800), top: o.y - size * METRICS[fam] + 'px',
    });
    if (o.ls) e.style.letterSpacing = o.ls + 'em';
    const align = o.align || 'center';
    if (align === 'center') {
      Object.assign(e.style, { left: (o.x ?? 540) - 1500 + 'px', width: '3000px', textAlign: 'center' });
      if (o.ls) e.style.paddingLeft = o.ls + 'em';
    } else if (align === 'left') e.style.left = o.x + 'px';
    else Object.assign(e.style, { left: o.x - 3000 + 'px', width: '3000px', textAlign: 'right' });
    e.words = [];
    if (!o.split) { e.textContent = text; return e; }
    text.split(' ').forEach((word, i) => {
      if (i) e.appendChild(document.createTextNode(' '));
      let host = e;
      if (o.mask) {
        host = div(e, 'mask');
        Object.assign(host.style, { padding: '0.12em 0.08em 0.16em', margin: '-0.12em -0.08em -0.16em' });
      }
      const w = div(host, 'w');
      if (o.split === 'chars') w.chars = [...word].map(ch => { const c = div(w, 'ch'); c.textContent = ch; return c; });
      else w.textContent = word;
      e.words.push(w);
    });
    return e;
  }
  function drawable(el) {
    const len = el.getTotalLength();
    el.setAttribute('stroke-dasharray', `${len} ${len}`);
    el.setAttribute('stroke-dashoffset', len);
    return len;
  }
  const drawOn = (el, t, dur = 0.3, ez = 'power2.out') => { drawable(el); tl.to(el, { attr: { 'stroke-dashoffset': 0 }, duration: dur, ease: ez }, t); };

  // ---------------------------------------------------------------- layers
  const defs = S('svg', { width: 0, height: 0, style: 'position:absolute' }, stage);
  const fdefs = S('defs', {}, defs);
  const blurX = S('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '0 0' }, S('filter', { id: 'mbx', x: '-20%', y: '-5%', width: '140%', height: '110%' }, fdefs));
  const blurY = S('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '0 0' }, S('filter', { id: 'mby', x: '-5%', y: '-20%', width: '110%', height: '140%' }, fdefs));
  const world = div(stage, 'layer');
  const over = div(stage, 'layer');
  const overSvg = fullSvg(over);
  const DPR = window.devicePixelRatio || 1;
  function canvas(parent) {
    const cv = document.createElement('canvas');
    cv.className = 'full';
    cv.width = 1080 * DPR; cv.height = 1920 * DPR;
    Object.assign(cv.style, { width: '1080px', height: '1920px' });
    parent.appendChild(cv);
    const ctx = cv.getContext('2d');
    return { cv, ctx };
  }
  const overFx = canvas(over);
  const overEm = [];
  const capsLayer = div(stage, '');
  capsLayer.id = 'caps';

  // ---------------------------------------------------------------- scenes
  const scenes = [];
  function scene(name, theme) {
    const el = div(world, 'layer ' + theme);
    const inner = div(el, 'layer');
    const back = fullSvg(inner);
    const fx = canvas(inner);
    const front = fullSvg(inner);
    const sc = { name, theme, th: TH[theme], el, inner, back, front, fx, em: [], win: [99, 0] };
    sc.show = (a, b) => { sc.win = [a, b]; return sc; };
    sc.emit = o => emitter(o, sc.em);
    scenes.push(sc);
    return sc;
  }
  function drift(sc, t0, t1, s1 = 1.05, ox = 540, oy = 900) {
    tl.fromTo(sc.inner, { scale: 1 }, { scale: s1, duration: t1 - t0, ease: 'none', transformOrigin: `${ox}px ${oy}px` }, t0);
  }

  // ---------------------------------------------------------------- particles (stateless, seeded)
  let seedCount = 1;
  function emitter(o, list) {
    const r = rng(o.seed ?? (seedCount++ * 7919 + 17));
    const ps = [];
    for (let i = 0; i < o.n; i++) {
      const tb = o.t0 + (o.n > 1 ? ((o.t1 ?? o.t0) - o.t0) * i / (o.n - 1) : 0) + (o.jitter ? (r() - 0.5) * o.jitter : 0);
      ps.push(Object.assign({ tb, life: o.life }, o.spawn(r, i, tb)));
    }
    const e = { ...o, ps, end: Math.max(...ps.map(p => p.tb + p.life)) };
    list.push(e);
    return e;
  }
  function drawEmitters(list, ctx, t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, 1080, 1920);
    for (const e of list) {
      if (t < e.t0 - 0.01 || t > e.end) continue;
      ctx.save();
      if (e.clip) ctx.clip(e.clip);
      for (const p of e.ps) {
        const age = t - p.tb;
        if (age < 0 || age > p.life) continue;
        ctx.save();
        e.draw(ctx, p, age, t);
        ctx.restore();
      }
      ctx.restore();
    }
  }
  const fade = (age, life, fin = 0.08, fout = 0.15) => clamp(age / fin) * clamp((life - age) / fout);
  const PETAL = 'M0,-26 C15,-34 18,-70 7,-94 Q0,-106 -7,-94 C-18,-70 -15,-34 0,-26 Z';
  const PETAL2D = new Path2D(PETAL);
  const FX = {
    bubbles(sc, o) { // rising bubbles inside an area
      return sc.emit({
        t0: o.t0, t1: o.t1, n: o.n, life: o.life || 1.6, jitter: o.jitter ?? 0.1, clip: o.clip, seed: o.seed,
        spawn: r => ({ x: R(r, o.x0, o.x1), y: R(r, o.y0, o.y1), vy: -R(r, ...(o.rise || [60, 160])), vx: R(r, -12, 12), r: R(r, ...(o.size || [5, 16])), wf: R(r, 5, 9), wa: R(r, 2, 7), ph: R(r, 0, 6.28), life: R(r, 0.7, 1) * (o.life || 1.6) }),
        draw(ctx, p, age) {
          const x = p.x + p.vx * age + Math.sin(age * p.wf + p.ph) * p.wa, y = p.y + p.vy * age;
          const r = p.r * (0.35 + 0.65 * clamp(age / 0.18));
          ctx.globalAlpha = fade(age, p.life, 0.1, 0.12) * (o.alpha ?? 0.95);
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
          ctx.fillStyle = o.fill || 'rgba(255,255,255,.22)'; ctx.fill();
          ctx.lineWidth = Math.max(1.6, r * 0.15); ctx.strokeStyle = o.color || '#FFFFFF'; ctx.stroke();
          ctx.beginPath(); ctx.arc(x - r * 0.38, y - r * 0.38, r * 0.22, 0, 6.2832); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        },
      });
    },
    splash(sc, o) { // ballistic droplets from a point
      return sc.emit({
        t0: o.t, t1: o.t + (o.spread || 0.03), n: o.n, life: o.life || 0.8, clip: o.clip, seed: o.seed,
        spawn: r => {
          const a = R(r, ...(o.angle || [-160, -20])) * Math.PI / 180, v = R(r, ...(o.speed || [300, 700]));
          return { x: o.x + R(r, -(o.w || 10), o.w || 10), y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: R(r, ...(o.size || [4, 9])), life: R(r, 0.6, 1) * (o.life || 0.8) };
        },
        draw(ctx, p, age) {
          const g = o.g ?? 1800;
          const x = p.x + p.vx * age, y = p.y + p.vy * age + 0.5 * g * age * age;
          const vx = p.vx, vy = p.vy + g * age;
          ctx.globalAlpha = fade(age, p.life, 0.02, 0.15);
          ctx.translate(x, y); ctx.rotate(Math.atan2(vy, vx));
          const len = p.r * (1 + Math.min(1.8, Math.hypot(vx, vy) / 700));
          ctx.beginPath(); ctx.ellipse(0, 0, len, p.r, 0, 0, 6.2832);
          ctx.fillStyle = o.color || C.water; ctx.fill();
          ctx.beginPath(); ctx.ellipse(len * 0.25, -p.r * 0.3, len * 0.3, p.r * 0.25, 0, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
        },
      });
    },
    petals(sc, o) { // tumbling petals from a burst
      return sc.emit({
        t0: o.t, t1: o.t + 0.04, n: o.n, life: o.life || 1.3, seed: o.seed,
        spawn: (r, i) => {
          const a = (i / o.n) * 6.2832 + R(r, -0.3, 0.3), v = R(r, ...(o.speed || [500, 1100]));
          return { x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, rot: (a * 180) / Math.PI + 90, vr: R(r, -720, 720), s: R(r, 0.5, 0.9) * (o.scale || 1) };
        },
        draw(ctx, p, age) {
          const drag = Math.exp(-age * 1.6);
          const k = (1 - drag) / 1.6;
          const x = p.x + p.vx * k, y = p.y + p.vy * k + 0.5 * 900 * age * age;
          ctx.globalAlpha = fade(age, p.life, 0.01, 0.3);
          ctx.translate(x, y); ctx.rotate(((p.rot + p.vr * age) * Math.PI) / 180); ctx.scale(p.s, p.s);
          ctx.translate(0, 64);
          ctx.fillStyle = o.color || C.mari; ctx.fill(PETAL2D);
        },
      });
    },
    sparkles(sc, o) { // four-point stars popping around a point
      return sc.emit({
        t0: o.t, t1: o.t + (o.spread || 0.25), n: o.n || 8, life: o.life || 0.55, seed: o.seed,
        spawn: r => { const a = R(r, 0, 6.2832), d = R(r, ...(o.radius || [40, 120])); return { x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d, s: R(r, ...(o.size || [10, 24])), rot: R(r, 0, 90) }; },
        draw(ctx, p, age) {
          const k = Math.sin(Math.PI * clamp(age / p.life));
          ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180); ctx.scale(k, k);
          const s = p.s;
          ctx.beginPath();
          ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s); ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s);
          ctx.fillStyle = o.color || C.mari; ctx.fill();
        },
      });
    },
    steam(sc, o) {
      return sc.emit({
        t0: o.t0, t1: o.t1, n: o.n, life: o.life || 1.4, jitter: 0.1, seed: o.seed,
        spawn: r => ({ x: R(r, o.x0, o.x1), y: o.y, vy: -R(r, 90, 180), r: R(r, 18, 34), ph: R(r, 0, 6.28) }),
        draw(ctx, p, age) {
          const x = p.x + Math.sin(age * 3 + p.ph) * 14, y = p.y + p.vy * age, r = p.r * (1 + age * 1.6);
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          const a = 0.5 * fade(age, p.life, 0.2, 0.6) * (o.alpha ?? 1);
          g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
        },
      });
    },
    dye(sc, o) { // colour bleeding out as soft clouds
      return sc.emit({
        t0: o.t0, t1: o.t1, n: o.n, life: o.life || 1.5, clip: o.clip, seed: o.seed,
        spawn: r => { const a = R(r, 0, 6.2832); return { x: o.x + Math.cos(a) * R(r, 0, 30), y: o.y + Math.sin(a) * R(r, 0, 30), vx: Math.cos(a) * R(r, 20, 70), vy: Math.sin(a) * R(r, 10, 50) + 15, r: R(r, 20, 40) }; },
        draw(ctx, p, age) {
          const x = p.x + p.vx * age, y = p.y + p.vy * age, r = p.r + age * 70;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          const a = 0.42 * fade(age, p.life, 0.25, 0.5);
          g.addColorStop(0, `rgba(242,176,30,${a})`); g.addColorStop(1, 'rgba(242,176,30,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
        },
      });
    },
    ripples(sc, o) { // expanding ellipses on a water surface
      return sc.emit({
        t0: o.t, t1: o.t + (o.gap || 0.12) * ((o.n || 3) - 1), n: o.n || 3, life: o.life || 0.7, clip: o.clip, seed: o.seed,
        spawn: () => ({}),
        draw(ctx, p, age) {
          const k = age / p.life, rx = (o.r || 90) * ease.out3(k) + 8;
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.lineWidth = 4 * (1 - k) + 1.5; ctx.strokeStyle = o.color || '#FFFFFF';
          ctx.beginPath(); ctx.ellipse(o.x, o.y, rx, rx * (o.flat ?? 0.28), 0, 0, 6.2832); ctx.stroke();
        },
      });
    },
    warp(list, o) { // lines rushing out from a point, for zoom cuts
      return emitter({
        t0: o.t, t1: o.t + 0.12, n: o.n || 36, life: 0.3, seed: o.seed,
        spawn: r => ({ a: R(r, 0, 6.2832), d0: R(r, 30, 260), v: R(r, 2600, 5200), len: R(r, 120, 360), w: R(r, 3, 8) }),
        draw(ctx, p, age) {
          const d = p.d0 + p.v * age, c = Math.cos(p.a), s = Math.sin(p.a);
          ctx.globalAlpha = 0.6 * Math.sin(Math.PI * age / p.life);
          ctx.strokeStyle = o.color || '#FFFFFF'; ctx.lineWidth = p.w; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(o.x + c * d, o.y + s * d); ctx.lineTo(o.x + c * (d + p.len), o.y + s * (d + p.len)); ctx.stroke();
        },
      }, list);
    },
    streaks(list, o) { // speed lines for whips
      return emitter({
        t0: o.t, t1: o.t + 0.08, n: o.n || 16, life: o.life || 0.28, seed: o.seed,
        spawn: r => ({ y: R(r, 300, 1700), len: R(r, 160, 520), x: R(r, -200, 1080), v: R(r, 2500, 5200) * (o.dir || -1), w: R(r, 3, 9) }),
        draw(ctx, p, age) {
          const x = p.x + p.v * age;
          ctx.globalAlpha = 0.55 * Math.sin(Math.PI * age / p.life);
          ctx.strokeStyle = o.color || '#FFFFFF'; ctx.lineWidth = p.w; ctx.lineCap = 'round';
          ctx.beginPath();
          if (o.vertical) { ctx.moveTo(p.y * 0.56, x * 1.6); ctx.lineTo(p.y * 0.56, x * 1.6 + p.len * Math.sign(p.v)); }
          else { ctx.moveTo(x, p.y); ctx.lineTo(x + p.len * Math.sign(p.v), p.y); }
          ctx.stroke();
        },
      }, list);
    },
  };

  // ---------------------------------------------------------------- camera shake
  const shakes = [];
  function shake(t, amp = 12, dur = 0.3) { shakes.push({ t, amp, dur }); }
  function shakeAt(t) {
    let x = 0, y = 0, r = 0;
    for (const s of shakes) {
      const a = t - s.t;
      if (a < 0 || a > s.dur) continue;
      const k = s.amp * Math.pow(1 - a / s.dur, 2);
      x += k * Math.sin(a * 91 + s.t * 7); y += k * Math.sin(a * 77 + 1.3 + s.t * 3); r += k * 0.03 * Math.sin(a * 63);
    }
    return [x, y, r];
  }

  // ---------------------------------------------------------------- transitions (A out, B in, centred on cut time T)
  function trans(kind, A, B, T, o = {}) {
    const d = o.d ?? 0.32, t0 = T - d * 0.55, t1 = t0 + d;
    const key = id('tr');
    P[key] = 0;
    tl.to(P, { [key]: 1, duration: d, ease: o.ease || 'power3.inOut' }, t0);
    A.win[1] = Math.max(A.win[1], t1 + 0.02);
    B.win[0] = Math.min(B.win[0], t0 - 0.02);
    if (!o.ease && (kind === 'slats' || kind === 'wave')) o.ease = 'none';
    TRANS.push({ kind, A, B, T, t0, t1, key, o });
    const snd = { whip: 'whip', zoom: 'zoom', iris: 'iris', slats: 'slats', wave: 'wave', spin: 'spin', flash: 'hit' }[kind];
    cue(snd, t0, { d });
    if (kind === 'whip') FX.streaks(overEm, { t: t0 + d * 0.15, dir: o.dir === 'right' ? 1 : -1, vertical: o.dir === 'up' || o.dir === 'down', color: o.streak });
    if (kind === 'zoom') FX.warp(overEm, { t: t0 + d * 0.1, x: (o.at || [540, 900])[0], y: (o.at || [540, 900])[1] });
    if (kind === 'flash') shake(T, 16, 0.3);
  }
  const slatEls = Array.from({ length: 6 }, (_, i) => S('rect', { x: i * 180, y: 0, width: 181, height: 1920 }, overSvg));
  const waveEl = S('path', { fill: C.water }, overSvg);
  const waveFoam = S('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.85 }, overSvg);
  const flashEl = S('rect', { x: 0, y: 0, width: 1080, height: 1920, fill: '#FFFFFF' }, overSvg);
  function wavePath(top, t, amp = 46) {
    let d = `M0,2100 L0,${top}`;
    for (let x = 0; x <= 1080; x += 20) d += ` L${x},${(top + Math.sin(x / 95 + t * 9) * amp + Math.sin(x / 41 - t * 13) * amp * 0.35).toFixed(1)}`;
    return d + ' L1080,2100 Z';
  }
  function applyTransitions(t) {
    for (const s of scenes) { s.el.style.transform = ''; s.el.style.filter = ''; s.el.style.clipPath = ''; s.el.style.opacity = ''; }
    slatEls.forEach(e => e.setAttribute('display', 'none'));
    waveEl.setAttribute('display', 'none'); waveFoam.setAttribute('display', 'none'); flashEl.setAttribute('display', 'none');
    for (const tr of TRANS) {
      // the incoming shot settles with a small punch-in
      if (t > tr.t1 && t < tr.t1 + 0.32 && !tr.o.noPunch) {
        const k = ease.out3(clamp((t - tr.t1) / 0.32));
        tr.B.el.style.transformOrigin = '540px 900px';
        tr.B.el.style.transform = `scale(${(1.045 - 0.045 * k).toFixed(4)})`;
      }
      if (t < tr.t0 - 0.02 || t > tr.t1 + 0.2) continue;
      const p = P[tr.key], { A, B, o } = tr;
      if (t > tr.t1) continue;
      const bell = Math.sin(Math.PI * clamp(p));
      if (tr.kind === 'whip') {
        const v = o.dir === 'up' ? [0, -1] : o.dir === 'down' ? [0, 1] : o.dir === 'right' ? [1, 0] : [-1, 0];
        const W = v[0] ? 1080 : 1920;
        A.el.style.transform = `translate(${v[0] * W * p}px, ${v[1] * W * p}px)`;
        B.el.style.transform = `translate(${v[0] * W * (p - 1)}px, ${v[1] * W * (p - 1)}px)`;
        const b = (bell * 46).toFixed(1);
        (v[0] ? blurX : blurY).setAttribute('stdDeviation', v[0] ? `${b} 0` : `0 ${b}`);
        if (p > 0.001 && p < 0.999) A.el.style.filter = B.el.style.filter = `url(#${v[0] ? 'mbx' : 'mby'})`;
      } else if (tr.kind === 'zoom') {
        const [fx, fy] = o.at || [540, 900];
        A.el.style.transformOrigin = B.el.style.transformOrigin = `${fx}px ${fy}px`;
        A.el.style.transform = `scale(${1 + 1.6 * ease.in3(clamp(p / 0.7))})`;
        A.el.style.opacity = 1 - clamp((p - 0.35) / 0.3);
        B.el.style.transform = `scale(${1.3 - 0.3 * ease.out3(clamp((p - 0.3) / 0.7))})`;
        B.el.style.opacity = clamp((p - 0.3) / 0.25);
      } else if (tr.kind === 'iris') {
        const [fx, fy] = o.at || [540, 900];
        if (p < 0.999) B.el.style.clipPath = `circle(${(2300 * ease.in3(p)).toFixed(1)}px at ${fx}px ${fy}px)`;
        A.el.style.transform = `scale(${1 + 0.15 * p})`;
        A.el.style.transformOrigin = `${fx}px ${fy}px`;
      } else if (tr.kind === 'spin') {
        const [fx, fy] = o.at || [540, 900];
        A.el.style.transformOrigin = B.el.style.transformOrigin = `${fx}px ${fy}px`;
        A.el.style.transform = `rotate(${(o.deg || 90) * p}deg) scale(${1 + 0.8 * p})`;
        A.el.style.opacity = 1 - clamp((p - 0.4) / 0.25);
        B.el.style.transform = `rotate(${-(o.deg || 90) * (1 - p)}deg) scale(${0.55 + 0.45 * p})`;
        B.el.style.opacity = clamp((p - 0.35) / 0.25);
        if (bell > 0.05) A.el.style.filter = B.el.style.filter = `blur(${(bell * 6).toFixed(1)}px)`;
      } else if (tr.kind === 'slats') {
        // bars sweep in alternately, the scene swaps underneath, bars sweep out
        const inPhase = p < 0.5;
        (inPhase ? B : A).el.style.display = 'none';
        slatEls.forEach((e, i) => {
          const k = clamp(((inPhase ? p : p - 0.5) - i * 0.04) / 0.3);
          const cover = inPhase ? ease.io2(k) : 1 - ease.io2(k);
          const fromTop = i % 2 === 0;
          const h = 1920 * cover;
          e.setAttribute('display', cover > 0.001 ? '' : 'none');
          e.setAttribute('fill', o.color || C.mari);
          e.setAttribute('y', inPhase ? (fromTop ? 0 : 1920 - h) : (fromTop ? 1920 - h : 0));
          e.setAttribute('height', h);
        });
      } else if (tr.kind === 'wave') {
        // a wall of water rushes up past the camera
        (p < 0.8 ? B : A).el.style.display = 'none';
        const top = lerp(2050, -260, ease.io2(p)), bottom = lerp(2400, -160, ease.in3(clamp((p - 0.6) / 0.4)));
        waveEl.setAttribute('display', ''); waveFoam.setAttribute('display', '');
        let d = wavePath(top, t);
        d = d.replace('M0,2100', `M0,${bottom.toFixed(1)}`).replace(' L1080,2100 Z', ` L1080,${bottom.toFixed(1)} Z`);
        waveEl.setAttribute('d', d);
        waveFoam.setAttribute('d', wavePath(top, t).replace(/^M0,2100 L/, 'M').replace(/ L1080,2100 Z$/, ''));
      } else if (tr.kind === 'flash') {
        (t < tr.T ? B : A).el.style.display = 'none';
        const k = clamp((t - tr.T) / 0.16);
        if (t >= tr.T && k < 1) { flashEl.setAttribute('display', ''); flashEl.setAttribute('opacity', (0.9 * (1 - k)).toFixed(3)); flashEl.setAttribute('fill', o.color || '#FFFFFF'); }
      }
    }
  }

  // ---------------------------------------------------------------- shared UI pieces
  /** step progress: label plus nine stitch dashes, the current one fills in */
  function chip(sc, step, t, label) {
    const th = sc.th;
    // t == null: already shown (a second camera angle on the same step), no tweens
    const txt = T(sc.inner, label || `STEP ${step} OF 9`, { size: 30, wt: 700, ls: 0.3, color: th.muted, y: 312 });
    if (t != null) tl.fromTo(txt, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.22 }, t);
    for (let i = 0; i < 9; i++) {
      const x1 = 323 + i * 50;
      S('line', { x1, x2: x1 + 34, y1: 346, y2: 346, stroke: th.off, 'stroke-width': 9, 'stroke-linecap': 'round' }, sc.front);
      if (i < step - 1 || step === 10) S('line', { x1, x2: x1 + 34, y1: 346, y2: 346, stroke: th.on, 'stroke-width': 9, 'stroke-linecap': 'round' }, sc.front);
      else if (i === step - 1) {
        const l = S('line', { x1, x2: t == null ? x1 + 34 : x1, y1: 346, y2: 346, stroke: th.cur, 'stroke-width': 9, 'stroke-linecap': 'round' }, sc.front);
        if (t != null) tl.to(l, { attr: { x2: x1 + 34 }, duration: 0.35, ease: 'power2.out' }, t + 0.1);
      }
    }
  }
  /** kinetic headline: words slide up out of masks, staggered */
  function headline(sc, lines, t, o = {}) {
    const els = lines.map(l => T(sc.inner, l.text, { size: l.size || 112, wt: l.wt || 900, fam: l.fam || 'm', color: l.color || sc.th.text, y: l.y, x: l.x, align: l.align, split: 'words', mask: true }));
    let k = 0;
    els.forEach(e => e.words.forEach(w => {
      tl.fromTo(w, { yPercent: 118, rotation: 5 }, { yPercent: 0, rotation: 0, duration: 0.34, ease: 'back.out(1.7)' }, t + (k++) * (o.stagger ?? 0.06));
    }));
    return els;
  }
  function label(sc, text, x, y, o = {}) {
    const e = T(sc.inner, text, { size: o.size || 26, wt: o.wt || 700, ls: o.ls ?? 0.16, color: o.color || sc.th.muted, x, y, align: o.align || 'center', fam: o.fam });
    if (o.t != null) tl.fromTo(e, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, o.t);
    return e;
  }
  /** "don't" stamp: a circle with a slash, slammed down with a shake */
  function stampNo(sc, cx, cy, r, t, color) {
    const g = S('g', { transform: `translate(${cx},${cy})` }, sc.front);
    const inner = S('g', {}, g);
    const c = color || sc.th.no;
    S('circle', { r, fill: 'none', stroke: c, 'stroke-width': r * 0.17 }, inner);
    S('line', { x1: -r * 0.68, y1: -r * 0.68, x2: r * 0.68, y2: r * 0.68, stroke: c, 'stroke-width': r * 0.17, 'stroke-linecap': 'round' }, inner);
    gsap.set(inner, { opacity: 0 });
    tl.fromTo(inner, { opacity: 0, scale: 2.6, rotation: -30, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, rotation: 0, duration: 0.16, ease: 'power4.in' }, t);
    shake(t + 0.16, 14, 0.3);
    cue('stamp', t + 0.15);
    return inner;
  }
  /** "do" badge: a filled circle with a tick */
  function badgeOk(sc, cx, cy, r, t, o = {}) {
    const g = S('g', { transform: `translate(${cx},${cy})` }, sc.front);
    const inner = S('g', {}, g);
    S('circle', { r, fill: o.fill || sc.th.badge }, inner);
    const tick = S('path', { d: `M${-r * 0.42},${r * 0.02} L${-r * 0.12},${r * 0.32} L${r * 0.45},${-r * 0.3}`, fill: 'none', stroke: o.mark || sc.th.mark, 'stroke-width': r * 0.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, inner);
    gsap.set(inner, { scale: 0, transformOrigin: '50% 50%' });
    tl.to(inner, { scale: 1, duration: 0.32, ease: 'back.out(2.6)' }, t);
    drawOn(tick, t + 0.08, 0.2);
    FX.sparkles(sc, { x: cx, y: cy, t: t + 0.05, n: 9, radius: [r * 1.1, r * 2.2], color: o.spark || C.mari });
    cue('ding', t + 0.06);
    return inner;
  }
  /** slowly turning dashed ring behind a hero object */
  function ring(sc, cx, cy, r, color, speed = 12, o = {}) {
    const c = S('circle', { cx, cy, r, fill: 'none', stroke: color, 'stroke-width': o.w || 6, 'stroke-dasharray': o.dash || '22 18', 'stroke-linecap': 'round', opacity: o.opacity ?? 1 }, o.parent || sc.back);
    DYN.push(t => c.setAttribute('transform', `rotate(${(t * speed).toFixed(2)} ${cx} ${cy})`));
    return c;
  }

  // ---------------------------------------------------------------- captions
  /* groups: [{ ids, theme, keys: {wordIndex: 'k'|'h'|'x'} }]
     k: key word (highlighter)  h: the gentle way (thread underline)  x: don't (struck through) */
  function captions(groups) {
    groups.forEach((g, gi) => {
      const words = g.ids.flatMap(i => clause(i).words);
      const box = div(capsLayer, 'cap');
      const th = TH[g.theme];
      box.style.color = th.text;
      const spans = words.map((w, i) => {
        if (i) box.appendChild(document.createTextNode(' '));
        const s = div(box, 'w');
        const kind = g.keys[i];
        let deco = null;
        const t = document.createElement('div');
        t.className = 't';
        t.textContent = w.w;
        if (kind === 'k') {
          if (g.theme === 'cream') { deco = div(s, 'hl', { background: C.mari }); }
          else if (g.theme === 'mari') { deco = div(s, 'hl', { background: C.warm }); }
          else t.style.color = C.mari;
        } else if (kind === 'h') {
          const col = g.theme === 'cream' || g.theme === 'mari' ? C.green : C.mari;
          if (g.theme === 'cream' || g.theme === 'mari') t.style.color = C.green;
          deco = div(s, 'ul', { background: `repeating-linear-gradient(90deg, ${col} 0 15px, transparent 15px 24px)` });
        } else if (kind === 'x') {
          t.style.opacity = 0.72;
          deco = div(s, 'st', { background: g.theme === 'cream' || g.theme === 'mari' ? C.ink : C.warm });
        }
        s.appendChild(t);
        return { s, deco, w };
      });
      const start = words[0].s - 0.08;
      const next = groups[gi + 1] ? clause(groups[gi + 1].ids[0]).start : 999;
      // leave before the next line pops in at the same spot
      const endT = Math.min(words[words.length - 1].e + 0.35, next - 0.22, g.until ?? 999);
      gsap.set(box, { opacity: 0 });
      tl.set(box, { opacity: 1, y: 0 }, start);
      spans.forEach(({ s, deco, w }) => {
        tl.fromTo(s, { opacity: 0, y: 26, scale: 0.84 }, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'back.out(2.4)' }, w.s - 0.05);
        if (deco) tl.fromTo(deco, { scaleX: 0 }, { scaleX: 1, duration: 0.24, ease: 'power2.out' }, w.s + 0.03);
      });
      tl.to(box, { opacity: 0, y: -12, duration: 0.12, ease: 'power2.in' }, endT);
    });
  }

  // ---------------------------------------------------------------- finish
  function finish(length) {
    function seek(t) {
      tl.seek(t, true);
      for (const s of scenes) s.el.style.display = t >= s.win[0] && t < s.win[1] ? '' : 'none';
      applyTransitions(t);
      for (const f of DYN) f(t);
      for (const s of scenes) if (s.el.style.display !== 'none' && s.em.length) drawEmitters(s.em, s.fx.ctx, t);
      drawEmitters(overEm, overFx.ctx, t);
      const [x, y, r] = shakeAt(t);
      world.style.transform = x || y ? `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg)` : '';
    }
    window.TL = tl;
    window.CUES = CUES.sort((a, b) => a.t - b.t);
    window.DURATION = length;
    window.seek = seek;
    seek(0);
    window.READY = true;
  }

  return {
    C, TH, tl, P, DYN, cue, clamp, lerp, seg, ease, rng, R, clause, cs, ce, W, T, div, S, fullSvg, id, drawable, drawOn,
    scene, drift, FX, shake, trans, chip, headline, label, stampNo, badgeOk, ring, captions, finish, PETAL, world, over,
  };
};
