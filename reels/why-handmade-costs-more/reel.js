/* Why Handmade Costs More: 36 s, 1080x1920.
   Every frame is a pure function of time: window.seek(t) poses the whole reel.
   GSAP tweens the authored motion; renderDynamic() draws what is computed
   (conveyor, counters, the stitch line, clip reveals). Sound cues are
   collected in window.CUES so the audio mix lands on the same frames. */
(async () => {
  const C = {
    cream: '#F3EDE3', shade: '#E8DFD1', ink: '#1A1917', warm: '#FCF8F0', green: '#136207',
    mari: '#F2B01E', lint: '#87837D', fabric: '#F7F3EC', vein: '#D39A12', untouched: '#D3CDC3',
  };
  const NS = 'http://www.w3.org/2000/svg';
  const stage = document.getElementById('stage');
  const tl = gsap.timeline({ paused: true });
  const P = {}; // proxies tweened by GSAP and read by renderDynamic
  const CUES = [];
  const cue = (type, t, o = {}) => CUES.push({ type, t: +t.toFixed(3), ...o });

  const clause = id => VO.find(c => c.id === id);
  const ws = (id, i) => clause(id).words[i].s;
  const we = (id, i) => clause(id).words[i].e;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, f) => a + (b - a) * f;
  const ease3 = f => (f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2);
  const out3 = f => 1 - Math.pow(1 - f, 3);

  await Promise.all([
    document.fonts.load('900 100px Montserrat'), document.fonts.load('600 100px Montserrat'),
    document.fonts.load('italic 500 100px Playfair'), document.fonts.load('italic 400 100px Playfair'),
    document.fonts.load('800 100px Montserrat', '₹'),
  ]);

  // Baseline placement: CSS centres the font's content box in the line box,
  // so with line-height = font-size the baseline sits at a fixed fraction.
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

  // ---------- builders ----------
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
      if (o.ls) e.style.paddingLeft = o.ls + 'em'; // trailing tracking would pull the line left
    } else if (align === 'left') e.style.left = o.x + 'px';
    else Object.assign(e.style, { left: o.x - 3000 + 'px', width: '3000px', textAlign: 'right' });

    e.words = [];
    if (!o.split) { e.textContent = text; return e; }
    text.split(' ').forEach((word, i) => {
      if (i) e.appendChild(document.createTextNode(' '));
      let host = e;
      if (o.mask) {
        host = div(e, 'mask');
        Object.assign(host.style, { padding: '0.1em 0.06em 0.14em', margin: '-0.1em -0.06em -0.14em' });
      }
      const w = div(host, 'w');
      if (o.split === 'chars') {
        w.chars = [...word].map(ch => { const c = div(w, 'ch'); c.textContent = ch; return c; });
      } else w.textContent = word;
      e.words.push(w);
    });
    return e;
  }

  // a petal pointing up from the flower centre, base at y=-26, tip at y=-102
  const PETAL = 'M0,-26 C15,-34 18,-70 7,-94 Q0,-106 -7,-94 C-18,-70 -15,-34 0,-26 Z';
  function flower(parent, cx, cy, sc, n, o = {}) {
    const g = S('g', { transform: `translate(${cx},${cy}) scale(${sc})` }, parent);
    const spin = S('g', {}, g);
    const petals = [];
    for (let i = 0; i < n; i++) {
      const pg = S('g', { transform: `rotate(${(i * 360) / n})` }, spin);
      let outline = null;
      if (o.outline) outline = S('path', { d: PETAL, fill: 'none', stroke: o.outlineColor || '#9C978F', 'stroke-width': 1.6 / sc, 'stroke-dasharray': `${4 / sc} ${3.5 / sc}` }, pg);
      const fill = S('g', {}, pg);
      S('path', { d: PETAL, fill: o.color || C.mari }, fill);
      if (o.veins !== false) {
        for (const d of ['M0,-33 L0,-95', 'M-5,-38 Q-9,-62 -6,-88', 'M5,-38 Q9,-62 6,-88'])
          S('path', { d, fill: 'none', stroke: o.veinColor || C.vein, 'stroke-width': 1.7, 'stroke-linecap': 'round' }, fill);
      }
      petals.push({ g: pg, fill, outline });
    }
    const center = S('g', {}, spin);
    S('circle', { r: 31, fill: o.centerColor || C.ink }, center);
    if (o.dots !== false) {
      for (let k = 0; k < 19; k++) {
        const r = 5.1 * Math.sqrt(k + 0.5), a = k * 2.39996;
        S('circle', { cx: r * Math.cos(a), cy: r * Math.sin(a), r: 2.5, fill: o.dotColor || C.mari }, center);
      }
    }
    return { g, spin, petals, center };
  }

  function hoop(parent, cx, cy, r, sw, o = {}) {
    const g = S('g', { transform: `translate(${cx},${cy})` }, parent);
    const inner = S('g', {}, g);
    S('circle', { r: r - sw / 2, fill: o.fabric || C.fabric }, inner);
    S('circle', { r: r - sw / 2 - r * 0.045, fill: 'none', stroke: o.innerRing || '#ABA59C', 'stroke-width': Math.max(2, sw * 0.2) }, inner);
    const content = S('g', {}, inner);
    S('circle', { r, fill: 'none', stroke: o.ring || C.ink, 'stroke-width': sw }, inner);
    S('rect', { x: -r * 0.1, y: -r - sw * 1.9, width: r * 0.2, height: sw * 2.2, rx: sw * 0.45, fill: o.ring || C.ink }, inner);
    return { g, inner, content };
  }

  const NEEDLE = 'M0,0 L122,-4.8 A4.8,4.8 0 0 1 122,4.8 Z';
  function needle(parent, color, eye) {
    const g = S('g', {}, parent);
    S('path', { d: NEEDLE, fill: color }, g);
    S('ellipse', { cx: 111, cy: 0, rx: 8, ry: 2.1, fill: eye }, g);
    return g;
  }

  function drawable(el) {
    const len = el.getTotalLength();
    el.setAttribute('stroke-dasharray', `${len} ${len}`);
    el.setAttribute('stroke-dashoffset', len);
    return len;
  }

  // ---------- grounds and layers (bottom to top) ----------
  div(stage, 'layer cream');
  const lc = div(stage, 'layer');            // cream scenes
  const stitchSvgCream = fullSvg(div(stage, 'layer'));
  const s5top = div(stage, 'dark', { position: 'absolute', left: 0, top: 0, width: '1080px', height: '700px' });
  const s1 = div(stage, 'layer dark');
  const gl = div(stage, 'layer green');
  const fx = fullSvg(div(stage, 'layer'));
  const caps = div(stage, '', {}); caps.id = 'caps';

  // =========================================================
  // S1  0.0 – 5.85   the machine: hook, then "8 seconds"
  // =========================================================
  const s1svg = fullSvg(s1);
  const belt = S('g', {}, s1svg);
  S('line', { x1: 0, x2: 1080, y1: 1174, y2: 1174, stroke: '#77736D', 'stroke-width': 4 }, belt);
  const beltTicks = [];
  for (let i = 0; i < 16; i++) beltTicks.push(S('line', { y1: 1182, y2: 1200, stroke: '#77736D', 'stroke-width': 4, 'stroke-linecap': 'round' }, belt));
  const SHIRT = 'M48,0 Q95,24 142,0 L190,24 L172,66 L150,57 L150,160 L40,160 L40,57 L18,66 L0,24 Z';
  const shirts = [];
  for (let k = 0; k < 7; k++) {
    const g = S('g', {}, s1svg);
    S('path', { d: SHIRT, fill: C.lint }, g);
    S('rect', { x: 71, y: 52, width: 48, height: 48, rx: 2, fill: '#1E1D1B' }, g);
    shirts.push(g);
  }
  const STEP = 0.5, MOVE = 0.22, PITCH = 212;
  for (let n = 0; n * STEP + MOVE < 5.6; n++) cue('clack', n * STEP + MOVE);

  const hook = div(s1, 'layer');
  const hk1 = T(hook, 'Ever wondered why', { fam: 'p', size: 74, wt: 400, y: 585, color: C.warm, split: 'words', mask: true });
  const hk2 = T(hook, 'HANDMADE', { size: 142, wt: 900, y: 745, color: C.warm, split: 'words', mask: true });
  const hk3 = T(hook, 'COSTS MORE?', { size: 112, wt: 900, y: 885, color: C.mari, split: 'words', mask: true });
  const hookWords = [...hk1.words, ...hk2.words, ...hk3.words];
  hookWords.forEach((w, i) => {
    tl.fromTo(w, { yPercent: 115 }, { yPercent: 0, duration: 0.42, ease: i === 3 ? 'back.out(1.7)' : 'power3.out' }, ws('hook', i) - 0.05);
  });
  cue('thud', ws('hook', 3));
  tl.fromTo(hook, { scale: 1 }, { scale: 1.045, duration: 2.6, ease: 'none', transformOrigin: '540px 740px' }, 0);
  tl.to(hook, { y: -80, opacity: 0, duration: 0.32, ease: 'power2.in' }, 2.55);

  const lab1 = T(s1, 'A PRINTED T-SHIRT TAKES', { size: 36, wt: 600, ls: 0.3, color: C.lint, y: 318 });
  tl.fromTo(lab1, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 2.8);
  const big8 = T(s1, '', { size: 590, wt: 900, y: 772, color: C.warm });
  const sec = T(s1, 'SECONDS', { size: 128, wt: 900, y: 918, color: C.warm, split: 'words', mask: true });
  tl.fromTo(sec.words[0], { yPercent: 110 }, { yPercent: 0, duration: 0.4, ease: 'power3.out' }, ws('print', 7) - 0.03);
  const COUNT0 = 2.95, COUNT8 = ws('print', 6), COUNT_STEP = (COUNT8 - COUNT0) / 7;
  for (let d = 1; d <= 7; d++) cue('tick', COUNT0 + (d - 1) * COUNT_STEP, { n: d });
  cue('slam', COUNT8);

  P.wipe = 0;
  tl.to(P, { wipe: 1, duration: 0.5, ease: 'power3.inOut' }, 5.38);
  cue('whoosh', 5.36);
  const hem = S('line', { x1: -20, x2: 1100, y1: 0, y2: 0, stroke: C.green, 'stroke-width': 9, 'stroke-dasharray': '36 24', 'stroke-linecap': 'round' }, fx);

  // =========================================================
  // Stitch line ("still stitching"): the reel's progress bar, S2 – S7
  // =========================================================
  function stitchLine(svg, theme) {
    const g = S('g', {}, svg);
    const onGreen = theme === 'green';
    const base = [], top = [];
    for (let i = 0; i < 14; i++) {
      const x1 = 87 + i * 62;
      base.push(S('line', { x1, x2: x1 + 37, y1: 1190, y2: 1190, stroke: onGreen ? 'rgba(252,248,240,.25)' : C.untouched, 'stroke-width': 10, 'stroke-linecap': 'round' }, g));
      top.push(S('line', { x1, x2: x1, y1: 1190, y2: 1190, stroke: onGreen ? C.warm : C.green, 'stroke-width': 10, 'stroke-linecap': 'round' }, g));
    }
    const nd = needle(g, onGreen ? C.warm : C.ink, onGreen ? '#176a0b' : '#ECE5DA');
    const label = S('text', { y: 1238, 'text-anchor': 'middle', fill: onGreen ? 'rgba(252,248,240,.92)' : '#55524D', style: 'font: italic 400 36px Playfair' }, g);
    label.textContent = 'still stitching';
    return { g, top, nd, label };
  }
  const stCream = stitchLine(stitchSvgCream, 'cream');
  P.stitch = 0;
  function stitchTo(n, t, dur = 0.5) {
    tl.to(P, { stitch: n, duration: dur, ease: 'power1.inOut' }, t);
    cue('stitch', t + dur * 0.55);
  }

  // =========================================================
  // S2  5.6 – 8.9   "This one is stitched by hand."
  // =========================================================
  const s2 = div(lc, 'layer');
  const s2lab = T(s2, 'THIS ONE IS STITCHED', { size: 36, wt: 600, ls: 0.3, y: 326, split: 'chars' });
  s2lab.words.forEach((w, i) => {
    const t0 = ws('hand1', i), dur = Math.max(0.2, we('hand1', i) - t0);
    w.chars.forEach((c, j) => tl.fromTo(c, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, t0 + (j * dur) / w.chars.length));
  });
  const byhand = T(s2, 'by hand.', { fam: 'p', size: 250, wt: 500, y: 572, split: 'words' });
  byhand.words.forEach((w, i) => {
    tl.fromTo(w, { clipPath: 'inset(-30% 114% -45% -14%)', y: 14 },
      { clipPath: 'inset(-30% -14% -45% -14%)', y: 0, duration: i ? 0.6 : 0.4, ease: 'power2.inOut' }, ws('hand2', i) - 0.06);
  });

  const s2svg = fullSvg(s2);
  const TEE = 'M435,673 Q540,757 645,673 L764,727 L800,845 L712,877 L694,832 L694,1131 L386,1131 L386,832 L368,877 L280,845 L316,727 Z';
  const teeFill = S('path', { d: TEE, fill: C.fabric, opacity: 0 }, s2svg);
  const fl2 = flower(s2svg, 540, 838, 1.0, 16, { outline: true });
  const tee = S('path', { d: TEE, fill: 'none', stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, s2svg);
  const teeLen = drawable(tee);
  tl.to(tee, { attr: { 'stroke-dashoffset': 0 }, duration: 0.9, ease: 'power2.inOut' }, 5.62);
  tl.to(teeFill, { opacity: 1, duration: 0.4 }, 6.0);
  fl2.petals.forEach((p, i) => {
    gsap.set(p.fill, { scale: 0, transformOrigin: '50% 100%' });
    tl.fromTo(p.outline, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 6.25 + i * 0.02);
  });
  gsap.set(fl2.center, { scale: 0, transformOrigin: '50% 50%' });
  tl.to(fl2.center, { scale: 1, duration: 0.35, ease: 'back.out(2)' }, 6.3);
  const SEW_START = 6.5, SEW_GAP = 0.24, SEW_N = 9;
  for (let i = 0; i < SEW_N; i++) tl.to(fl2.petals[i].fill, { scale: 1, duration: 0.3, ease: 'back.out(1.4)' }, SEW_START + i * SEW_GAP);
  P.sew = 0;
  tl.to(P, { sew: SEW_N, duration: SEW_N * SEW_GAP, ease: 'none' }, SEW_START - 0.1);
  const sewG = S('g', {}, s2svg);
  const sewThread = S('path', { fill: 'none', stroke: C.mari, 'stroke-width': 4, 'stroke-linecap': 'round' }, sewG);
  const sewNeedle = needle(sewG, C.ink, C.fabric);
  gsap.set(sewG, { opacity: 0 });
  tl.to(sewG, { opacity: 1, duration: 0.25 }, 6.35);
  stitchTo(1, 6.3, 0.6);
  tl.fromTo(s2, { scale: 1 }, { scale: 1.025, duration: 3.3, ease: 'none', transformOrigin: '540px 760px' }, 5.6);
  tl.to([s2lab, byhand], { y: '-=50', opacity: 0, duration: 0.32, ease: 'power2.in', stagger: 0.05 }, 8.52);
  tl.to(s2svg, { y: -60, opacity: 0, duration: 0.34, ease: 'power2.in' }, 8.58);

  // =========================================================
  // S3  8.8 – 16.8   three clocks
  // =========================================================
  const s3 = div(lc, 'layer');
  const t3a = T(s3, 'SAME T-SHIRT.', { size: 78, wt: 900, y: 348, split: 'words', mask: true });
  const t3b = T(s3, 'three clocks.', { fam: 'p', size: 90, wt: 500, y: 442, split: 'words' });
  t3a.words.forEach((w, i) => tl.fromTo(w, { yPercent: 110 }, { yPercent: 0, duration: 0.4, ease: 'power3.out' }, 8.82 + i * 0.12));
  t3b.words.forEach((w, i) => tl.fromTo(w, { clipPath: 'inset(-30% 110% -40% -10%)' }, { clipPath: 'inset(-30% -10% -40% -10%)', duration: 0.45, ease: 'power2.inOut' }, 9.05 + i * 0.22));

  const s3svg = fullSvg(s3);
  // row 1: printed
  const r1l = T(s3, 'PRINTED', { size: 34, wt: 600, ls: 0.3, color: C.lint, x: 90, y: 532, align: 'left' });
  const r1w = T(s3, 'SECONDS', { size: 94, wt: 900, x: 86, y: 619, align: 'left', split: 'words', mask: true });
  const track1 = S('rect', { x: 90, y: 657, width: 900, height: 30, rx: 15, fill: '#DDD6CB' }, s3svg);
  const bar1 = S('rect', { x: 90, y: 657, width: 0, height: 30, rx: 15, fill: C.lint }, s3svg);
  const CHECK = 'M-19,1 L-6,14 L19,-13';
  const chk1 = S('path', { d: CHECK, transform: 'translate(965,590)', fill: 'none', stroke: C.ink, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s3svg);
  drawable(chk1);
  tl.fromTo(track1, { opacity: 0 }, { opacity: 1, duration: 0.3 }, ws('c1', 0));
  tl.fromTo(r1l, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }, ws('c1', 0));
  tl.fromTo(r1w.words[0], { yPercent: 110 }, { yPercent: 0, duration: 0.35, ease: 'power3.out' }, ws('c1', 1) - 0.04);
  tl.to(bar1, { attr: { width: 900 }, duration: 0.3, ease: 'power4.out' }, ws('c1', 1));
  cue('zip', ws('c1', 1));
  tl.to(chk1, { attr: { 'stroke-dashoffset': 0 }, duration: 0.22, ease: 'power2.out' }, ws('c1', 1) + 0.3);
  cue('check', ws('c1', 1) + 0.32);

  // row 2: machine embroidered
  const r2l = T(s3, 'MACHINE EMBROIDERED', { size: 34, wt: 600, ls: 0.3, color: C.lint, x: 90, y: 762, align: 'left' });
  const r2w = T(s3, 'MINUTES', { size: 94, wt: 900, x: 86, y: 850, align: 'left', split: 'words', mask: true });
  const track2 = S('rect', { x: 90, y: 887, width: 900, height: 30, rx: 15, fill: '#DDD6CB' }, s3svg);
  const clip2 = S('clipPath', { id: 'clip2' }, s3svg);
  const clip2r = S('rect', { x: 90, y: 880, width: 0, height: 44 }, clip2);
  const bar2 = S('g', { 'clip-path': 'url(#clip2)' }, s3svg);
  S('rect', { x: 90, y: 887, width: 900, height: 30, rx: 15, fill: C.lint }, bar2);
  for (let x = 110; x < 975; x += 14.4) S('line', { x1: x, x2: x, y1: 894, y2: 910, stroke: '#ECE6DC', 'stroke-width': 3 }, bar2);
  const r2s = T(s3, '1,000+ stitches a minute', { size: 30, wt: 500, color: C.lint, x: 90, y: 958, align: 'left' });
  const chk2 = S('path', { d: CHECK, transform: 'translate(965,820)', fill: 'none', stroke: C.ink, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s3svg);
  drawable(chk2);
  tl.fromTo(track2, { opacity: 0 }, { opacity: 1, duration: 0.3 }, ws('c2', 0));
  tl.fromTo(r2l, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }, ws('c2', 0));
  tl.to(clip2r, { attr: { width: 900 }, duration: 1.25, ease: 'power1.inOut' }, ws('c2', 1));
  cue('machine', ws('c2', 1), { dur: 1.25 });
  tl.fromTo(r2w.words[0], { yPercent: 110 }, { yPercent: 0, duration: 0.35, ease: 'power3.out' }, ws('c2', 2) - 0.04);
  tl.fromTo(r2s, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, ws('c2', 2) + 0.15);
  tl.to(chk2, { attr: { 'stroke-dashoffset': 0 }, duration: 0.22, ease: 'power2.out' }, ws('c2', 1) + 1.27);
  cue('check', ws('c2', 1) + 1.29);

  // row 3: hand embroidered (no tick: it is still going)
  const r3l = T(s3, 'HAND EMBROIDERED', { size: 31, wt: 600, ls: 0.3, color: C.green, x: 92, y: 1080, align: 'left', split: 'chars' });
  const r3chars = r3l.words.flatMap(w => w.chars);
  r3chars.forEach((c, j) => tl.fromTo(c, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.18 }, ws('c3', 0) + (j * (we('c3', 1) - ws('c3', 0))) / r3chars.length));
  const r3w = T(s3, 'hours.', { fam: 'p', size: 128, wt: 500, color: C.green, x: 992, y: 1112, align: 'right', split: 'words' });
  tl.fromTo(r3w.words[0], { clipPath: 'inset(-30% 112% -40% -12%)' }, { clipPath: 'inset(-30% -12% -40% -12%)', duration: 0.85, ease: 'power2.inOut' }, ws('c3b', 0) - 0.05);
  stitchTo(2, ws('c4', 0) + 0.05, 0.5);
  stitchTo(3, ws('c4', 2), 0.5);
  tl.fromTo(s3, { scale: 1 }, { scale: 1.02, duration: 8, ease: 'none', transformOrigin: '540px 700px' }, 8.8);
  tl.to(s3, { y: -50, opacity: 0, duration: 0.34, ease: 'power2.in' }, 16.62);

  // =========================================================
  // S4  16.8 – 20.0   25+ years in her fingers
  // =========================================================
  const s4 = div(lc, 'layer');
  const t4l = T(s4, 'SUNITA DADI  ·  FLORAL WORK', { size: 35, wt: 600, ls: 0.3, color: C.lint, y: 306 });
  tl.fromTo(t4l, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45 }, 16.92);
  const s4svg = fullSvg(s4);
  const tickRing = S('g', { transform: 'translate(540,640)' }, s4svg);
  const tickSpin = S('g', {}, tickRing);
  const ticks = [];
  for (let i = 0; i < 25; i++) {
    const a = (-90 + (i * 360) / 25) * Math.PI / 180;
    const l = S('line', { x1: 258 * Math.cos(a), y1: 258 * Math.sin(a), x2: 293 * Math.cos(a), y2: 293 * Math.sin(a), stroke: C.green, 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0 }, tickSpin);
    ticks.push(l);
  }
  const h4 = hoop(s4svg, 540, 640, 215, 16);
  gsap.set(h4.inner, { scale: 0.6, opacity: 0, transformOrigin: '50% 50%' });
  tl.to(h4.inner, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.5)' }, 16.85);
  cue('pop', 16.9);
  const stem = S('path', { d: 'M0,60 C-3,100 -14,135 -11,188', fill: 'none', stroke: C.green, 'stroke-width': 9, 'stroke-linecap': 'round' }, h4.content);
  drawable(stem);
  const LEAF = 'M0,0 C12,-24 40,-32 56,-27 C46,-6 24,8 0,0 Z';
  const leaves = [['translate(-2,86) rotate(-28)'], ['translate(-9,146) rotate(208)']].map(([tr]) => {
    const g = S('g', { transform: tr }, h4.content);
    const inner = S('g', {}, g);
    S('path', { d: LEAF, fill: C.green }, inner);
    S('path', { d: 'M4,-2 C20,-14 36,-20 50,-25', fill: 'none', stroke: '#E9F0E0', 'stroke-width': 1.6, opacity: 0.7 }, inner);
    gsap.set(inner, { scale: 0, transformOrigin: '0% 100%' });
    return inner;
  });
  const fl4 = flower(h4.content, 0, -30, 1.03, 16);
  fl4.petals.forEach((p, i) => {
    gsap.set(p.fill, { scale: 0, transformOrigin: '50% 100%' });
    tl.to(p.fill, { scale: 1, duration: 0.32, ease: 'back.out(1.6)' }, 17.12 + i * 0.045);
  });
  gsap.set(fl4.center, { scale: 0, transformOrigin: '50% 50%' });
  tl.to(fl4.center, { scale: 1, duration: 0.35, ease: 'back.out(2)' }, 17.05);
  tl.to(stem, { attr: { 'stroke-dashoffset': 0 }, duration: 0.5, ease: 'power2.out' }, 17.3);
  leaves.forEach((l, i) => tl.to(l, { scale: 1, duration: 0.35, ease: 'back.out(2)' }, 17.65 + i * 0.15));

  const YEAR0 = 17.36, YEAR_GAP = (ws('years', 4) - 0.1 - YEAR0) / 24;
  P.years = 0;
  ticks.forEach((l, i) => {
    tl.fromTo(l, { opacity: 0 }, { opacity: 1, duration: 0.08 }, YEAR0 + i * YEAR_GAP);
    cue('yeartick', YEAR0 + i * YEAR_GAP, { i });
  });
  tl.to(P, { years: 25, duration: 24 * YEAR_GAP, ease: 'none' }, YEAR0);
  const yl = div(s4, 'tx m');
  Object.assign(yl.style, { fontSize: '136px', lineHeight: '136px', fontWeight: 900, color: C.ink, left: '-960px', width: '3000px', textAlign: 'center', top: 1037 - 136 * METRICS.m + 'px' });
  yl.innerHTML = '<span class="num w">25</span><span class="plus w">+</span> <span class="mask"><span class="yw w">YEARS</span></span>';
  const yNum = yl.querySelector('.num'), yPlus = yl.querySelector('.plus'), yWord = yl.querySelector('.yw');
  Object.assign(yNum.style, { width: yNum.getBoundingClientRect().width + 'px', textAlign: 'right' });
  // count centred on the hoop, then make room for "+ YEARS"
  const yr = yNum.getBoundingClientRect();
  gsap.set(yNum, { opacity: 0 });
  tl.fromTo(yl, { x: 540 - (yr.left + yr.width / 2) }, { x: 0, duration: 0.4, ease: 'power3.inOut' }, ws('years', 4) - 0.2);
  tl.to(yNum, { opacity: 1, duration: 0.1 }, YEAR0);
  tl.fromTo(yPlus, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }, ws('years', 4) - 0.08);
  tl.fromTo(yWord, { yPercent: 110 }, { yPercent: 0, duration: 0.38, ease: 'power3.out' }, ws('years', 4));
  cue('thud', ws('years', 4) - 0.05, { soft: true });
  const t4f = T(s4, 'in her fingers.', { fam: 'p', size: 74, wt: 500, y: 1103, split: 'words' });
  t4f.words.forEach((w, i) => tl.fromTo(w, { clipPath: 'inset(-30% 112% -40% -12%)' }, { clipPath: 'inset(-30% -12% -40% -12%)', duration: 0.4, ease: 'power2.inOut' }, ws('years', 5 + i) - 0.04));
  stitchTo(4, 17.6, 0.45);
  stitchTo(5, 18.35, 0.45);
  stitchTo(6, 19.15, 0.45);
  tl.fromTo(s4, { scale: 1 }, { scale: 1.03, duration: 3.3, ease: 'none', transformOrigin: '540px 640px' }, 16.8);
  tl.to(s4, { opacity: 0, y: -40, duration: 0.3, ease: 'power2.in' }, 19.85);

  // =========================================================
  // S5  19.9 – 23.8   8 at once / one at a time
  // =========================================================
  gsap.set(s5top, { yPercent: -100 });
  tl.to(s5top, { yPercent: 0, duration: 0.45, ease: 'power3.out' }, 19.88);
  cue('whoosh', 19.86);
  const t5a = T(s5top, 'MACHINE', { size: 33, wt: 600, ls: 0.3, color: C.lint, y: 315 });
  tl.fromTo(t5a, { opacity: 0 }, { opacity: 1, duration: 0.3 }, ws('mach', 1));
  const t5b = T(s5top, '8 AT ONCE', { size: 82, wt: 900, color: C.warm, y: 391, split: 'words', mask: true });
  t5b.words.forEach((w, i) => tl.fromTo(w, { yPercent: 110 }, { yPercent: 0, duration: 0.32, ease: 'power3.out' }, ws('mach', 3 + i) - 0.04));
  const s5svg = S('svg', { class: 'full', viewBox: '0 0 1080 700', width: 1080, height: 700, style: 'height:700px' }, s5top);
  const machHoops = [];
  for (const y of [483, 617]) for (const x of [165, 415, 665, 915]) {
    const h = hoop(s5svg, x, y, 43, 7, { ring: C.lint, fabric: '#2A2927', innerRing: '#3E3C39' });
    const f = flower(h.content, 0, 0, 0.29, 12, { color: '#7C7872', veins: false, centerColor: '#3A3835', dots: false });
    gsap.set(h.inner, { scale: 0, transformOrigin: '50% 50%' });
    tl.to(h.inner, { scale: 1, duration: 0.3, ease: 'back.out(2)' }, 20.42);
    machHoops.push({ h, f });
  }
  cue('clunk', 20.42);
  cue('machine', 20.62, { dur: 2.8 });

  const s5b = div(lc, 'layer');
  const t5c = T(s5b, 'BY HAND', { size: 35, wt: 600, ls: 0.3, color: C.green, y: 757 });
  const s5bsvg = fullSvg(s5b);
  const h5 = hoop(s5bsvg, 540, 885, 98, 13);
  const fl5 = flower(h5.content, 0, -4, 0.63, 16, { outline: true, outlineColor: '#A39E96' });
  fl5.petals.forEach((p, i) => gsap.set(p.fill, { scale: i < 5 ? 1 : 0, transformOrigin: '50% 100%' }));
  tl.to(fl5.petals[5].fill, { scale: 1, duration: 1.5, ease: 'power1.inOut' }, 20.75);
  tl.to(fl5.petals[6].fill, { scale: 1, duration: 1.2, ease: 'power1.inOut' }, 22.4);
  gsap.set([t5c, h5.inner], { opacity: 0 });
  gsap.set(h5.inner, { scale: 0.85, transformOrigin: '50% 50%' });
  tl.to(t5c, { opacity: 1, duration: 0.4 }, 20.55);
  tl.to(h5.inner, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, 20.55);
  const t5d = T(s5b, 'one at a time.', { fam: 'p', size: 104, wt: 500, y: 1093, split: 'words' });
  t5d.words.forEach((w, i) => tl.fromTo(w, { clipPath: 'inset(-30% 112% -40% -12%)' }, { clipPath: 'inset(-30% -12% -40% -12%)', duration: 0.42, ease: 'power2.inOut' }, ws('one', 2) - 0.05 + i * 0.17));
  stitchTo(7, 21.0, 0.7);
  stitchTo(8, 22.45, 0.7);
  tl.to(s5top, { yPercent: -100, duration: 0.4, ease: 'power3.in' }, 23.42);
  cue('whoosh', 23.4, { soft: true });
  tl.to(s5b, { opacity: 0, y: -40, duration: 0.32, ease: 'power2.in' }, 23.45);

  // =========================================================
  // S6  23.8 – 26.6   paid fairly for every hour
  // =========================================================
  const s6 = div(lc, 'layer');
  const t6a = T(s6, 'AND SHE IS', { size: 36, wt: 600, ls: 0.3, color: C.lint, y: 326, split: 'words' });
  t6a.words.forEach((w, i) => tl.fromTo(w, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25 }, ws('paid', i) - 0.03));
  const t6b = T(s6, 'PAID', { size: 128, wt: 900, y: 447, split: 'words', mask: true });
  const t6c = T(s6, 'FAIRLY', { size: 128, wt: 900, y: 560, split: 'words', mask: true });
  tl.fromTo(t6b.words[0], { yPercent: 110 }, { yPercent: 0, duration: 0.36, ease: 'power3.out' }, ws('paid', 3) - 0.04);
  tl.fromTo(t6c.words[0], { yPercent: 110 }, { yPercent: 0, duration: 0.36, ease: 'power3.out' }, ws('paid', 4) - 0.04);
  const t6d = T(s6, 'for every hour.', { fam: 'p', size: 98, wt: 500, color: C.green, y: 678, split: 'words' });
  t6d.words.forEach((w, i) => tl.fromTo(w, { clipPath: 'inset(-30% 112% -40% -12%)' }, { clipPath: 'inset(-30% -12% -40% -12%)', duration: 0.38, ease: 'power2.inOut' }, ws('paid', 5 + i) - 0.04));

  const s6svg = fullSvg(s6);
  const clip6 = S('clipPath', { id: 'clip6' }, s6svg);
  const clip6r = S('rect', { x: 40, y: 830, width: 0, height: 50 }, clip6);
  S('line', { x1: 57, x2: 1022, y1: 855, y2: 855, stroke: C.green, 'stroke-width': 8, 'stroke-dasharray': '34 22', 'stroke-linecap': 'round', 'clip-path': 'url(#clip6)' }, s6svg);
  const COIN0 = 24.95, COIN_GAP = 0.24;
  for (let i = 0; i < 6; i++) {
    const x = 165 + i * 150;
    const g = S('g', { transform: `translate(${x},855)` }, s6svg);
    const inner = S('g', {}, g);
    S('circle', { r: 55, fill: C.mari, stroke: C.ink, 'stroke-width': 6 }, inner);
    const rs = S('text', { 'text-anchor': 'middle', y: 24, fill: C.ink, style: 'font: 800 68px Montserrat' }, inner);
    rs.textContent = '₹';
    const lb = S('text', { 'text-anchor': 'middle', y: 103, fill: C.lint, style: 'font: 600 23px Montserrat; letter-spacing: 4px' }, g);
    lb.textContent = `HOUR ${i + 1}`;
    gsap.set(inner, { scale: 0, transformOrigin: '50% 50%' });
    const tc = COIN0 + i * COIN_GAP;
    tl.to(inner, { scale: 1, duration: 0.36, ease: 'back.out(2.4)' }, tc);
    tl.fromTo(rs, { rotation: -40, transformOrigin: '50% 60%' }, { rotation: 0, duration: 0.4, ease: 'back.out(2)' }, tc);
    tl.fromTo(lb, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 }, tc + 0.08);
    tl.to(clip6r, { attr: { width: x + 80 - 40 }, duration: COIN_GAP, ease: 'none' }, tc - COIN_GAP + 0.05);
    cue('coin', tc + 0.03, { i });
  }
  tl.to(clip6r, { attr: { width: 1000 }, duration: 0.2 }, COIN0 + 6 * COIN_GAP);
  const t6e = T(s6, 'WOMEN ARTISANS  ·  BULANDSHAHR, INDIA', { size: 29, wt: 600, ls: 0.3, color: C.lint, y: 1042 });
  tl.fromTo(t6e, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45 }, 26.0);
  stitchTo(9, 24.3, 0.45);
  stitchTo(10, 25.15, 0.45);
  stitchTo(11, 25.95, 0.45);
  tl.fromTo(s6, { scale: 1 }, { scale: 1.02, duration: 3, ease: 'none', transformOrigin: '540px 700px' }, 23.7);

  // =========================================================
  // S7  26.45 – 31.1   you're paying for her time (green)
  // =========================================================
  P.greenR = 0;
  P.collapse = 0;
  const GREEN_C = [87 + 11 * 62 - 3, 1183];
  tl.to(P, { greenR: 2300, duration: 0.62, ease: 'power2.in' }, 26.45);
  cue('bloom', 26.45);
  const gContent = div(gl, 'layer');
  const stGreen = stitchLine(fullSvg(gContent), 'green');
  const t7a = T(gContent, 'You’re not paying for a T-shirt.', { fam: 'p', size: 64, wt: 400, color: C.warm, x: 94, y: 338, align: 'left', split: 'words' });
  t7a.words.forEach((w, i) => tl.fromTo(w, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, ws('not', i) - 0.04));
  const under = div(gContent, '', { position: 'absolute', left: '92px', top: '371px', width: '150px', height: '8px', borderRadius: '4px', background: C.mari, transformOrigin: '0 50%' });
  tl.fromTo(under, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'power2.out' }, 28.7);
  const BIG = [['YOU’RE', 540, C.warm], ['PAYING', 690, C.warm], ['FOR', 840, C.warm], ['HER', 990, C.mari], ['TIME.', 1140, C.mari]];
  BIG.forEach(([word, y, color], i) => {
    const e = T(gContent, word, { size: 164, wt: 900, color, x: 84, y, align: 'left', split: 'words', mask: true });
    const t0 = ws('time', i) - 0.05;
    tl.fromTo(e.words[0], { yPercent: 112 }, { yPercent: 0, duration: 0.32, ease: i >= 3 ? 'back.out(1.6)' : 'power4.out' }, t0);
    if (i >= 3) cue('thud', t0 + 0.05, { soft: i === 3 });
  });
  stitchTo(12, 27.3, 0.45);
  stitchTo(13, 28.35, 0.45);
  stitchTo(14, ws('time', 4) + 0.1, 0.45);

  // collapse the green into the end card's thread
  tl.to(P, { collapse: 1, duration: 0.55, ease: 'power3.inOut' }, 31.05);
  tl.to(gContent, { opacity: 0, duration: 0.25 }, 31.05);
  cue('threadpull', 31.0);

  // =========================================================
  // S8  31.05 – 36.0   end card
  // =========================================================
  const s8 = div(lc, 'layer');
  const s8svg = fullSvg(s8);
  const endLine = S('line', { y1: 762, y2: 762, stroke: C.green, 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0 }, s8svg);
  P.endLine = 0;
  tl.to(P, { endLine: 1, duration: 0.6, ease: 'power2.inOut' }, 31.6);
  const knot = S('path', { d: 'M896,762 C912,762 926,790 948,786 C972,781 966,748 944,746 C920,744 916,774 936,781 C950,786 962,782 968,780', fill: 'none', stroke: C.green, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s8svg);
  drawable(knot);
  tl.to(knot, { attr: { 'stroke-dashoffset': 0 }, duration: 0.42, ease: 'power2.inOut' }, 32.12);
  cue('knot', 32.5);
  const tail = S('path', { d: 'M968,780 L1006,791', fill: 'none', stroke: C.green, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0 }, s8svg);
  tl.to(tail, { opacity: 1, duration: 0.01 }, 32.5);
  tl.to(tail, { y: 46, rotation: 32, opacity: 0, duration: 0.55, ease: 'power2.in', transformOrigin: '0% 50%' }, 32.86);
  cue('snip', 32.84);

  const fl8 = flower(s8svg, 540, 403, 0.79, 16);
  fl8.petals.forEach((p, i) => {
    gsap.set(p.fill, { scale: 0, transformOrigin: '50% 100%' });
    tl.to(p.fill, { scale: 1, duration: 0.34, ease: 'back.out(1.8)' }, 31.68 + i * 0.035);
  });
  gsap.set(fl8.center, { scale: 0, transformOrigin: '50% 50%' });
  tl.to(fl8.center, { scale: 1, duration: 0.35, ease: 'back.out(2)' }, 31.6);
  const vee = T(s8, 'Vee Threads', { fam: 'p', size: 182, wt: 500, y: 688, split: 'words' });
  vee.words.forEach((w, i) => tl.fromTo(w, { clipPath: 'inset(-30% 112% -40% -12%)' }, { clipPath: 'inset(-30% -12% -40% -12%)', duration: i ? 0.65 : 0.45, ease: 'power2.inOut' }, 31.95 + i * 0.35));
  const tag = T(s8, 'Every Stitch Has a Story.', { fam: 'p', size: 66, wt: 400, y: 887 });
  tl.fromTo(tag, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 33.1);
  const loc8 = T(s8, 'HAND-EMBROIDERED IN BULANDSHAHR, INDIA', { size: 26, wt: 600, ls: 0.3, color: C.lint, y: 967 });
  tl.fromTo(loc8, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 33.45);
  const pill = div(s8, '', { position: 'absolute', left: '298px', top: '1026px', width: '484px', height: '101px', borderRadius: '51px', background: C.ink, color: C.warm, font: '700 46px Montserrat', lineHeight: '101px', textAlign: 'center' });
  pill.textContent = 'veethreads.com';
  tl.fromTo(pill, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' }, 33.85);
  cue('pop', 33.87);
  tl.to(pill, { scale: 1.04, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 34.9);

  // =========================================================
  // Captions: the voiceover, word by word. Where the screen already
  // spells the line out in full (hook, S7), the caption steps aside.
  // =========================================================
  const CAPS = [
    { ids: ['print'], dark: true, keys: { 1: 'k', 6: 'k', 7: 'k' } },
    { ids: ['hand1', 'hand2'], keys: { 4: 'h', 5: 'h' } },
    { ids: ['c1'], keys: { 1: 'k' } },
    { ids: ['c2'], keys: { 2: 'k' } },
    { ids: ['c3', 'c3b'], keys: { 0: 'h', 1: 'h', 2: 'h' } },
    { ids: ['c4'], keys: { 0: 'h', 1: 'h' } },
    { ids: ['years'], keys: { 3: 'k', 4: 'k', 6: 'h', 7: 'h' } },
    { ids: ['mach'], keys: { 3: 'k', 4: 'k', 5: 'k' } },
    { ids: ['one'], keys: { 2: 'h' } },
    { ids: ['paid'], keys: { 3: 'k', 4: 'k', 6: 'h', 7: 'h' } },
  ];
  CAPS.forEach((g, gi) => {
    const words = g.ids.flatMap(id => clause(id).words);
    const box = div(caps, 'cap');
    box.style.color = g.dark ? C.warm : C.ink;
    box.style.textWrap = 'balance';
    const spans = words.map((w, i) => {
      if (i) box.appendChild(document.createTextNode(' '));
      const s = div(box, 'w');
      const kind = g.keys[i];
      let hl = null, ul = null;
      if (kind === 'k' && !g.dark) hl = div(s, 'hl');
      if (kind === 'h') ul = div(s, 'ul');
      const t = div(s, 't');
      t.textContent = w.w;
      if (kind === 'k' && g.dark) t.style.color = C.mari;
      if (kind === 'h') t.style.color = C.green;
      return { s, hl, ul, w };
    });
    const start = words[0].s - 0.08;
    const next = CAPS[gi + 1] ? clause(CAPS[gi + 1].ids[0]).start : 99;
    const endT = Math.min(words[words.length - 1].e + 0.45, next - 0.16);
    gsap.set(box, { opacity: 0 });
    tl.set(box, { opacity: 1, y: 0 }, start);
    spans.forEach(({ s, hl, ul, w }) => {
      tl.fromTo(s, { opacity: 0, y: 26, scale: 0.86 }, { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: 'back.out(2.2)' }, w.s - 0.05);
      if (hl) tl.fromTo(hl, { scaleX: 0 }, { scaleX: 1, duration: 0.26, ease: 'power2.out' }, w.s + 0.02);
      if (ul) tl.fromTo(ul, { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'power2.out' }, w.s + 0.04);
    });
    tl.to(box, { opacity: 0, y: -14, duration: 0.2, ease: 'power2.in' }, endT);
  });

  // =========================================================
  // computed motion
  // =========================================================
  const windows = [
    [s1, 0, 5.95], [hook, 0, 2.9], [s2, 5.3, 8.95], [s3, 8.75, 17.0], [s4, 16.8, 20.3], [s5top, 19.8, 23.9],
    [s5b, 20.4, 23.85], [s6, 23.7, 27.2], [gl, 26.4, 31.62], [s8, 31.0, 99],
  ];
  function setStitch(st, p, t) {
    st.top.forEach((l, i) => {
      const f = clamp(p - i, 0, 1);
      l.setAttribute('x2', 87 + i * 62 + 37 * f);
      l.style.display = f > 0.02 ? '' : 'none';
    });
    const frac = p - Math.floor(p);
    const moving = frac > 0.001 && frac < 0.999;
    const dip = (moving ? 13 * Math.sin(Math.PI * frac) : 0) + 2.2 * Math.sin(t * 2.4);
    const rot = -22 + (moving ? 9 * Math.sin(Math.PI * frac) : 0);
    const tipX = 87 + p * 62 - 3;
    st.nd.setAttribute('transform', `translate(${tipX},${1183 + dip}) rotate(${rot})`);
    st.label.setAttribute('x', clamp(tipX - 35, 183, 793));
  }

  function renderDynamic(t) {
    for (const [el, a, b] of windows) el.style.display = t >= a && t < b ? '' : 'none';
    stitchSvgCream.style.display = t > 5.3 && t < 31.1 ? '' : 'none';

    // S1 conveyor: steps of one shirt every half second
    if (t < 6) {
      const u = t / STEP, n = Math.floor(u);
      const f = clamp(((u - n) * STEP) / MOVE, 0, 1);
      const shift = (n + ease3(f)) * PITCH;
      shirts.forEach((g, k) => {
        const x = (((k * PITCH - shift) % (7 * PITCH)) + 7 * PITCH) % (7 * PITCH) - PITCH + 21;
        g.setAttribute('transform', `translate(${x},1004)`);
        g.setAttribute('opacity', (0.3 + 0.6 * clamp((x + 95) / 1080, 0, 1)).toFixed(3));
      });
      beltTicks.forEach((l, i) => {
        const x = ((((i * 80 - shift) % 1280) + 1280) % 1280) - 100;
        l.setAttribute('x1', x + 5); l.setAttribute('x2', x - 7);
      });
      // the counter rolls 1..8 and lands on the spoken "eight"
      if (t < COUNT0) big8.textContent = '';
      else {
        const d = Math.min(8, 1 + Math.floor((t - COUNT0) / COUNT_STEP + 1e-6));
        const tChange = d === 8 ? COUNT8 : COUNT0 + (d - 1) * COUNT_STEP;
        const age = t - tChange;
        big8.textContent = String(d);
        big8.style.color = d === 8 ? C.warm : '#5E5B57';
        if (d === 8) {
          const k = clamp(age / 0.28, 0, 1);
          big8.style.transform = `scale(${1 + 0.14 * (1 - out3(k))})`;
          big8.style.opacity = 1;
        } else {
          const k = clamp(age / 0.1, 0, 1);
          big8.style.transform = `translateY(${36 * (1 - out3(k))}px) scale(0.86)`;
          big8.style.opacity = 0.35 + 0.65 * k;
        }
      }
      s1.style.clipPath = `inset(0 0 ${(P.wipe * 100).toFixed(3)}% 0)`;
      const hy = 1920 * (1 - P.wipe) + 12;
      hem.setAttribute('y1', hy); hem.setAttribute('y2', hy);
      hem.style.display = P.wipe > 0.001 && P.wipe < 0.999 ? '' : 'none';
    } else hem.style.display = 'none';

    setStitch(stCream, P.stitch, t);
    if (t > 26.3) setStitch(stGreen, P.stitch, t);

    // S2: the needle travels from petal to petal, trailing marigold thread
    if (t > 5.3 && t < 9) {
      const k = clamp(P.sew, 0, SEW_N - 0.001);
      const a = ((k * 22.5) - 90) * Math.PI / 180;
      const bob = Math.sin(Math.PI * (k % 1));
      const r = 108 + 10 * bob;
      const tx = 540 + r * Math.cos(a), ty = 838 + r * Math.sin(a);
      const rot = (k * 22.5) - 90 + 160 + 6 * bob;
      sewNeedle.setAttribute('transform', `translate(${tx},${ty}) rotate(${rot}) scale(0.72)`);
      const er = (rot * Math.PI) / 180;
      const ex = tx + 80 * Math.cos(er), ey = ty + 80 * Math.sin(er);
      sewThread.setAttribute('d', `M${ex},${ey} Q${ex + 40},${ey + 110} ${540 + 40 * Math.cos(a)},${838 + 40 * Math.sin(a)}`);
    }

    // S4: year counter and the slow turn of the tick ring
    if (t > 16.7 && t < 20.4) {
      yNum.textContent = String(Math.max(1, Math.min(25, Math.round(P.years))));
      tickSpin.setAttribute('transform', `rotate(${Math.max(0, t - 18.5) * 5})`);
    }

    // S5: eight machine hoops fill in lockstep, cycle after cycle
    if (t > 19.8 && t < 23.9) {
      const u = (t - 20.62) / 0.95;
      const fr = u < 0 ? 0 : u - Math.floor(u);
      const count = u < 0 ? 0 : Math.min(12, Math.floor(fr * 16));
      const jit = u >= 0 && u < 2.9 ? Math.sin(t * 157) * 1.2 : 0;
      machHoops.forEach(({ h, f }) => {
        f.petals.forEach((p, i) => p.fill.setAttribute('opacity', i < count ? 1 : 0));
        h.content.setAttribute('transform', `translate(0,${jit.toFixed(2)})`);
      });
    }

    // S7 green: blooms out of the needle, then folds into a single thread
    if (t > 26.3 && t < 31.7) {
      if (P.collapse <= 0) gl.style.clipPath = `circle(${P.greenR.toFixed(1)}px at ${GREEN_C[0]}px ${GREEN_C[1]}px)`;
      else gl.style.clipPath = `inset(${(757 * P.collapse).toFixed(1)}px 0 ${((1920 - 767) * P.collapse).toFixed(1)}px 0)`;
    }

    // S8: the solid green band becomes a running stitch
    if (t > 31.0) {
      const e = P.endLine;
      endLine.setAttribute('opacity', t >= 31.6 ? 1 : 0);
      endLine.setAttribute('x1', lerp(0, 115, e));
      endLine.setAttribute('x2', lerp(1080, 896, e));
      endLine.setAttribute('stroke-dasharray', `${lerp(62, 37, e).toFixed(2)} ${lerp(0, 25, e).toFixed(2)}`);
      fl8.spin.setAttribute('transform', `rotate(${(-40 * (1 - out3(clamp((t - 31.6) / 1.1, 0, 1))) + Math.max(0, t - 32.7) * 4).toFixed(2)})`);
    }
  }

  window.CUES = CUES.sort((a, b) => a.t - b.t);
  window.DURATION = 36;
  window.seek = t => { tl.seek(t, true); renderDynamic(t); };
  window.seek(0);
  window.READY = true;
})();
