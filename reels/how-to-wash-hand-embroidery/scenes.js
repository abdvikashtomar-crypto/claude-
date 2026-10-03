/* How to wash hand embroidery: 43.5 s, 1080x1920, fast cuts.
   Scene times come from timeline.js (window.CUTS), word times from the
   voiceover (W(clause, word)), so picture and voice stay locked. */
(async () => {
  const E = await Engine();
  const I = Icons(E);
  const { C, tl, P, DYN, cue, clamp, lerp, seg, ease, R, rng, W, cs, ce, T, S, FX, shake, scene, drift, trans, chip, headline, label, stampNo, badgeOk, ring, captions, drawOn, drawable } = E;
  const CUT = window.CUTS, LEN = window.LENGTH;
  const live = (sc, f) => DYN.push(t => { if (t >= sc.win[0] && t < sc.win[1]) f(t); });

  /** an SVG group posed every frame from a plain state object GSAP can tween */
  const OBJS = [];
  function Obj(parent, init = {}) {
    const g = S('g', {}, parent);
    const st = { x: 0, y: 0, r: 0, s: 1, sx: 1, sy: 1, o: 1, ...init };
    OBJS.push({ g, st });
    return { g, st };
  }
  const poseObjs = () => {
    for (const { g, st } of OBJS) {
      g.setAttribute('transform', `translate(${st.x.toFixed(2)},${st.y.toFixed(2)}) rotate(${st.r.toFixed(2)}) scale(${(st.s * st.sx).toFixed(4)},${(st.s * st.sy).toFixed(4)})`);
      g.setAttribute('opacity', st.o.toFixed(3));
    }
  };
  const NEEDLE = 'M0,0 L122,-4.8 A4.8,4.8 0 0 1 122,4.8 Z';
  function needle(parent, color, eye) {
    const g = S('g', {}, parent);
    S('path', { d: NEEDLE, fill: color }, g);
    S('ellipse', { cx: 111, cy: 0, rx: 8, ry: 2.1, fill: eye }, g);
    return g;
  }
  /** a static copy of a header (used when a step cuts to a second angle) */
  function header(sc, step, lines, chipLabel) {
    chip(sc, step, null, chipLabel);
    lines.forEach(l => T(sc.inner, l.text, { size: l.size || 112, wt: 900, fam: l.fam || 'm', color: l.color || sc.th.text, y: l.y }));
  }
  const pill = (sc, text, x, y, o = {}) => {
    const w = o.w || text.length * 19 + 56;
    const g = S('g', {}, sc.front);
    S('rect', { x: x - w / 2, y: y - 30, width: w, height: 56, rx: 28, fill: o.fill || C.waterLight, stroke: o.stroke || C.ink, 'stroke-width': 4 }, g);
    const tx = S('text', { x, y: y + 10, 'text-anchor': 'middle', fill: o.color || C.ink, style: `font: 800 ${o.size || 28}px Montserrat; letter-spacing: 3px` }, g);
    tx.textContent = text;
    if (o.t != null) { gsap.set(g, { opacity: 0 }); tl.fromTo(g, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.4)' }, o.t); }
    return g;
  };
  const leader = (sc, x1, y1, x2, y2, t, color) => {
    const l = S('path', { d: `M${x1},${y1} L${x2},${y2}`, fill: 'none', stroke: color || sc.th.muted, 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-dasharray': '1 0' }, sc.front);
    drawOn(l, t, 0.22);
    const dot = S('circle', { cx: x2, cy: y2, r: 7, fill: color || sc.th.muted }, sc.front);
    gsap.set(dot, { scale: 0, transformOrigin: '50% 50%' });
    tl.to(dot, { scale: 1, duration: 0.2, ease: 'back.out(3)' }, t + 0.18);
  };

  // =====================================================================
  // HOOK A  "Hand embroidery takes hours."  (ink)
  // =====================================================================
  const hA = scene('hookA', 'dark');
  hA.win[0] = 0;
  const clk = I.clock(hA.back, 540, 890, 330);
  live(hA, t => {
    clk.minute.setAttribute('transform', `rotate(${(t * 1080).toFixed(1)})`);
    clk.hour.setAttribute('transform', `rotate(${(t * 90).toFixed(1)})`);
  });
  const fA = I.flower(hA.back, 540, 890, 2.1, 16);
  const PET0 = 0.1, PET_GAP = (W('h1', 'hours') - 0.15 - PET0) / 15;
  fA.petals.forEach((p, i) => {
    gsap.set(p, { scale: 0, transformOrigin: '50% 100%' });
    tl.to(p, { scale: 1, duration: 0.22, ease: 'back.out(2.2)' }, PET0 + i * PET_GAP);
    cue('tick', PET0 + i * PET_GAP, { soft: true, n: i });
  });
  gsap.set(fA.center, { scale: 0, transformOrigin: '50% 50%' });
  tl.to(fA.center, { scale: 1, duration: 0.3, ease: 'back.out(2)' }, 0.04);
  const threadA = S('circle', { cx: 540, cy: 890, r: 2.1 * 112, fill: 'none', stroke: C.mari, 'stroke-width': 5, transform: 'rotate(-90 540 890)' }, hA.back);
  drawable(threadA);
  tl.to(threadA, { attr: { 'stroke-dashoffset': 0 }, duration: 15 * PET_GAP + 0.2, ease: 'none' }, PET0);
  const ndA = needle(hA.front, C.warm, C.ink);
  live(hA, t => {
    const k = clamp((t - PET0) / (15 * PET_GAP + 0.2));
    const a = -90 + k * 360, ar = (a * Math.PI) / 180, r = 2.1 * 118;
    ndA.setAttribute('transform', `translate(${540 + Math.cos(ar) * r},${890 + Math.sin(ar) * r}) rotate(${a - 25}) scale(1.25)`);
    ndA.setAttribute('opacity', (1 - seg(t, W('h1', 'hours') - 0.22, W('h1', 'hours') - 0.1)).toFixed(3));
  });
  label(hA, 'HAND EMBROIDERY TAKES', 540, 330, { size: 34, ls: 0.3, color: '#A8A39B', t: 0.12 });
  const hours = T(hA.inner, 'HOURS.', { size: 196, wt: 900, color: C.warm, y: 580 });
  tl.fromTo(hours, { opacity: 0, scale: 1.9 }, { opacity: 1, scale: 1, duration: 0.18, ease: 'power4.in', transformOrigin: '50% 50%' }, W('h1', 'hours') - 0.12);
  shake(W('h1', 'hours') + 0.06, 18, 0.35);
  cue('hit', W('h1', 'hours') + 0.05);
  FX.sparkles(hA, { x: 540, y: 500, t: W('h1', 'hours') + 0.06, n: 12, radius: [200, 420], size: [12, 26] });
  drift(hA, 0, 2, 1.06, 540, 890);

  // =====================================================================
  // HOOK B  "One wrong wash can ruin it."  (ink) + rewind
  // =====================================================================
  const hB = scene('hookB', 'dark');
  trans('flash', hA, hB, cs('h2') - 0.04);
  const tOne = T(hB.inner, 'ONE WRONG', { size: 118, wt: 900, color: C.warm, y: 440, split: 'words', mask: true });
  const tWash = T(hB.inner, 'WASH', { size: 118, wt: 900, color: C.warm, y: 556, split: 'words', mask: true });
  tOne.words[1].style.color = C.mari;
  [[tOne.words[0], 'One'], [tOne.words[1], 'wrong'], [tWash.words[0], 'wash']].forEach(([w, word]) =>
    tl.fromTo(w, { yPercent: 118 }, { yPercent: 0, duration: 0.28, ease: 'back.out(1.8)' }, W('h2', word) - 0.05));
  const wsh = I.washer(hB.back, 540, 900);
  const [DX, DY] = wsh.door;
  const tRuin = W('h2', 'ruin'), tSpin0 = cs('h2'), tRew0 = ce('h2') + 0.02, tRew1 = tRew0 + 0.36;
  const drum = S('g', {}, wsh.drum);
  S('path', { d: `M${DX - 200},${DY + 40} Q${DX - 100},${DY + 10} ${DX},${DY + 40} T${DX + 200},${DY + 40} L${DX + 200},${DY + 220} L${DX - 200},${DY + 220} Z`, fill: C.water, opacity: 0.85 }, drum);
  const drumTee = I.tee(drum, DX, DY - 10, 0.4);
  for (let k = 0; k < 6; k++) S('path', { d: `M${DX + Math.cos(k) * 120},${DY + Math.sin(k) * 120} a14,14 0 1 0 1,0`, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 4, opacity: 0.7 }, drum);
  const blurArcs = S('g', {}, wsh.drum);
  for (let k = 0; k < 5; k++) S('path', { d: `M${DX + 150},${DY} A150,150 0 0 1 ${DX},${DY + 150}`, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 10 - k, 'stroke-linecap': 'round', opacity: 0.5, transform: `rotate(${k * 72} ${DX} ${DY})` }, blurArcs);
  function drumAngle(t) {
    const a = t - tSpin0;
    if (t < tRuin) return 60 * a + 1100 * a * a;
    const aR = tRuin - tSpin0, angR = 60 * aR + 1100 * aR * aR;
    if (t < tRew0) return angR + 400 * (t - tRuin);
    const angS = angR + 400 * (tRew0 - tRuin);
    return angS - 2600 * ease.io2(seg(t, tRew0, tRew1));
  }
  live(hB, t => {
    const a = drumAngle(t);
    drum.setAttribute('transform', `rotate(${a.toFixed(1)} ${DX} ${DY})`);
    const speed = t < tRuin ? clamp((t - tSpin0) / (tRuin - tSpin0)) : t < tRew0 ? 0.2 : Math.sin(Math.PI * seg(t, tRew0, tRew1));
    blurArcs.setAttribute('transform', `rotate(${(a * 1.3).toFixed(1)} ${DX} ${DY})`);
    blurArcs.setAttribute('opacity', (speed * 0.9).toFixed(3));
    const gone = t >= tRuin && t < tRew1 - 0.04;
    drumTee.flower.root.setAttribute('opacity', gone ? 0 : 1);
  });
  for (let k = 0; k < 7; k++) shake(tSpin0 + 0.45 + k * 0.1, 3 + k * 1.6, 0.12);
  cue('machine', tSpin0 + 0.1, { dur: tRuin - tSpin0 });
  // the crack and the burst of petals
  const crack = S('path', { d: `M${DX - 150},${DY - 70} L${DX - 60},${DY - 20} L${DX - 90},${DY + 30} L${DX + 10},${DY + 10} L${DX + 40},${DY + 80} L${DX + 140},${DY + 60} M${DX - 60},${DY - 20} L${DX - 20},${DY - 110} M${DX + 10},${DY + 10} L${DX + 70},${DY - 60}`, fill: 'none', stroke: C.warm, 'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, hB.front);
  const crackLen = drawable(crack);
  tl.to(crack, { attr: { 'stroke-dashoffset': 0 }, duration: 0.09, ease: 'none' }, tRuin);
  tl.to(crack, { attr: { 'stroke-dashoffset': crackLen }, duration: 0.3, ease: 'power2.in' }, tRew0);
  const burst = { x: DX, y: DY, t: tRuin, n: 34, speed: [650, 1350], scale: 0.9, seed: 4242 };
  FX.petals(hB, { ...burst, life: tRew0 - tRuin });
  // rewind: the same petals, same seed, played backwards into the door
  const rew = FX.petals(hB, { ...burst, t: tRew0, life: tRew1 - tRew0 });
  const rewDraw = rew.draw;
  rew.draw = (ctx, p, age, t) => rewDraw(ctx, p, (tRew0 - tRuin) * (1 - ease.io2(clamp(age / (tRew1 - tRew0)))), t);
  const flashB = S('rect', { x: 0, y: 0, width: 1080, height: 1920, fill: C.warm, opacity: 0 }, hB.front);
  tl.fromTo(flashB, { attr: { opacity: 0.85 } }, { attr: { opacity: 0 }, duration: 0.22, ease: 'power2.out', immediateRender: false }, tRuin);
  const ruined = T(hB.inner, 'RUINED.', { size: 176, wt: 900, color: C.mari, y: 1010 });
  gsap.set(ruined, { opacity: 0 });
  tl.fromTo(ruined, { opacity: 0, scale: 2.2, rotation: -24 }, { opacity: 1, scale: 1, rotation: -9, duration: 0.14, ease: 'power4.in', transformOrigin: '50% 50%' }, tRuin - 0.02);
  tl.to(ruined, { opacity: 0, scale: 0.4, rotation: 10, duration: 0.3, ease: 'power2.in' }, tRew0);
  shake(tRuin + 0.12, 30, 0.55);
  cue('explode', tRuin);
  cue('tapestop', tRuin - 0.02);
  cue('rewind', tRew0);
  // rewind marks
  const rewMark = S('g', { transform: 'translate(120,262)', opacity: 0 }, hB.front);
  S('path', { d: 'M0,0 L-34,22 L0,44 Z M38,0 L4,22 L38,44 Z', fill: C.warm }, rewMark);
  const rewTxt = S('text', { x: 52, y: 34, fill: C.warm, style: 'font: 800 30px Montserrat; letter-spacing: 4px' }, rewMark);
  rewTxt.textContent = 'REWIND';
  const scan = E.div(hB.inner, 'layer', { background: 'repeating-linear-gradient(0deg, rgba(252,248,240,.09) 0 3px, transparent 3px 9px)', opacity: 0 });
  live(hB, t => {
    const on = t >= tRew0 && t < tRew1 + 0.05;
    rewMark.setAttribute('opacity', on && Math.floor(t * 12) % 2 === 0 ? 1 : on ? 0.35 : 0);
    scan.style.opacity = on ? 1 : 0;
    scan.style.transform = on ? `translateY(${((t * 900) % 9).toFixed(1)}px)` : '';
  });
  drift(hB, cs('h2'), tRew1, 1.05, DX, DY);

  // =====================================================================
  // HOOK C  "Here's how to wash it right."  title (green)
  // =====================================================================
  const hC = scene('hookC', 'green');
  trans('iris', hB, hC, tRew1 + 0.1, { at: [DX, DY], d: 0.26 });
  const ttl = T(hC.inner, 'HOW TO WASH', { size: 112, wt: 900, color: C.warm, y: 500, split: 'words', mask: true });
  ttl.words.forEach((w, i) => tl.fromTo(w, { yPercent: 118 }, { yPercent: 0, duration: 0.28, ease: 'back.out(1.8)' }, W('h3', ['how', 'to', 'wash'][i]) - 0.06));
  const sub = T(hC.inner, 'hand embroidery', { fam: 'p', size: 116, wt: 500, color: C.mari, y: 640, split: 'words' });
  sub.words.forEach((w, i) => tl.fromTo(w, { clipPath: 'inset(-30% 114% -45% -14%)' }, { clipPath: 'inset(-30% -14% -45% -14%)', duration: 0.32, ease: 'power2.inOut' }, W('h3', 'it') - 0.06 + i * 0.16));
  label(hC, 'CLOTHES  &  ACCESSORIES', 540, 728, { size: 32, ls: 0.3, color: C.warm, t: W('h3', 'right') });
  ring(hC, 540, 1000, 205, 'rgba(252,248,240,.35)', 30, { dash: '26 20', w: 7 });
  ring(hC, 540, 1000, 250, C.mari, -18, { dash: '8 26', w: 7 });
  const fC = I.flower(hC.back, 540, 1000, 1.45, 16);
  fC.petals.forEach((p, i) => { gsap.set(p, { scale: 0, transformOrigin: '50% 100%' }); tl.to(p, { scale: 1, duration: 0.26, ease: 'back.out(2)' }, tRew1 + 0.14 + i * 0.025); });
  live(hC, t => fC.spin.setAttribute('transform', `rotate(${(-70 * (1 - ease.out3(seg(t, tRew1 + 0.1, tRew1 + 0.9))) + (t - tRew1) * 8).toFixed(2)})`));
  drift(hC, tRew1, CUT.test, 1.04, 540, 1000);

  // =====================================================================
  // 1 · TEST THE COLOURS (cream)
  // =====================================================================
  const s1 = scene('test', 'cream');
  trans('zoom', hC, s1, CUT.test, { at: [540, 1000] });
  chip(s1, 1, CUT.test + 0.02);
  headline(s1, [{ text: 'TEST THE', y: 470 }, { text: 'COLOURS', y: 582 }], CUT.test + 0.04);
  const swClip = E.id('sw');
  S('rect', { x: 110, y: 650, width: 860, height: 510, rx: 36 }, S('clipPath', { id: swClip }, s1.back));
  S('rect', { x: 110, y: 650, width: 860, height: 510, rx: 36, fill: '#FBF8F2' }, s1.back);
  const weave = S('g', { 'clip-path': `url(#${swClip})`, opacity: 0.5 }, s1.back);
  for (let y = 656; y < 1160; y += 12) S('line', { x1: 110, x2: 970, y1: y, y2: y, stroke: '#E4DCCD', 'stroke-width': 2 }, weave);
  for (let x = 116; x < 970; x += 12) S('line', { x1: x, x2: x, y1: 650, y2: 1160, stroke: '#ECE5D8', 'stroke-width': 2 }, weave);
  const macro = S('g', { 'clip-path': `url(#${swClip})` }, s1.back);
  const f1 = I.flower(macro, 420, 900, 1.8, 16);
  // the hidden stitch: a small leaf in the corner
  const leafG = S('g', { transform: 'translate(838,1072) rotate(-30)' }, macro);
  S('path', { d: 'M0,0 C14,-30 50,-40 70,-34 C58,-8 30,8 0,0 Z', fill: C.green }, leafG);
  for (let k = 0; k < 5; k++) S('line', { x1: 8 + k * 12, y1: -2 - k * 2, x2: 16 + k * 12, y2: -22 - k * 2, stroke: '#2E7F22', 'stroke-width': 3 }, leafG);
  S('rect', { x: 110, y: 650, width: 860, height: 510, rx: 36, fill: 'none', stroke: C.ink, 'stroke-width': 7 }, s1.front);
  live(s1, t => f1.spin.setAttribute('transform', `rotate(${(t * 6).toFixed(2)})`));
  const mag = Obj(s1.front, { x: 862, y: 1052, s: 0, o: 0 });
  I.magnifier(mag.g, 0, 0, 0.72);
  tl.to(mag.st, { s: 1, o: 1, duration: 0.3, ease: 'back.out(2.2)' }, W('t2', 'hidden') - 0.04);
  label(s1, 'HIDDEN STITCH', 650, 1122, { size: 24, t: W('t2', 'hidden') + 0.1, color: '#6B675F' });
  const cl = Obj(s1.front, { x: 1260, y: 560, r: 25, s: 0.85 });
  const clIcon = I.cloth(cl.g, 0, 0, 1);
  const tDab1 = W('t2', 'stitch'), tDab2 = W('t2', 'with') + 0.08, tLift = W('t2', 'damp');
  tl.to(cl.st, { x: 846, y: 940, r: -8, duration: 0.42, ease: 'power3.out' }, W('t2', 'Dab'));
  for (const td of [tDab1, tDab2]) {
    tl.to(cl.st, { y: 1030, sy: 0.82, sx: 1.08, duration: 0.1, ease: 'power2.in' }, td - 0.1);
    tl.to(cl.st, { y: 960, sy: 1, sx: 1, duration: 0.16, ease: 'power2.out' }, td);
    cue('dab', td);
    FX.splash(s1, { x: 846, y: 1060, t: td, n: 8, speed: [150, 380], size: [3, 6], life: 0.5 });
  }
  tl.to(cl.st, { x: 690, y: 820, r: 8, sx: -1, duration: 0.3, ease: 'back.out(1.6)' }, tLift);
  cue('flip', tLift);
  label(s1, 'CLEAN CLOTH = SAFE TO WASH', 540, 1206, { size: 26, color: C.green, t: tLift + 0.22 });
  badgeOk(s1, 830, 740, 44, tLift + 0.18);
  drift(s1, CUT.test, CUT.inside + 0.3, 1.04);

  // =====================================================================
  // 2 · INSIDE OUT (green)
  // =====================================================================
  const s2 = scene('inside', 'green');
  trans('whip', s1, s2, CUT.inside, { dir: 'left' });
  chip(s2, 2, CUT.inside + 0.02);
  headline(s2, [{ text: 'INSIDE OUT', y: 500, size: 120 }], CUT.inside + 0.03);
  ring(s2, 540, 930, 330, 'rgba(252,248,240,.22)', 40, { dash: '30 22', w: 8 });
  const flipW = Obj(s2.back, { x: 540, y: 930 });
  const teeFront = I.tee(flipW.g, 0, 0, 1);
  const teeIn = I.tee(flipW.g, 0, 0, 1, { inside: true });
  P.flip = 0;
  const tFlip = W('in', 'Turn') + 0.02;
  tl.to(P, { flip: 3, duration: W('in', 'inside') + 0.15 - tFlip, ease: 'power2.inOut' }, tFlip);
  cue('flip', tFlip); cue('flip', tFlip + 0.17); cue('flip', tFlip + 0.34);
  FX.streaks(s2.em, { t: tFlip + 0.1, dir: 1, color: 'rgba(252,248,240,.9)' });
  live(s2, t => {
    const c = Math.cos(Math.PI * P.flip), s = Math.sin(Math.PI * P.flip);
    flipW.st.sx = Math.abs(c) < 0.02 ? 0.02 * Math.sign(c || 1) : c;
    flipW.st.sy = 1 - 0.1 * s * s;
    flipW.st.r = 6 * Math.sin(Math.PI * P.flip * 0.5) * (1 - seg(t, W('in', 'inside') + 0.15, W('in', 'inside') + 0.4));
    teeFront.root.setAttribute('display', c >= 0 ? '' : 'none');
    teeIn.root.setAttribute('display', c < 0 ? '' : 'none');
  });
  label(s2, 'PROTECTS THE STITCHES FROM RUBBING', 540, 640, { size: 26, color: C.warm, t: W('in', 'inside') });
  badgeOk(s2, 820, 760, 42, W('in', 'inside') + 0.22);
  FX.sparkles(s2, { x: 540, y: 866, t: W('in', 'inside') + 0.2, n: 10, radius: [60, 170], color: C.mari });
  drift(s2, CUT.inside, CUT.cold + 0.3, 1.05, 540, 930);

  // =====================================================================
  // 3 · COLD WATER (cream), then HOT vs COLD
  // =====================================================================
  const s3 = scene('cold', 'cream');
  trans('wave', s2, s3, CUT.cold);
  chip(s3, 3, CUT.cold + 0.02);
  headline(s3, [{ text: 'COLD WATER', y: 500, size: 120 }], CUT.cold + 0.04);
  pill(s3, 'UNDER 30°C', 540, 578, { t: W('c1', 'water') });
  const b3 = I.basin(s3, 590, 790, 620, 340);
  const t3 = I.tee(b3.content, 590, 1010, 0.42);
  const th3 = I.thermometer(s3.back, 140, 660, 1000);
  const lvl3 = 95;
  live(s3, t => {
    b3.update(t, lvl3, 0, 7);
    const k = ease.io2(seg(t, W('c1', 'cold') - 0.25, W('c1', 'water') + 0.2));
    th3.set(lerp(0.9, 0.2, k), gsap.utils.interpolate(C.mari, '#5FA7A0', k));
  });
  FX.bubbles(s3, { t0: CUT.cold, t1: CUT.cold + 1.4, n: 26, x0: 330, x1: 850, y0: 1040, y1: 1110, rise: [60, 140], life: 1.2, clip: b3.clip });
  // ice cubes: drop, splash, then float
  const surf3 = x => 790 + lvl3;
  [470, 600, 730].forEach((x, i) => {
    const t0 = W('c1', 'cold') - 0.12 + i * 0.09, y0 = 520, yS = surf3(x) - 16;
    const tImp = t0 + Math.sqrt((2 * (yS - y0)) / 2600);
    const cube = Obj(b3.back, { x, y: y0, r: 20 * (i - 1) });
    const cg = S('g', {}, cube.g);
    S('rect', { x: -36, y: -36, width: 72, height: 72, rx: 14, fill: 'rgba(255,255,255,.82)', stroke: '#6FB0A8', 'stroke-width': 5 }, cg);
    S('path', { d: 'M-22,-18 L-6,-24', stroke: '#FFFFFF', 'stroke-width': 6, 'stroke-linecap': 'round' }, cg);
    live(s3, t => {
      if (t < t0) { cube.st.o = 0; return; }
      cube.st.o = 1;
      if (t < tImp) { const a = t - t0; cube.st.y = y0 + 1300 * a * a; cube.st.r = 20 * (i - 1) + a * 400; }
      else { const a = t - tImp; cube.st.y = yS + 14 * Math.exp(-a * 5) * Math.sin(a * 18) + 3 * Math.sin(t * 3 + i); cube.st.r = 20 * (i - 1) + (tImp - t0) * 400 + 4 * Math.sin(t * 2.4 + i); }
    });
    FX.splash(s3, { x, y: yS + 10, t: tImp, n: 14, angle: [-165, -15], speed: [240, 620], size: [4, 9] });
    FX.ripples(s3, { x, y: yS + 18, t: tImp, n: 2, r: 110, flat: 0.22, clip: b3.clip });
    cue('splash', tImp, { soft: i > 0 });
    cue('ice', t0 + 0.05);
  });
  badgeOk(s3, 940, 720, 44, W('c1', 'water') + 0.12);

  const s3b = scene('cold2', 'cream');
  trans('flash', s3, s3b, cs('c2') - 0.03, { color: C.warm });
  header(s3b, 3, [{ text: 'COLD WATER', y: 500, size: 120 }]);
  const bh = I.basin(s3b, 300, 840, 420, 250), bc = I.basin(s3b, 790, 840, 420, 250);
  const teeH = I.tee(bh.content, 300, 1000, 0.3), teeC = I.tee(bc.content, 790, 1000, 0.3);
  pill(s3b, 'HOT', 300, 768, { fill: C.mari });
  pill(s3b, 'COLD', 790, 768, { fill: C.waterLight });
  live(s3b, t => {
    bh.update(t * 1.6, 60, 0, 8, '#E7B656');
    bc.update(t, 60, 0, 5);
    const k = seg(t, W('c2', 'shrink') - 0.04, W('c2', 'shrink') + 0.5);
    const s = lerp(1, 0.72, ease.outBack(k, 2.2));
    teeH.root.setAttribute('transform', `translate(300,${1000 + (1 - s) * 60}) scale(${(0.3 * s).toFixed(4)})`);
  });
  FX.steam(s3b, { t0: cs('c2') - 0.1, t1: CUT.soap, n: 26, x0: 140, x1: 460, y: 900, life: 1.3 });
  FX.bubbles(s3b, { t0: cs('c2'), t1: CUT.soap, n: 14, x0: 640, x1: 940, y0: 1030, y1: 1070, life: 1, clip: bc.clip });
  FX.dye(s3b, { t0: W('c2', 'bleed') - 0.06, t1: W('c2', 'bleed') + 0.5, n: 16, x: 300, y: 980, clip: bh.clip, life: 1.6 });
  label(s3b, 'COLOURS BLEED', 300, 1150, { size: 26, color: '#6B675F', t: W('c2', 'bleed') });
  label(s3b, 'FABRIC SHRINKS', 300, 1192, { size: 26, color: '#6B675F', t: W('c2', 'shrink') });
  cue('steam', cs('c2') - 0.05, { dur: 1.9 });
  cue('boing', W('c2', 'shrink'));
  stampNo(s3b, 300, 960, 128, W('c2', 'shrink') + 0.02);
  badgeOk(s3b, 905, 770, 34, W('c2', 'shrink') + 0.12);
  drift(s3, CUT.cold, cs('c2'), 1.04, 590, 900);
  drift(s3b, cs('c2'), CUT.soap + 0.3, 1.04, 540, 950);

  // =====================================================================
  // 4 · MILD DETERGENT, NO BLEACH (cream)
  // =====================================================================
  const s4 = scene('soap', 'cream');
  trans('zoom', s3b, s4, CUT.soap, { at: [790, 960] });
  chip(s4, 4, CUT.soap + 0.02);
  headline(s4, [{ text: 'MILD', y: 470 }, { text: 'DETERGENT', y: 582 }], CUT.soap + 0.04);
  const b4 = I.basin(s4, 540, 850, 640, 300);
  I.tee(b4.content, 540, 1030, 0.4);
  const lvl4 = 82;
  const bot = Obj(s4.front, { x: 1240, y: 460, r: 30, s: 0.8 });
  I.bottle(bot.g, 0, 0, 1);
  tl.to(bot.st, { x: 860, y: 720, r: -125, duration: 0.42, ease: 'back.out(1.3)' }, CUT.soap + 0.06);
  cue('whoosh', CUT.soap + 0.06, { soft: true });
  // nozzle position at the pouring pose
  const ang = (-125 * Math.PI) / 180, nz = [860 + 0.8 * (214 * Math.sin(ang)), 720 + 0.8 * (-214 * Math.cos(ang))];
  const dropT = [0, 0.2, 0.4].map(k => W('d1', 'few') + k);
  const surf4 = 850 + lvl4;
  live(s4, t => b4.update(t, lvl4, 0, 6, gsap.utils.interpolate(C.water, '#A9D3CC', seg(t, dropT[0] + 0.4, dropT[2] + 1))));
  s4.emit({
    t0: dropT[0], t1: dropT[2], n: 3, life: Math.sqrt((2 * (surf4 - nz[1])) / 1800),
    spawn: () => ({}),
    draw(ctx, p, age) {
      const y = nz[1] + 0.5 * 1800 * age * age, s = 1 + Math.min(1, age * 4) * 0.5;
      ctx.translate(nz[0], y); ctx.scale(1 / s, s);
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.quadraticCurveTo(15, 2, 0, 14); ctx.quadraticCurveTo(-15, 2, 0, -22);
      ctx.fillStyle = C.green; ctx.fill();
      ctx.beginPath(); ctx.ellipse(-4, 0, 3, 6, 0, 0, 6.28); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
    },
  });
  const tFall = Math.sqrt((2 * (surf4 - nz[1])) / 1800);
  dropT.forEach((td, i) => {
    const ti = td + tFall;
    FX.splash(s4, { x: nz[0], y: surf4 - 4, t: ti, n: 10, speed: [200, 480], size: [3, 7], angle: [-160, -20] });
    FX.ripples(s4, { x: nz[0], y: surf4 + 6, t: ti, n: 2, r: 120, flat: 0.22, clip: b4.clip });
    FX.bubbles(s4, { t0: ti, t1: ti + 0.6, n: 16, x0: nz[0] - 120, x1: nz[0] + 120, y0: surf4 + 20, y1: surf4 + 120, rise: [30, 90], size: [5, 13], life: 1.1, clip: b4.clip, seed: 900 + i });
    cue('drop', ti, { n: i });
    const cnt = T(s4.inner, String(i + 1), { size: 64, wt: 900, color: C.green, x: nz[0] - 92, y: nz[1] + 22 });
    gsap.set(cnt, { opacity: 0 });
    tl.fromTo(cnt, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.16, ease: 'back.out(3)', immediateRender: false }, td + 0.05);
    tl.to(cnt, { opacity: 0, duration: 0.08 }, i < 2 ? dropT[i + 1] + 0.02 : td + 0.7);
  });
  FX.bubbles(s4, { t0: dropT[0] + 0.5, t1: CUT.swish, n: 70, x0: 240, x1: 840, y0: surf4 - 6, y1: surf4 + 10, rise: [4, 22], size: [6, 17], life: 1.6, seed: 77 });
  const lblDrops = label(s4, 'A FEW DROPS · pH NEUTRAL', 540, 1206, { size: 26, color: C.green, t: W('d1', 'mild') });
  const jg = Obj(s4.front, { x: -260, y: 780, r: -25, s: 0.78 });
  I.jug(jg.g, 0, 0, 1);
  tl.to(jg.st, { x: 250, r: 0, duration: 0.24, ease: 'back.out(2)' }, cs('d2') - 0.12);
  cue('whoosh', cs('d2') - 0.12, { soft: true });
  stampNo(s4, 250, 790, 150, W('d2', 'bleach') - 0.06);
  label(s4, 'NO BLEACH  ·  NO SOFTENER', 540, 1206, { size: 26, color: C.ink, t: W('d2', 'bleach') + 0.12 });
  tl.to(lblDrops, { opacity: 0, duration: 0.1 }, W('d2', 'bleach') + 0.05);
  drift(s4, CUT.soap, CUT.swish + 0.3, 1.04, 540, 900);

  // =====================================================================
  // 5 · SWISH GENTLY, then NEVER SCRUB / NEVER WRING (cream)
  // =====================================================================
  const s5 = scene('swish', 'cream');
  trans('whip', s4, s5, CUT.swish, { dir: 'up' });
  chip(s5, 5, CUT.swish + 0.02);
  const sw1 = T(s5.inner, 'SWISH', { size: 120, wt: 900, color: C.ink, y: 470, split: 'chars' });
  const sw2 = T(s5.inner, 'GENTLY', { size: 120, wt: 900, color: C.green, y: 584, split: 'chars' });
  const swChars = [...sw1.words[0].chars, ...sw2.words[0].chars];
  DYN.push(t => swChars.forEach((c, i) => {
    const t0 = CUT.swish + 0.04, k = clamp((t - t0 - i * 0.035) / 0.24), e = k > 0 ? ease.outBack(k, 2) : 0;
    const wv = seg(t, t0 + 0.55, t0 + 0.85), ph = t * 7 - i * 0.7;
    c.style.opacity = k > 0 ? 1 : 0;
    c.style.transform = `translateY(${((1 - e) * 80 + Math.sin(ph) * 12 * wv).toFixed(2)}px) rotate(${(Math.sin(ph + 1) * 4 * wv).toFixed(2)}deg)`;
  }));
  const b5 = I.basin(s5, 540, 790, 680, 340);
  const tee5 = Obj(b5.content, { x: 540, y: 985, s: 0.44 });
  I.tee(tee5.g, 0, 0, 1, { sw: 7 / 0.44 });
  const OM = 2 * Math.PI * 0.95;
  live(s5, t => {
    const a = t - CUT.swish;
    tee5.st.x = 540 + 80 * Math.sin(OM * a);
    tee5.st.r = 9 * Math.sin(OM * a + 0.6);
    b5.update(t, 85, 34 * Math.sin(OM * a + 0.9), 7);
  });
  const arrows = [-1, 1].map(dir => {
    const a = S('g', { opacity: 0 }, s5.front);
    S('path', { d: `M${540 - dir * 120},690 Q540,648 ${540 + dir * 120},690`, fill: 'none', stroke: C.green, 'stroke-width': 11, 'stroke-linecap': 'round' }, a);
    S('path', { d: `M${540 + dir * 120},690 l${-dir * 34},-20 M${540 + dir * 120},690 l${-dir * 6},-38`, fill: 'none', stroke: C.green, 'stroke-width': 11, 'stroke-linecap': 'round' }, a);
    return a;
  });
  live(s5, t => { const v = Math.cos(OM * (t - CUT.swish)); arrows[0].setAttribute('opacity', clamp(-v * 1.4).toFixed(3)); arrows[1].setAttribute('opacity', clamp(v * 1.4).toFixed(3)); });
  FX.bubbles(s5, { t0: CUT.swish, t1: cs('g2'), n: 30, x0: 260, x1: 820, y0: 1040, y1: 1110, rise: [70, 150], life: 1.2, clip: b5.clip });
  for (let k = 0; k < 3; k++) cue('slosh', CUT.swish + 0.15 + k * (Math.PI / OM));
  label(s5, 'SOAK A FEW MINUTES', 540, 1206, { size: 26, color: C.green, t: W('g1', 'gently') });

  const s5b = scene('swish2', 'cream');
  trans('flash', s5, s5b, cs('g2') - 0.03, { color: C.warm });
  chip(s5b, 5, null);
  const nv = T(s5b.inner, 'NEVER', { size: 120, wt: 900, color: C.ink, y: 528, split: 'words', mask: true });
  tl.fromTo(nv.words[0], { yPercent: 118 }, { yPercent: 0, duration: 0.24, ease: 'back.out(2)' }, cs('g2') - 0.02);
  const cards = [[297, 'SCRUB'], [783, 'WRING']].map(([cx, word]) => {
    S('rect', { x: cx - 218, y: 650, width: 436, height: 440, rx: 30, fill: C.warm, stroke: C.ink, 'stroke-width': 6 }, s5b.back);
    const tt = S('text', { x: cx, y: 722, 'text-anchor': 'middle', fill: C.ink, style: 'font: 900 48px Montserrat' }, s5b.back);
    tt.textContent = word;
    return cx;
  });
  I.flower(s5b.back, 297, 915, 0.85, 16);
  const br = Obj(s5b.front, { x: 297, y: 880, r: -12, s: 0.62 });
  I.brush(br.g, 0, 0, 1);
  const tScrub = W('g2', 'scrub');
  live(s5b, t => { br.st.x = 297 + 80 * Math.sin((t - cs('g2')) * 2 * Math.PI * 4.2); br.st.y = 870 + 8 * Math.cos((t - cs('g2')) * 2 * Math.PI * 8.4); });
  FX.bubbles(s5b, { t0: cs('g2'), t1: tScrub + 0.5, n: 18, x0: 200, x1: 400, y0: 920, y1: 980, rise: [80, 200], size: [6, 14], life: 0.8, color: '#9CC9C3', fill: 'rgba(140,196,189,.25)' });
  cue('scrub', cs('g2'), { dur: tScrub + 0.2 - cs('g2') });
  const wr = Obj(s5b.back, { x: 783, y: 925, s: 0.42 });
  const wrTee = I.tee(wr.g, 0, 0, 1, { sw: 7 / 0.42 });
  const twist = S('g', { opacity: 0 }, s5b.front);
  for (let k = 0; k < 4; k++) S('path', { d: `M${700 + k * 40},${830 + k * 20} q30,40 60,80`, fill: 'none', stroke: C.ink, 'stroke-width': 6, 'stroke-linecap': 'round' }, twist);
  const tWring = W('g2', 'wring');
  live(s5b, t => {
    const k = seg(t, W('g2', 'Never', 1) - 0.1, tWring + 0.1);
    wr.g.firstChild.setAttribute('transform', `skewX(${(32 * Math.sin(k * Math.PI * 3) * k).toFixed(2)}) scale(${(1 - 0.18 * k).toFixed(3)},1)`);
    twist.setAttribute('opacity', (k > 0 && k < 1 ? 1 : 0));
  });
  FX.splash(s5b, { x: 783, y: 1040, t: tWring - 0.1, n: 14, angle: [10, 170], speed: [120, 380], size: [4, 8], life: 0.6 });
  FX.splash(s5b, { x: 783, y: 820, t: tWring, n: 10, angle: [-170, -10], speed: [200, 420], size: [4, 8], life: 0.6 });
  cue('wring', tWring - 0.15);
  stampNo(s5b, 297, 900, 150, tScrub + 0.04);
  stampNo(s5b, 783, 900, 150, tWring + 0.04);
  drift(s5, CUT.swish, cs('g2'), 1.04, 540, 900);
  drift(s5b, cs('g2'), CUT.rinse + 0.3, 1.04, 540, 880);

  // =====================================================================
  // 6 · RINSE TILL CLEAR (ink)
  // =====================================================================
  const s6 = scene('rinse', 'dark');
  trans('spin', s5b, s6, CUT.rinse, { deg: 120, at: [540, 900] });
  chip(s6, 6, CUT.rinse + 0.02);
  headline(s6, [{ text: 'RINSE', y: 470 }, { text: 'TILL CLEAR', y: 582, color: C.mari }], CUT.rinse + 0.04);
  const b6 = I.basin(s6, 540, 820, 660, 320);
  I.tee(b6.content, 540, 1010, 0.42);
  const tDrain0 = CUT.rinse + 0.05, tDrain1 = W('r1', 'cool'), tFill0 = W('r1', 'cool') + 0.05, tFill1 = W('r1', 'clear') + 0.05;
  const vortex = S('g', { 'clip-path': `url(#${b6.clipId})` }, b6.back);
  for (let k = 0; k < 4; k++) S('ellipse', { cx: 540, cy: 0, rx: 110 - k * 24, ry: 16 - k * 3, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 5, 'stroke-dasharray': '30 18', opacity: 0.8 }, vortex);
  const level6 = t => (t < tFill0 ? lerp(70, 230, ease.io2(seg(t, tDrain0, tDrain1))) : lerp(230, 70, ease.io2(seg(t, tFill0, tFill1))));
  live(s6, t => {
    const lv = level6(t);
    b6.update(t, lv, 0, 6, gsap.utils.interpolate('#C9DDD7', C.water, seg(t, tFill0 + 0.3, tFill1)));
    const on = t < tFill0 + 0.1;
    vortex.setAttribute('opacity', on ? 1 : 0);
    [...vortex.children].forEach((e, k) => { e.setAttribute('cy', (820 + lv + 14 + k * 26).toFixed(1)); e.setAttribute('stroke-dashoffset', (t * (400 + k * 160)).toFixed(1)); });
  });
  FX.bubbles(s6, { t0: CUT.rinse, t1: tDrain1, n: 40, x0: 260, x1: 820, y0: 880, y1: 900, rise: [10, 40], size: [7, 18], life: 0.9 });
  const tp = I.tap(s6.front, 470, 700);
  const stream = S('rect', { x: tp.spout[0] - 17, y: tp.spout[1], width: 34, height: 0, rx: 14, fill: C.water }, s6.front);
  const streamLines = S('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 5, 'stroke-dasharray': '24 30', opacity: 0.8 }, s6.front);
  live(s6, t => {
    const open = seg(t, tFill0 - 0.1, tFill0 + 0.08) * (1 - seg(t, tFill1, tFill1 + 0.15));
    const bottom = 820 + level6(t);
    const top = tp.spout[1] + (t > tFill1 ? (bottom - tp.spout[1]) * seg(t, tFill1, tFill1 + 0.2) : 0);
    stream.setAttribute('y', top); stream.setAttribute('height', Math.max(0, (bottom - top) * (t > tFill1 ? 1 : open)));
    stream.setAttribute('opacity', open > 0.01 || (t > tFill1 && t < tFill1 + 0.2) ? 1 : 0);
    streamLines.setAttribute('d', `M${tp.spout[0]},${top} L${tp.spout[0]},${top + Math.max(0, (bottom - top) * open)}`);
    streamLines.setAttribute('stroke-dashoffset', (-t * 900).toFixed(1));
    streamLines.setAttribute('opacity', open > 0.05 ? 0.8 : 0);
  });
  s6.emit({
    t0: tFill0, t1: tFill1, n: 60, life: 0.5, seed: 61,
    spawn: (r, i, tb) => { const a = R(r, -170, -10) * Math.PI / 180, v = R(r, 150, 420); return { x: tp.spout[0], y: 820 + level6(tb) - 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: R(r, 3, 6) }; },
    draw(ctx, p, age) { const x = p.x + p.vx * age, y = p.y + p.vy * age + 900 * age * age; ctx.globalAlpha = 1 - age / p.life; ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.28); ctx.fillStyle = C.water; ctx.fill(); },
  });
  cue('drain', tDrain0, { dur: tDrain1 - tDrain0 });
  cue('pour', tFill0 - 0.08, { dur: tFill1 - tFill0 + 0.15 });
  FX.sparkles(s6, { x: 540, y: 930, t: W('r1', 'clear'), n: 14, radius: [40, 260], color: C.warm });
  badgeOk(s6, 900, 760, 44, W('r1', 'runs'));
  label(s6, 'UNTIL NO SUDS ARE LEFT', 540, 1206, { size: 26, color: C.warm, t: W('r1', 'runs') });
  drift(s6, CUT.rinse, CUT.towel + 0.3, 1.04, 540, 900);

  // =====================================================================
  // 7 · ROLL IN A TOWEL & PRESS (green)
  // =====================================================================
  const s7 = scene('towel', 'green');
  trans('slats', s6, s7, CUT.towel, { color: C.mari });
  chip(s7, 7, CUT.towel + 0.02);
  headline(s7, [{ text: 'ROLL &', y: 470 }, { text: 'PRESS', y: 582, color: C.mari }], CUT.towel + 0.04);
  const flatClip = E.id('flat');
  const flatRect = S('rect', { x: 130, y: 680, width: 830, height: 440 }, S('clipPath', { id: flatClip }, s7.back));
  const flat = S('g', { 'clip-path': `url(#${flatClip})` }, s7.back);
  I.towel(flat, 540, 905, 780, 380);
  I.tee(flat, 540, 905, 0.6);
  const tRoll0 = W('tw', 'Roll'), tRoll1 = W('tw', 'towel') + 0.3;
  const roll = Obj(s7.back, { x: 150 });
  const rollBody = S('rect', { y: 715, height: 380, fill: C.cream, stroke: C.ink, 'stroke-width': 7 }, roll.g);
  const rollStripes = [0.1, 0.16, 0.84, 0.9].map(k => S('rect', { y: 715 + 380 * k - 8, height: 16, fill: C.mari }, roll.g));
  const rollCap = S('ellipse', { cy: 715, fill: C.cream, stroke: C.ink, 'stroke-width': 6 }, roll.g);
  const rollSpiral = S('path', { fill: 'none', stroke: C.ink, 'stroke-width': 4 }, roll.g);
  P.press = 0;
  const pressT = [W('tw', 'press'), W('tw', 'water'), W('tw', 'out')];
  pressT.forEach(tp7 => {
    tl.to(P, { press: 1, duration: 0.08, ease: 'power3.in' }, tp7 - 0.08);
    tl.to(P, { press: 0, duration: 0.22, ease: 'power2.out' }, tp7);
  });
  const rollX = t => (t < tRoll1 ? lerp(150, 880, ease.io2(seg(t, tRoll0, tRoll1))) : lerp(880, 540, ease.io2(seg(t, tRoll1, tRoll1 + 0.3))));
  live(s7, t => {
    const k = ease.io2(seg(t, tRoll0, tRoll1));
    const xFlat = lerp(150, 975, k), xr = rollX(t), r = lerp(14, 74, k);
    flatRect.setAttribute('x', xFlat); flatRect.setAttribute('width', Math.max(0, 960 - xFlat));
    const sq = P.press;
    const w = 2 * r * (1 + 0.25 * sq), x0 = -w / 2;
    roll.st.x = xr;
    rollBody.setAttribute('x', x0); rollBody.setAttribute('width', w); rollBody.setAttribute('rx', Math.min(w / 2, 26));
    rollStripes.forEach(e => { e.setAttribute('x', x0); e.setAttribute('width', w); });
    rollCap.setAttribute('rx', w / 2); rollCap.setAttribute('ry', (w / 2) * 0.32);
    let d = '';
    const spin = t * 8 + (xr - 150) / 40;
    for (let a = 0; a < Math.PI * 6; a += 0.3) { const rr = (w / 2) * (a / (Math.PI * 6)); d += `${d ? 'L' : 'M'}${(Math.cos(a + spin) * rr).toFixed(1)},${(715 + Math.sin(a + spin) * rr * 0.32).toFixed(1)} `; }
    rollSpiral.setAttribute('d', d);
    roll.g.setAttribute('display', k > 0.001 ? '' : 'none');
  });
  const presser = Obj(s7.front, { x: 540, y: 600, o: 0 });
  for (const dx of [-60, 60]) S('path', { d: `M${dx - 34},0 L${dx + 34},0 L${dx + 34},40 L${dx + 60},40 L${dx},96 L${dx - 60},40 L${dx - 34},40 Z`, fill: C.warm, stroke: C.ink, 'stroke-width': 6, 'stroke-linejoin': 'round' }, presser.g);
  live(s7, t => { presser.st.o = seg(t, pressT[0] - 0.3, pressT[0] - 0.15) * (1 - seg(t, pressT[2] + 0.3, pressT[2] + 0.45)); presser.st.y = 598 + 22 * P.press; presser.st.x = rollX(t); });
  pressT.forEach((tp7, i) => {
    FX.splash(s7, { x: 540, y: 712, t: tp7, n: 12, angle: [-150, -30], speed: [300, 700], size: [4, 9], seed: 700 + i });
    FX.splash(s7, { x: 540, y: 1100, t: tp7, n: 10, angle: [20, 160], speed: [200, 500], size: [4, 9], seed: 800 + i });
    FX.splash(s7, { x: 540 - 80, y: 905, t: tp7, n: 6, angle: [150, 210], speed: [250, 520], size: [4, 8], seed: 900 + i });
    FX.splash(s7, { x: 540 + 80, y: 905, t: tp7, n: 6, angle: [-30, 30], speed: [250, 520], size: [4, 8], seed: 950 + i });
    cue('squish', tp7, { n: i });
  });
  cue('roll', tRoll0, { dur: tRoll1 - tRoll0 });
  label(s7, 'NEVER TWIST IT', 540, 1206, { size: 26, color: C.warm, t: W('tw', 'out') });
  drift(s7, CUT.towel, CUT.dry + 0.3, 1.04, 540, 900);

  // =====================================================================
  // 8 · DRY FLAT IN THE SHADE (cream), then SUN FADES THREAD
  // =====================================================================
  const s8 = scene('dry', 'cream');
  trans('whip', s7, s8, CUT.dry, { dir: 'right' });
  chip(s8, 8, CUT.dry + 0.02);
  headline(s8, [{ text: 'DRY FLAT', y: 470 }, { text: 'IN SHADE', y: 582, color: C.green }], CUT.dry + 0.04);
  const sn8 = I.sun(s8.back, 900, 700, 56);
  live(s8, t => sn8.rays.setAttribute('transform', `rotate(${(t * 40).toFixed(1)})`));
  I.rack(s8.back, 540, 1000, 780, 300);
  const shadow = S('path', { d: 'M180,880 L880,880 L940,1150 L120,1150 Z', fill: C.ink, opacity: 0 }, s8.back);
  const t8 = Obj(s8.back, { x: 540, y: 560, s: 0.56, o: 0 });
  I.tee(t8.g, 0, 0, 1, { sw: 7 / 0.56 });
  const tLand = W('f1', 'flat') + 0.04;
  tl.to(t8.st, { o: 1, duration: 0.05 }, tLand - 0.32);
  tl.to(t8.st, { y: 1000, duration: 0.3, ease: 'power3.in' }, tLand - 0.3);
  tl.to(t8.st, { sy: 0.8, sx: 1.1, duration: 0.06 }, tLand);
  tl.to(t8.st, { sy: 1, sx: 1, duration: 0.3, ease: 'elastic.out(1.2,0.4)' }, tLand + 0.06);
  cue('flap', tLand);
  shake(tLand, 8, 0.2);
  const umb = Obj(s8.front, { x: -400, y: 790, s: 0.85, r: -12 });
  I.umbrella(umb.g, 0, 0, 1);
  const tShade = W('f1', 'shade') - 0.12;
  tl.to(umb.st, { x: 520, r: 0, duration: 0.32, ease: 'back.out(1.4)' }, tShade);
  tl.to(shadow, { attr: { opacity: 0.16 }, duration: 0.25 }, tShade + 0.15);
  cue('whoosh', tShade, { soft: true });
  label(s8, 'LAY IT FLAT, IT KEEPS ITS SHAPE', 540, 1206, { size: 26, color: C.green, t: W('f1', 'flat') + 0.1 });
  badgeOk(s8, 900, 860, 40, W('f1', 'shade') + 0.2);

  const s8b = scene('dry2', 'cream');
  trans('flash', s8, s8b, cs('f2') - 0.03, { color: C.mari });
  header(s8b, 8, [{ text: 'DRY FLAT', y: 470 }, { text: 'IN SHADE', y: 582, color: C.green }]);
  const bigSun = I.sun(s8b.back, 540, 740, 84);
  live(s8b, t => { bigSun.rays.setAttribute('transform', `rotate(${(t * 70).toFixed(1)}) scale(${(1 + 0.08 * Math.sin(t * 14)).toFixed(3)})`); });
  const beams = S('g', {}, s8b.back);
  for (const dx of [-170, -60, 60, 170]) S('line', { x1: 540 + dx * 0.4, y1: 830, x2: 540 + dx, y2: 900, stroke: C.mari, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-dasharray': '18 16' }, beams);
  live(s8b, t => [...beams.children].forEach(l => l.setAttribute('stroke-dashoffset', (-t * 200).toFixed(1))));
  const f8 = I.flower(s8b.back, 540, 1035, 1.25, 16);
  const tFade0 = W('f2', 'fades') - 0.15, tFade1 = W('f2', 'thread') + 0.25;
  live(s8b, t => f8.petals.forEach((p, i) => {
    const k = seg(t, tFade0 + i * 0.03, tFade0 + i * 0.03 + 0.4) * (t < tFade1 + 1 ? 1 : 1);
    p.firstChild.setAttribute('fill', gsap.utils.interpolate(C.mari, '#F1E6C8', k));
  }));
  label(s8b, 'DIRECT SUN FADES THE COLOURS', 540, 1206, { size: 26, color: '#6B675F', t: W('f2', 'fades') });
  stampNo(s8b, 540, 740, 140, W('f2', 'thread') - 0.25);
  cue('sizzle', tFade0, { dur: tFade1 - tFade0 });
  drift(s8, CUT.dry, cs('f2'), 1.04, 540, 950);
  drift(s8b, cs('f2'), CUT.iron + 0.3, 1.05, 540, 900);

  // =====================================================================
  // 9 · IRON ON THE REVERSE (ink): a cross-section
  // =====================================================================
  const s9 = scene('iron', 'dark');
  trans('iris', s8b, s9, CUT.iron, { at: [540, 740] });
  chip(s9, 9, CUT.iron + 0.02);
  headline(s9, [{ text: 'IRON ON THE', y: 470 }, { text: 'REVERSE', y: 582, color: C.mari }], CUT.iron + 0.04);
  label(s9, 'LOW TO MEDIUM HEAT', 540, 676, { size: 28, color: '#CFC9BF', t: W('ir', 'Iron') + 0.15 });
  S('rect', { x: 110, y: 1040, width: 860, height: 26, rx: 10, fill: C.lint }, s9.back);
  const BUMPS = [300, 380, 460, 540, 620, 700, 780];
  let towelTop = 'M140,1040 L140,992';
  for (let x = 140; x <= 940; x += 10) {
    const dip = BUMPS.reduce((m, bx) => Math.max(m, Math.max(0, 1 - Math.abs(x - bx) / 34)), 0);
    towelTop += ` L${x},${(992 + dip * 10 + Math.sin(x / 9) * 2).toFixed(1)}`;
  }
  S('path', { d: towelTop + ' L940,1040 Z', fill: '#EFE7DA' }, s9.back);
  for (let x = 156; x < 930; x += 26) S('path', { d: `M${x},1034 q6,-14 12,0`, fill: 'none', stroke: '#CFC4B2', 'stroke-width': 3 }, s9.back);
  const bumps = BUMPS.map(bx => { const e = S('ellipse', { cx: bx, cy: 976, rx: 28, ry: 18, fill: C.mari, stroke: C.ink, 'stroke-width': 3 }, s9.back); return e; });
  S('rect', { x: 130, y: 944, width: 820, height: 22, rx: 8, fill: C.warm }, s9.back);
  S('line', { x1: 150, x2: 930, y1: 955, y2: 955, stroke: '#C9C1B3', 'stroke-width': 3, 'stroke-dasharray': '12 9' }, s9.back);
  const ir = Obj(s9.back, { x: 540, y: 942, s: 0.78 });
  I.iron(ir.g, 0, 0, 1);
  const ironX = t => 540 + 240 * Math.sin(2 * Math.PI * 0.55 * (t - CUT.iron));
  live(s9, t => { ir.st.x = ironX(t); ir.st.r = -2 * Math.cos(2 * Math.PI * 0.55 * (t - CUT.iron)); });
  s9.emit({
    t0: CUT.iron, t1: CUT.acc, n: 46, life: 1.0, seed: 909,
    spawn: (r, i, tb) => ({ x: ironX(tb) + R(r, -100, 120), y: 932, vy: -R(r, 90, 170), r: R(r, 14, 26), ph: R(r, 0, 6) }),
    draw(ctx, p, age) {
      const x = p.x + Math.sin(age * 3 + p.ph) * 12, y = p.y + p.vy * age, r = p.r * (1 + age * 1.5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.45 * clamp(age / 0.15) * clamp((p.life - age) / 0.5);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
    },
  });
  cue('steam', CUT.iron + 0.1, { dur: 3.6, soft: true });
  cue('glide', CUT.iron + 0.1, { dur: 3.6 });
  label(s9, 'BACK OF THE FABRIC', 830, 790, { size: 24, color: C.warm, t: W('ir', 'reverse') + 0.05 });
  leader(s9, 900, 804, 940, 952, W('ir', 'reverse') + 0.05, C.warm);
  label(s9, 'SOFT TOWEL', 230, 1126, { size: 24, color: C.warm, t: W('ir', 'towel') });
  leader(s9, 230, 1100, 250, 1020, W('ir', 'towel'), C.warm);
  label(s9, 'STITCHES FACE DOWN', 660, 1126, { size: 24, color: C.mari, t: W('ir', 'stitches') });
  leader(s9, 640, 1100, 620, 990, W('ir', 'stitches'), C.mari);
  const tRaise = W('ir', 'raised') - 0.05;
  bumps.forEach((b, i) => {
    tl.to(b, { attr: { ry: 26, cy: 970 }, duration: 0.14, ease: 'power2.out' }, tRaise + i * 0.03);
    tl.to(b, { attr: { ry: 18, cy: 976 }, duration: 0.3, ease: 'elastic.out(1.2,0.4)' }, tRaise + 0.14 + i * 0.03);
  });
  FX.sparkles(s9, { x: 540, y: 976, t: tRaise + 0.1, n: 14, radius: [40, 260], color: C.mari });
  badgeOk(s9, 190, 800, 44, tRaise + 0.12);
  drift(s9, CUT.iron, CUT.acc + 0.3, 1.03, 540, 940);

  // =====================================================================
  // + ACCESSORIES: CAPS & BAGS, SPOT CLEAN (marigold)
  // =====================================================================
  const s10 = scene('acc', 'mari');
  trans('flash', s9, s10, CUT.acc, { color: C.warm });
  chip(s10, 10, CUT.acc + 0.02, 'BONUS  ·  ACCESSORIES');
  headline(s10, [{ text: 'CAPS & BAGS', y: 500, size: 116 }], CUT.acc + 0.04);
  const spot = T(s10.inner, 'spot clean only', { fam: 'p', size: 76, wt: 500, color: C.green, y: 600, split: 'words' });
  spot.words.forEach((w, i) => tl.fromTo(w, { clipPath: 'inset(-30% 114% -45% -14%)' }, { clipPath: 'inset(-30% -14% -45% -14%)', duration: 0.3, ease: 'power2.inOut' }, W('a2', 'spot') - 0.06 + i * 0.13));
  const capO = Obj(s10.back, { x: 300, y: 980, s: 0 }), bagO = Obj(s10.back, { x: 790, y: 930, s: 0 });
  I.cap(capO.g, 0, 0, 1.05);
  I.bag(bagO.g, 0, 0, 0.88);
  tl.to(capO.st, { s: 1, duration: 0.34, ease: 'back.out(2.2)' }, W('a1', 'Caps') - 0.04);
  tl.fromTo(capO.st, { r: -30 }, { r: 0, duration: 0.4, ease: 'back.out(2)' }, W('a1', 'Caps') - 0.04);
  tl.to(bagO.st, { s: 1, duration: 0.34, ease: 'back.out(2.2)' }, W('a1', 'bags') - 0.04);
  tl.fromTo(bagO.st, { r: 30 }, { r: 0, duration: 0.4, ease: 'back.out(2)' }, W('a1', 'bags') - 0.04);
  cue('pop', W('a1', 'Caps')); cue('pop', W('a1', 'bags'));
  const STAIN = 'M0,-30 C20,-34 34,-14 30,4 C40,18 22,36 4,30 C-12,42 -34,26 -30,8 C-44,-6 -24,-30 0,-30 Z';
  const stains = [[262, 935, 1.0], [842, 1010, 1.1]].map(([x, y, s]) => {
    const st = S('path', { d: STAIN, transform: `translate(${x},${y}) scale(${s})`, fill: C.stain, opacity: 0 }, s10.back);
    tl.fromTo(st, { attr: { opacity: 0 } }, { attr: { opacity: 0.9 }, duration: 0.08, immediateRender: false }, cs('a2') - 0.12);
    return st;
  });
  cue('splat', cs('a2') - 0.12);
  const cl10 = Obj(s10.front, { x: 1250, y: 720, s: 0.58, r: 20 });
  I.cloth(cl10.g, 0, 0, 1);
  const dabs = [[W('a2', 'spot'), 262, 900, 0], [W('a2', 'clean'), 262, 900, 0], [W('a2', 'damp'), 842, 975, 1], [W('a2', 'cloth'), 842, 975, 1]];
  tl.to(cl10.st, { x: 262, y: 830, r: -6, duration: 0.3, ease: 'power3.out' }, W('a2', 'Just') - 0.1);
  tl.to(cl10.st, { x: 842, y: 905, r: 6, duration: 0.26, ease: 'power3.inOut' }, W('a2', 'with') - 0.12);
  dabs.forEach(([td, x, y, si], k) => {
    tl.to(cl10.st, { y, sy: 0.8, sx: 1.1, duration: 0.08, ease: 'power2.in' }, td - 0.08);
    tl.to(cl10.st, { y: y - 70, sy: 1, sx: 1, duration: 0.14, ease: 'power2.out' }, td);
    tl.to(stains[si], { attr: { opacity: k % 2 ? 0 : 0.45 }, duration: 0.12 }, td);
    cue('dab', td);
    FX.splash(s10, { x, y: y + 40, t: td, n: 6, speed: [120, 300], size: [3, 6], life: 0.45, color: C.water });
    if (k % 2) FX.sparkles(s10, { x, y: y + 40, t: td + 0.06, n: 9, radius: [30, 110], color: C.warm });
  });
  tl.to(cl10.st, { x: 1250, y: 640, r: 30, duration: 0.3, ease: 'power3.in' }, W('a2', 'cloth') + 0.25);
  badgeOk(s10, 440, 770, 38, W('a2', 'clean') + 0.12);
  badgeOk(s10, 940, 760, 38, W('a2', 'cloth') + 0.12);
  label(s10, "DON'T SOAK THEM, THEY LOSE THEIR SHAPE", 540, 1206, { size: 26, color: C.ink, t: W('a2', 'cloth') + 0.18 });
  drift(s10, CUT.acc, CUT.recap + 0.3, 1.04, 540, 900);

  // =====================================================================
  // RECAP  "Be gentle, and it will last for years." (ink)
  // =====================================================================
  const s11 = scene('recap', 'dark');
  trans('slats', s10, s11, CUT.recap, { color: C.ink });
  headline(s11, [{ text: 'BE GENTLE', y: 470, size: 118 }], CUT.recap + 0.04);
  const yrs = T(s11.inner, 'it will last for years.', { fam: 'p', size: 78, wt: 500, color: C.mari, y: 570, split: 'words' });
  yrs.words.forEach((w, i) => tl.fromTo(w, { clipPath: 'inset(-30% 114% -45% -14%)' }, { clipPath: 'inset(-30% -14% -45% -14%)', duration: 0.24, ease: 'power2.inOut' }, W('o1', ['it', 'will', 'last', 'for', 'years'][i]) - 0.04));
  const tiles = [];
  const TILE_T0 = CUT.recap + 0.1, TILE_GAP = (W('o1', 'years') - 0.15 - TILE_T0) / 8;
  for (let i = 0; i < 9; i++) {
    const cx = 300 + (i % 3) * 240, cy = 720 + Math.floor(i / 3) * 205;
    const tile = Obj(s11.back, { x: cx, y: cy, s: 0 });
    S('rect', { x: -105, y: -90, width: 210, height: 180, rx: 28, fill: C.shade }, tile.g);
    const num = S('text', { x: -80, y: -52, fill: C.ink, style: 'font: 900 30px Montserrat' }, tile.g);
    num.textContent = String(i + 1);
    const glyph = S('g', { transform: 'translate(8,10)' }, tile.g);
    [
      () => I.cloth(glyph, 0, 0, 0.5),
      () => I.tee(glyph, 0, 0, 0.21, { inside: true, sw: 7 / 0.21 }),
      () => { const th = I.thermometer(S('g', { transform: 'scale(0.55)' }, glyph), 0, -80, 40); th.set(0.25, '#5FA7A0'); },
      () => I.bottle(glyph, 0, 18, 0.33),
      () => { for (const dy of [-22, 4, 30]) S('path', { d: `M-60,${dy} q15,-14 30,0 t30,0 t30,0 t30,0`, fill: 'none', stroke: '#4F978F', 'stroke-width': 8, 'stroke-linecap': 'round' }, glyph); },
      () => { for (const [dx, dy] of [[-30, -10], [0, 20], [30, -16]]) S('path', { d: `M${dx},${dy - 30} Q${dx + 18},${dy} ${dx},${dy + 14} Q${dx - 18},${dy} ${dx},${dy - 30} Z`, fill: C.water, stroke: C.ink, 'stroke-width': 4 }, glyph); },
      () => { S('rect', { x: -70, y: -34, width: 140, height: 68, rx: 34, fill: C.cream, stroke: C.ink, 'stroke-width': 6 }, glyph); S('path', { d: 'M48,-20 a20,20 0 1 1 -1,0 m1,10 a10,10 0 1 1 -1,0', fill: 'none', stroke: C.ink, 'stroke-width': 4 }, glyph); },
      () => I.umbrella(glyph, 0, 30, 0.22),
      () => I.iron(glyph, 0, 34, 0.36),
    ][i]();
    const tick = S('g', { transform: 'translate(78,62)' }, tile.g);
    S('circle', { r: 22, fill: C.green }, tick);
    S('path', { d: 'M-9,0 L-2,7 L10,-7', fill: 'none', stroke: C.warm, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, tick);
    const tt = TILE_T0 + i * TILE_GAP;
    tl.to(tile.st, { s: 1, duration: 0.26, ease: 'back.out(2.4)' }, tt);
    tl.fromTo(tile.st, { r: (i % 2 ? 1 : -1) * 18 }, { r: 0, duration: 0.3, ease: 'back.out(2)' }, tt);
    cue('tick', tt, { n: i });
    tiles.push({ tile, tt });
  }
  const tYears = W('o1', 'years');
  tiles.forEach(({ tile }, i) => {
    tl.to(tile.st, { y: '-=26', duration: 0.12, ease: 'power2.out' }, tYears + i * 0.025);
    tl.to(tile.st, { y: '+=26', duration: 0.3, ease: 'bounce.out' }, tYears + 0.12 + i * 0.025);
  });
  FX.sparkles(s11, { x: 540, y: 920, t: tYears + 0.05, n: 22, radius: [120, 420], size: [12, 26], color: C.mari });
  cue('shimmer', tYears);
  drift(s11, CUT.recap, CUT.end + 0.3, 1.04, 540, 900);

  // =====================================================================
  // END  "Save this for wash day."  + brand (cream)
  // =====================================================================
  const s12 = scene('end', 'cream');
  trans('iris', s11, s12, CUT.end, { at: [540, 900] });
  s12.win[1] = LEN + 1;
  const bm = Obj(s12.back, { x: 540, y: 410, s: 0 });
  const bmIcon = I.bookmark(bm.g, 0, 0, 1);
  tl.to(bm.st, { s: 1, duration: 0.3, ease: 'back.out(2.6)' }, CUT.end + 0.04);
  const tSave = W('o2', 'Save') + 0.1;
  tl.to(bmIcon.fill, { attr: { opacity: 1 }, duration: 0.08 }, tSave);
  tl.to(bm.st, { s: 1.25, duration: 0.08 }, tSave);
  tl.to(bm.st, { s: 1, duration: 0.4, ease: 'elastic.out(1.2,0.4)' }, tSave + 0.08);
  FX.sparkles(s12, { x: 540, y: 410, t: tSave + 0.02, n: 12, radius: [90, 200], size: [12, 22] });
  cue('ding', tSave);
  const sv = T(s12.inner, 'SAVE THIS', { size: 110, wt: 900, color: C.ink, y: 630, split: 'words', mask: true });
  sv.words.forEach((w, i) => tl.fromTo(w, { yPercent: 118 }, { yPercent: 0, duration: 0.28, ease: 'back.out(1.8)' }, W('o2', ['Save', 'this'][i]) - 0.05));
  const wd = T(s12.inner, 'for wash day.', { fam: 'p', size: 84, wt: 500, color: C.green, y: 735, split: 'words' });
  wd.words.forEach((w, i) => tl.fromTo(w, { clipPath: 'inset(-30% 114% -45% -14%)' }, { clipPath: 'inset(-30% -14% -45% -14%)', duration: 0.28, ease: 'power2.inOut' }, W('o2', ['for', 'wash', 'day'][i]) - 0.04));
  const tBrand = ce('o2') + 0.05;
  const f12 = I.flower(s12.back, 540, 850, 0.5, 16);
  f12.petals.forEach((p, i) => { gsap.set(p, { scale: 0, transformOrigin: '50% 100%' }); tl.to(p, { scale: 1, duration: 0.3, ease: 'back.out(2)' }, tBrand + i * 0.03); });
  gsap.set(f12.center, { scale: 0, transformOrigin: '50% 50%' });
  tl.to(f12.center, { scale: 1, duration: 0.3, ease: 'back.out(2)' }, tBrand);
  live(s12, t => f12.spin.setAttribute('transform', `rotate(${((t - tBrand) * 10).toFixed(2)})`));
  const vt = T(s12.inner, 'Vee Threads', { fam: 'p', size: 140, wt: 500, color: C.ink, y: 1010, split: 'words' });
  vt.words.forEach((w, i) => tl.fromTo(w, { clipPath: 'inset(-30% 114% -45% -14%)' }, { clipPath: 'inset(-30% -14% -45% -14%)', duration: i ? 0.5 : 0.36, ease: 'power2.inOut' }, tBrand + 0.2 + i * 0.28));
  const dash = S('line', { x1: 250, x2: 790, y1: 1050, y2: 1050, stroke: C.green, 'stroke-width': 9, 'stroke-dasharray': '30 20', 'stroke-linecap': 'round' }, s12.back);
  const dashClip = E.id('dc');
  const dcr = S('rect', { x: 240, y: 1030, width: 0, height: 40 }, S('clipPath', { id: dashClip }, s12.back));
  dash.setAttribute('clip-path', `url(#${dashClip})`);
  tl.to(dcr, { attr: { width: 570 }, duration: 0.5, ease: 'power2.inOut' }, tBrand + 0.75);
  const knot = S('path', { d: 'M790,1050 C806,1050 818,1072 836,1068 C856,1064 852,1038 834,1036 C814,1034 812,1060 828,1066 C840,1070 852,1066 862,1060', fill: 'none', stroke: C.green, 'stroke-width': 7, 'stroke-linecap': 'round' }, s12.back);
  drawOn(knot, tBrand + 1.2, 0.3);
  cue('threadpull', tBrand + 0.72);
  cue('knot', tBrand + 1.45);
  const site = E.div(s12.inner, '', { position: 'absolute', left: '318px', top: '1086px', width: '444px', height: '88px', borderRadius: '44px', background: C.ink, color: C.warm, font: '700 42px Montserrat', lineHeight: '88px', textAlign: 'center' });
  site.textContent = 'veethreads.com';
  tl.fromTo(site, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.2)' }, tBrand + 1.55);
  cue('pop', tBrand + 1.57);
  tl.to(site, { scale: 1.05, duration: 0.45, ease: 'sine.inOut', yoyo: true, repeat: 3 }, tBrand + 2.2);
  live(s12, t => { if (t > CUT.end + 0.4) bm.g.firstChild.setAttribute('transform', `rotate(${(Math.sin((t - CUT.end) * 3) * 4).toFixed(2)})`); });
  drift(s12, CUT.end, LEN, 1.03, 540, 800);

  // =====================================================================
  // captions: the voiceover word by word, styled by meaning
  // =====================================================================
  captions([
    { ids: ['h1'], theme: 'dark', keys: { 3: 'k' } },
    { ids: ['h2'], theme: 'dark', keys: { 1: 'k', 4: 'k' } },
    { ids: ['h3'], theme: 'green', keys: { 5: 'h' } },
    { ids: ['t1'], theme: 'cream', keys: { 1: 'k', 3: 'k' } },
    { ids: ['t2'], theme: 'cream', keys: { 2: 'k', 3: 'k', 6: 'h', 7: 'h', 8: 'h' } },
    { ids: ['in'], theme: 'green', keys: { 2: 'k', 3: 'k' } },
    { ids: ['c1'], theme: 'cream', keys: { 1: 'k', 2: 'k' } },
    { ids: ['c2'], theme: 'cream', keys: { 0: 'x', 4: 'x', 6: 'x' } },
    { ids: ['d1'], theme: 'cream', keys: { 2: 'k', 3: 'k', 5: 'h', 6: 'h' } },
    { ids: ['d2'], theme: 'cream', keys: { 1: 'x' } },
    { ids: ['g1'], theme: 'cream', keys: { 0: 'h', 1: 'h' } },
    { ids: ['g2'], theme: 'cream', keys: { 1: 'x', 3: 'x' } },
    { ids: ['r1'], theme: 'dark', keys: { 2: 'k', 3: 'k', 7: 'h' } },
    { ids: ['tw'], theme: 'green', keys: { 0: 'k', 4: 'k', 6: 'k' } },
    { ids: ['f1'], theme: 'cream', keys: { 2: 'k', 5: 'h' } },
    { ids: ['f2'], theme: 'cream', keys: { 0: 'x', 1: 'x' } },
    { ids: ['ir'], theme: 'dark', keys: { 3: 'k', 6: 'k', 11: 'h' } },
    { ids: ['a1'], theme: 'mari', keys: { 0: 'k', 2: 'k' } },
    { ids: ['a2'], theme: 'mari', keys: { 1: 'h', 2: 'h', 5: 'h', 6: 'h' } },
    { ids: ['o1'], theme: 'dark', keys: { 1: 'k', 7: 'h' }, until: CUT.end - 0.05 },
  ]);

  DYN.push(poseObjs);
  E.finish(LEN);
})();
