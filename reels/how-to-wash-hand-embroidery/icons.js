/* Flat illustrations in the Vee Threads style: ink outlines, warm-white
   fills, marigold flowers, thread green for anything made by hand. Every
   builder draws around a local origin so scenes can place and animate it. */
window.Icons = function Icons(E) {
  const { C, S } = E;
  const g = (parent, x = 0, y = 0, s = 1, r = 0) => S('g', { transform: `translate(${x},${y}) rotate(${r}) scale(${s})` }, parent);

  /** embroidered flower; petals can be animated one by one */
  function flower(parent, cx, cy, sc, n = 16, o = {}) {
    const root = S('g', { transform: `translate(${cx},${cy}) scale(${sc})` }, parent);
    const spin = S('g', {}, root);
    const petals = [];
    for (let i = 0; i < n; i++) {
      const pg = S('g', { transform: `rotate(${(i * 360) / n})` }, spin);
      const fill = S('g', {}, pg);
      S('path', { d: E.PETAL, fill: o.color || C.mari }, fill);
      if (o.veins !== false) for (const d of ['M0,-33 L0,-95', 'M-5,-38 Q-9,-62 -6,-88', 'M5,-38 Q9,-62 6,-88'])
        S('path', { d, fill: 'none', stroke: o.veinColor || C.vein, 'stroke-width': 1.7, 'stroke-linecap': 'round' }, fill);
      petals.push(fill);
    }
    const center = S('g', {}, spin);
    S('circle', { r: 31, fill: o.centerColor || C.ink }, center);
    for (let k = 0; k < 19; k++) {
      const r = 5.1 * Math.sqrt(k + 0.5), a = k * 2.39996;
      S('circle', { cx: r * Math.cos(a), cy: r * Math.sin(a), r: 2.5, fill: o.dotColor || C.mari }, center);
    }
    return { root, spin, petals, center };
  }

  // T-shirt outline around its own centre (520 x 458 at scale 1)
  const TEE = 'M-105,-229 Q0,-145 105,-229 L224,-175 L260,-57 L172,-25 L154,-70 L154,229 L-154,229 L-154,-70 L-172,-25 L-260,-57 L-224,-175 Z';
  function tee(parent, x, y, s, o = {}) {
    const root = g(parent, x, y, s);
    const body = S('g', {}, root);
    S('path', { d: TEE, fill: o.inside ? C.inside : C.fabric, stroke: C.ink, 'stroke-width': o.sw ?? 7 / s, 'stroke-linejoin': 'round' }, body);
    let fl = null;
    if (o.inside) {
      // seams, neck tape, care label and the back of the embroidery
      const seam = { fill: 'none', stroke: '#B9AE9C', 'stroke-width': 3, 'stroke-dasharray': '10 7', 'stroke-linecap': 'round' };
      S('path', { d: 'M-142,-62 L-142,216 M142,-62 L142,216 M-212,-168 L-150,-150 M212,-168 L150,-150', ...seam }, body);
      S('path', { d: 'M-92,-216 Q0,-160 92,-216', fill: 'none', stroke: '#B9AE9C', 'stroke-width': 5 }, body);
      S('rect', { x: -22, y: -206, width: 44, height: 32, rx: 4, fill: C.warm, stroke: '#B9AE9C', 'stroke-width': 2.5 }, body);
      S('path', { d: 'M-12,-196 L12,-196 M-12,-188 L8,-188 M-12,-180 L12,-180', stroke: '#B9AE9C', 'stroke-width': 2 }, body);
      const back = S('g', { transform: 'translate(0,-64)' }, body);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, r1 = 34, r2 = 92;
        S('path', { d: `M${r1 * Math.cos(a)},${r1 * Math.sin(a)} Q${(r2 * 0.7) * Math.cos(a + 0.25)},${(r2 * 0.7) * Math.sin(a + 0.25)} ${r2 * Math.cos(a)},${r2 * Math.sin(a)}`, fill: 'none', stroke: '#D9A43A', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.85 }, back);
        S('circle', { cx: r2 * Math.cos(a), cy: r2 * Math.sin(a), r: 4.5, fill: '#C8901F' }, back);
      }
      S('circle', { r: 26, fill: 'none', stroke: '#5B5650', 'stroke-width': 5, 'stroke-dasharray': '6 5' }, back);
    } else if (o.flower !== false) fl = flower(body, 0, -64, 1, 16, o.flowerOpts || {});
    return { root, body, flower: fl };
  }

  /** cut-away basin; water is redrawn every frame by update() */
  function basin(sc, cx, cy, w, h, o = {}) {
    const hw = w / 2, rimRy = w * 0.075;
    const body = `M${cx - hw},${cy} C${cx - hw + 8},${cy + h * 0.6} ${cx - hw * 0.8},${cy + h} ${cx - hw * 0.62},${cy + h} L${cx + hw * 0.62},${cy + h} C${cx + hw * 0.8},${cy + h} ${cx + hw - 8},${cy + h * 0.6} ${cx + hw},${cy} Z`;
    const cid = E.id('basin');
    S('path', { d: body }, S('clipPath', { id: cid }, sc.back));
    const back = S('g', {}, sc.back);
    S('path', { d: body, fill: o.backFill || '#F8F4EC', opacity: 0.85 }, back);
    S('ellipse', { cx, cy, rx: hw, ry: rimRy, fill: '#E4DACA' }, back);
    const content = S('g', { 'clip-path': `url(#${cid})` }, back);
    const water = S('path', { fill: o.water || C.water, opacity: o.waterOpacity ?? 0.78, 'clip-path': `url(#${cid})` }, back);
    const foamLine = S('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 5, opacity: 0.8, 'stroke-linecap': 'round', 'clip-path': `url(#${cid})` }, back);
    const front = S('g', {}, sc.front);
    S('path', { d: body, fill: 'none', stroke: C.ink, 'stroke-width': 8, 'stroke-linejoin': 'round' }, front);
    S('ellipse', { cx, cy, rx: hw, ry: rimRy, fill: 'none', stroke: C.ink, 'stroke-width': 8 }, front);
    S('path', { d: `M${cx - hw * 0.72},${cy + h * 0.3} Q${cx - hw * 0.7},${cy + h * 0.62} ${cx - hw * 0.52},${cy + h * 0.82}`, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0.7 }, front);
    const clip = new Path2D(body);
    /** level: surface height from the rim (px), tilt: slosh slope, amp: wave height */
    function update(t, level, tilt = 0, amp = 7, color) {
      const y0 = cy + level;
      let d = `M${cx - hw - 10},${cy + h + 20}`;
      let crest = '';
      for (let x = cx - hw - 10; x <= cx + hw + 10; x += 12) {
        const y = y0 + Math.sin(x / 38 - t * 5.2) * amp + Math.sin(x / 17 + t * 7.7) * amp * 0.35 + tilt * (x - cx) / hw;
        d += ` L${x},${y.toFixed(1)}`;
        crest += `${crest ? ' L' : 'M'}${x},${(y + 4).toFixed(1)}`;
      }
      d += ` L${cx + hw + 10},${cy + h + 20} Z`;
      water.setAttribute('d', d);
      foamLine.setAttribute('d', crest);
      if (color) water.setAttribute('fill', color);
    }
    return { back, front, content, water, foamLine, clip, clipId: cid, update, cx, cy, w, h };
  }

  function thermometer(parent, x, top, bottom) {
    const root = S('g', {}, parent);
    S('rect', { x: x - 24, y: top, width: 48, height: bottom - top, rx: 24, fill: C.warm, stroke: C.ink, 'stroke-width': 7 }, root);
    S('circle', { cx: x, cy: bottom + 22, r: 42, fill: C.warm, stroke: C.ink, 'stroke-width': 7 }, root);
    for (let i = 0; i < 7; i++) {
      const y = top + 40 + i * ((bottom - top - 60) / 6);
      S('line', { x1: x + 34, x2: x + (i % 3 === 0 ? 58 : 48), y1: y, y2: y, stroke: C.ink, 'stroke-width': 5, 'stroke-linecap': 'round' }, root);
    }
    const col = S('rect', { x: x - 11, width: 22, rx: 11, fill: C.mari }, root);
    const bulb = S('circle', { cx: x, cy: bottom + 22, r: 28, fill: C.mari }, root);
    function set(f, color) {
      const yTop = lerpN(bottom + 10, top + 22, f);
      col.setAttribute('y', yTop); col.setAttribute('height', bottom + 22 - yTop);
      col.setAttribute('fill', color); bulb.setAttribute('fill', color);
    }
    return { root, set };
  }
  const lerpN = (a, b, f) => a + (b - a) * f;

  function bottle(parent, x, y, s = 1, r = 0) {
    const root = g(parent, x, y, s, r);
    S('path', { d: 'M-70,-82 Q-70,-112 -40,-124 L-26,-132 L-26,-150 L26,-150 L26,-132 L40,-124 Q70,-112 70,-82 L70,110 Q70,128 52,128 L-52,128 Q-70,128 -70,110 Z', fill: C.warm, stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, root);
    S('rect', { x: -32, y: -192, width: 64, height: 46, rx: 9, fill: C.green, stroke: C.ink, 'stroke-width': 7 }, root);
    S('path', { d: 'M-8,-192 L-4,-214 L4,-214 L8,-192 Z', fill: C.green, stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, root);
    S('rect', { x: -58, y: -40, width: 116, height: 110, rx: 10, fill: C.green }, root);
    const t1 = S('text', { x: 0, y: 14, 'text-anchor': 'middle', fill: C.warm, style: 'font: 900 34px Montserrat' }, root); t1.textContent = 'MILD';
    const t2 = S('text', { x: 0, y: 46, 'text-anchor': 'middle', fill: C.warm, style: 'font: 600 17px Montserrat; letter-spacing: 2px' }, root); t2.textContent = 'pH NEUTRAL';
    S('path', { d: 'M-50,-70 Q-52,-20 -48,40', fill: 'none', stroke: '#FFFFFF', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.8 }, root);
    return { root, nozzle: [0, -214] };
  }

  function jug(parent, x, y, s = 1) {
    const root = g(parent, x, y, s);
    S('path', { d: 'M-80,-60 Q-80,-120 -30,-130 L-30,-160 L20,-160 L20,-130 Q80,-120 80,-60 L80,120 Q80,140 60,140 L-60,140 Q-80,140 -80,120 Z', fill: '#B9B4AC', stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, root);
    S('path', { d: 'M20,-110 Q120,-120 110,-30 Q104,10 80,10', fill: 'none', stroke: C.ink, 'stroke-width': 14, 'stroke-linecap': 'round' }, root);
    S('rect', { x: -36, y: -186, width: 62, height: 30, rx: 6, fill: C.lint, stroke: C.ink, 'stroke-width': 6 }, root);
    S('rect', { x: -66, y: -10, width: 132, height: 90, rx: 8, fill: '#77736D' }, root);
    const t = S('text', { x: 0, y: 48, 'text-anchor': 'middle', fill: C.warm, style: 'font: 900 30px Montserrat' }, root); t.textContent = 'BLEACH';
    return { root };
  }

  function brush(parent, x, y, s = 1, r = 0) {
    const root = g(parent, x, y, s, r);
    S('rect', { x: -110, y: -34, width: 220, height: 52, rx: 20, fill: C.lint, stroke: C.ink, 'stroke-width': 7 }, root);
    for (let i = 0; i < 11; i++) S('line', { x1: -92 + i * 18.4, x2: -92 + i * 18.4, y1: 22, y2: 62, stroke: C.ink, 'stroke-width': 7, 'stroke-linecap': 'round' }, root);
    return { root };
  }

  function towel(parent, x, y, w, h) {
    const root = S('g', {}, parent);
    S('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 14, fill: C.cream, stroke: C.ink, 'stroke-width': 7 }, root);
    for (const k of [0.1, 0.16, 0.84, 0.9]) S('rect', { x: x - w / 2 + w * k - 8, y: y - h / 2, width: 16, height: h, fill: C.mari }, root);
    for (let i = 0; i < 18; i++) {
      const yy = y - h / 2 + 14 + i * ((h - 28) / 17);
      S('line', { x1: x - w / 2 - 16, x2: x - w / 2, y1: yy, y2: yy, stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, root);
      S('line', { x1: x + w / 2, x2: x + w / 2 + 16, y1: yy, y2: yy, stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, root);
    }
    return { root };
  }

  function rack(parent, x, y, w, h) {
    const root = S('g', {}, parent);
    S('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 16, fill: 'rgba(135,131,125,.12)', stroke: C.ink, 'stroke-width': 8 }, root);
    for (let i = 1; i < 12; i++) S('line', { x1: x - w / 2 + (w * i) / 12, x2: x - w / 2 + (w * i) / 12, y1: y - h / 2, y2: y + h / 2, stroke: C.lint, 'stroke-width': 3 }, root);
    for (let i = 1; i < 8; i++) S('line', { x1: x - w / 2, x2: x + w / 2, y1: y - h / 2 + (h * i) / 8, y2: y - h / 2 + (h * i) / 8, stroke: C.lint, 'stroke-width': 3 }, root);
    return { root };
  }

  function sun(parent, x, y, r = 70) {
    const root = g(parent, x, y);
    const rays = S('g', {}, root);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      S('line', { x1: Math.cos(a) * (r + 20), y1: Math.sin(a) * (r + 20), x2: Math.cos(a) * (r + 56), y2: Math.sin(a) * (r + 56), stroke: C.mari, 'stroke-width': 14, 'stroke-linecap': 'round' }, rays);
    }
    S('circle', { r, fill: C.mari, stroke: C.ink, 'stroke-width': 7 }, root);
    return { root, rays };
  }

  /** shade canopy: a striped dome with a scalloped hem */
  function umbrella(parent, x, y, s = 1) {
    const root = g(parent, x, y, s);
    const n = 6, Rx = 300, Ry = 170;
    const rim = Array.from({ length: n + 1 }, (_, i) => -Rx + (2 * Rx * i) / n);
    for (let i = 0; i < n; i++) {
      const a = rim[i], b = rim[i + 1];
      const d = `M0,${-Ry} Q${a * 0.62},${-Ry * 0.92} ${a},0 Q${(a + b) / 2},34 ${b},0 Q${b * 0.62},${-Ry * 0.92} 0,${-Ry} Z`;
      S('path', { d, fill: i % 2 ? C.warm : C.green, stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, root);
    }
    S('line', { x1: 0, y1: -Ry - 30, x2: 0, y2: -Ry, stroke: C.ink, 'stroke-width': 10, 'stroke-linecap': 'round' }, root);
    return { root };
  }

  function iron(parent, x, y, s = 1) {
    const root = g(parent, x, y, s);
    S('path', { d: 'M-80,-108 C-80,-178 90,-178 90,-108', fill: 'none', stroke: C.warm, 'stroke-width': 22, 'stroke-linecap': 'round' }, root);
    S('path', { d: 'M-170,0 L150,0 Q185,0 168,-26 L118,-86 Q100,-108 64,-108 L-140,-108 Q-170,-108 -170,-80 Z', fill: C.warm, stroke: C.lint, 'stroke-width': 5, 'stroke-linejoin': 'round' }, root);
    S('rect', { x: -170, y: -12, width: 330, height: 14, rx: 6, fill: '#C9C3B8' }, root);
    S('circle', { cx: -40, cy: -58, r: 20, fill: C.mari, stroke: C.ink, 'stroke-width': 4 }, root);
    S('line', { x1: -40, y1: -58, x2: -40, y2: -74, stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, root);
    return { root };
  }

  function cap(parent, x, y, s = 1) {
    const root = g(parent, x, y, s);
    S('path', { d: 'M96,-6 C160,-14 228,4 250,30 C214,44 150,40 96,26 Z', fill: C.green, stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, root);
    S('path', { d: 'M-130,10 C-138,-112 -48,-170 20,-170 C96,-170 140,-104 130,10 Z', fill: C.warm, stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, root);
    S('path', { d: 'M20,-170 C-10,-110 -18,-50 -14,8 M20,-170 C64,-112 84,-52 88,8', fill: 'none', stroke: '#C9C1B3', 'stroke-width': 4 }, root);
    S('circle', { cx: 20, cy: -172, r: 11, fill: C.green, stroke: C.ink, 'stroke-width': 5 }, root);
    const fl = flower(root, -48, -74, 0.42, 14);
    return { root, flower: fl, spot: [-40, -40] };
  }

  function bag(parent, x, y, s = 1) {
    const root = g(parent, x, y, s);
    S('path', { d: 'M-78,-96 C-80,-230 80,-230 78,-96', fill: 'none', stroke: C.ink, 'stroke-width': 13, 'stroke-linecap': 'round' }, root);
    S('path', { d: 'M-134,-100 L134,-100 L146,150 Q146,170 126,170 L-126,170 Q-146,170 -146,150 Z', fill: C.warm, stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, root);
    S('path', { d: 'M-134,-70 L134,-70', stroke: '#C9C1B3', 'stroke-width': 4, 'stroke-dasharray': '10 7' }, root);
    const fl = flower(root, 0, 46, 0.62, 16);
    return { root, flower: fl, spot: [62, 110] };
  }

  function cloth(parent, x, y, s = 1, r = 0) {
    const root = g(parent, x, y, s, r);
    const body = S('g', {}, root);
    S('path', { d: 'M-80,-66 Q0,-80 80,-66 L86,58 Q0,74 -86,58 Z', fill: '#FFFFFF', stroke: C.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }, body);
    S('path', { d: 'M86,58 L40,62 L82,20 Z', fill: '#E9E4DA', stroke: C.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }, body);
    for (const [dx, dy, rr] of [[-40, -20, 9], [-8, 14, 7], [30, -34, 6], [-52, 30, 6]]) S('path', { d: `M${dx},${dy - rr * 1.6} Q${dx + rr},${dy} ${dx},${dy + rr} Q${dx - rr},${dy} ${dx},${dy - rr * 1.6} Z`, fill: C.water }, body);
    const smudge = S('ellipse', { cx: 0, cy: 6, rx: 34, ry: 22, fill: C.mari, opacity: 0 }, body);
    return { root, body, smudge };
  }

  function magnifier(parent, x, y, s = 1) {
    const root = g(parent, x, y, s);
    S('line', { x1: 60, y1: 60, x2: 140, y2: 140, stroke: C.ink, 'stroke-width': 26, 'stroke-linecap': 'round' }, root);
    S('circle', { r: 86, fill: 'rgba(255,255,255,.25)', stroke: C.ink, 'stroke-width': 14 }, root);
    S('path', { d: 'M-50,-30 Q-40,-56 -14,-62', fill: 'none', stroke: '#FFFFFF', 'stroke-width': 9, 'stroke-linecap': 'round' }, root);
    return { root };
  }

  function washer(parent, x, y) {
    const root = g(parent, x, y);
    S('rect', { x: -300, y: -330, width: 600, height: 660, rx: 46, fill: '#B9B4AC', stroke: C.ink, 'stroke-width': 9 }, root);
    S('rect', { x: -300, y: -330, width: 600, height: 110, rx: 46, fill: '#A6A098', stroke: C.ink, 'stroke-width': 9 }, root);
    for (const [cx, r] of [[-200, 22], [-130, 14]]) S('circle', { cx, cy: -275, r, fill: C.lint, stroke: C.ink, 'stroke-width': 5 }, root);
    S('circle', { cx: 0, cy: 40, r: 232, fill: '#77736D', stroke: C.ink, 'stroke-width': 9 }, root);
    const cid = E.id('door');
    S('circle', { cx: x, cy: y + 40, r: 186 }, S('clipPath', { id: cid }, parent));
    const glass = S('g', {}, root);
    S('circle', { cx: 0, cy: 40, r: 186, fill: '#2F4F4C' }, glass);
    const drum = S('g', { 'clip-path': `url(#${cid})` }, parent);
    const ringG = S('g', {}, parent);
    S('circle', { cx: x, cy: y + 40, r: 192, fill: 'none', stroke: C.ink, 'stroke-width': 18 }, ringG);
    S('path', { d: `M${x - 120},${y - 60} Q${x - 80},${y - 110} ${x - 20},${y - 120}`, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 12, 'stroke-linecap': 'round', opacity: 0.45 }, ringG);
    return { root, drum, door: [x, y + 40] };
  }

  function clock(parent, x, y, r) {
    const root = g(parent, x, y);
    S('circle', { r, fill: 'none', stroke: 'rgba(252,248,240,.2)', 'stroke-width': 10 }, root);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      S('line', { x1: Math.cos(a) * (r - 12), y1: Math.sin(a) * (r - 12), x2: Math.cos(a) * (r - (i % 3 ? 30 : 46)), y2: Math.sin(a) * (r - (i % 3 ? 30 : 46)), stroke: 'rgba(252,248,240,.35)', 'stroke-width': 8, 'stroke-linecap': 'round' }, root);
    }
    const hour = S('line', { x1: 0, y1: 0, x2: 0, y2: -r * 0.48, stroke: 'rgba(252,248,240,.55)', 'stroke-width': 14, 'stroke-linecap': 'round' }, root);
    const minute = S('line', { x1: 0, y1: 0, x2: 0, y2: -r * 0.74, stroke: 'rgba(252,248,240,.55)', 'stroke-width': 9, 'stroke-linecap': 'round' }, root);
    return { root, hour, minute };
  }

  function tap(parent, x, y) {
    const root = g(parent, x, y);
    S('path', { d: 'M-260,-40 L-40,-40 Q40,-40 40,40 L40,70', fill: 'none', stroke: C.ink, 'stroke-width': 54, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' }, root);
    S('path', { d: 'M-260,-40 L-40,-40 Q40,-40 40,40 L40,70', fill: 'none', stroke: '#C9C3B8', 'stroke-width': 38, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' }, root);
    S('rect', { x: -150, y: -100, width: 60, height: 40, rx: 8, fill: C.green, stroke: C.ink, 'stroke-width': 6 }, root);
    S('rect', { x: 8, y: 66, width: 64, height: 20, rx: 6, fill: C.ink }, root);
    return { root, spout: [x + 40, y + 86] };
  }

  function bookmark(parent, x, y, s = 1) {
    const root = g(parent, x, y, s);
    const fill = S('path', { d: 'M-62,-92 L62,-92 L62,92 L0,44 L-62,92 Z', fill: C.mari, opacity: 0 }, root);
    S('path', { d: 'M-62,-92 L62,-92 L62,92 L0,44 L-62,92 Z', fill: 'none', stroke: C.ink, 'stroke-width': 13, 'stroke-linejoin': 'round' }, root);
    return { root, fill };
  }

  return { flower, tee, TEE, basin, thermometer, bottle, jug, brush, towel, rack, sun, umbrella, iron, cap, bag, cloth, magnifier, washer, clock, tap, bookmark, g };
};
