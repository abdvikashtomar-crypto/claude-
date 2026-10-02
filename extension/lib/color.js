// Colour maths: sRGB <-> CIELAB, CIEDE2000 distance, DMC matching and palette extraction.
import { DMC } from "../data/dmc.js";

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function rgbToLab([r, g, b]) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  // D65 reference white
  const x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const y = (R * 0.2126729 + G * 0.7151522 + B * 0.072175) / 1.0;
  const z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// CIEDE2000 colour difference (Sharma et al. 2005).
export function deltaE2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hp = (a, b) => {
    if (a === 0 && b === 0) return 0;
    const h = Math.atan2(b, a) / rad;
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(a1p, b1), h2p = hp(a2p, b2);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbarp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
    else hbarp = (h1p + h2p) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbarp - 30) * rad) +
    0.24 * Math.cos(2 * hbarp * rad) +
    0.32 * Math.cos((3 * hbarp + 6) * rad) -
    0.2 * Math.cos((4 * hbarp - 63) * rad);
  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;

  return Math.sqrt(
    Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2) + Rt * (dCp / Sc) * (dHp / Sh)
  );
}

export const THREADS = DMC.map(([id, name, r, g, b]) => ({
  id,
  name,
  rgb: [r, g, b],
  hex: rgbToHex([r, g, b]),
  lab: rgbToLab([r, g, b]),
}));

const THREAD_BY_ID = new Map(THREADS.map((t) => [t.id.toLowerCase(), t]));

export function findThread(id) {
  return THREAD_BY_ID.get(String(id).trim().toLowerCase()) || null;
}

export function searchThreads(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const exact = findThread(q);
  const rest = THREADS.filter(
    (t) => t !== exact && (t.id.toLowerCase().startsWith(q) || t.name.toLowerCase().includes(q))
  );
  return (exact ? [exact, ...rest] : rest).slice(0, limit);
}

export function nearestThreads(rgb, count = 5, exclude = null) {
  const lab = rgbToLab(rgb);
  return THREADS.filter((t) => t !== exclude)
    .map((t) => ({ thread: t, distance: deltaE2000(lab, t.lab) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

export function matchLabel(distance) {
  if (distance < 2) return "Exact match";
  if (distance < 5) return "Very close";
  if (distance < 10) return "Close";
  return "Nearest available";
}

// Deterministic PRNG so the same photo always gives the same palette.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sqDist = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

// k-means++ clustering in Lab space over RGBA pixel data.
// Returns [{ rgb, share }] sorted by share (0..1), skipping transparent pixels.
export function extractPalette(imageData, k = 6, iterations = 15) {
  const { data } = imageData;
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    pixels.push({ rgb: [data[i], data[i + 1], data[i + 2]], lab: null });
  }
  if (pixels.length === 0) return [];
  for (const p of pixels) p.lab = rgbToLab(p.rgb);
  k = Math.min(k, pixels.length);

  const rand = mulberry32(pixels.length * 31 + k);
  const centroids = [pixels[Math.floor(rand() * pixels.length)].lab.slice()];
  const d2 = new Float64Array(pixels.length);
  while (centroids.length < k) {
    let sum = 0;
    for (let i = 0; i < pixels.length; i++) {
      let best = Infinity;
      for (const c of centroids) best = Math.min(best, sqDist(pixels[i].lab, c));
      d2[i] = best;
      sum += best;
    }
    if (sum === 0) break;
    let r = rand() * sum;
    let idx = 0;
    while (idx < pixels.length - 1 && (r -= d2[idx]) > 0) idx++;
    centroids.push(pixels[idx].lab.slice());
  }

  const assign = new Int32Array(pixels.length);
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = sqDist(pixels[i].lab, centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (assign[i] !== best || it === 0) { assign[i] = best; changed = true; }
    }
    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      const s = sums[assign[i]], l = pixels[i].lab;
      s[0] += l[0]; s[1] += l[1]; s[2] += l[2]; s[3]++;
    }
    sums.forEach((s, c) => { if (s[3]) centroids[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    if (!changed) break;
  }

  // Report each cluster by its mean RGB, which displays more faithfully than a Lab round-trip.
  const rgbSums = centroids.map(() => [0, 0, 0, 0]);
  for (let i = 0; i < pixels.length; i++) {
    const s = rgbSums[assign[i]], p = pixels[i].rgb;
    s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
  }
  return rgbSums
    .filter((s) => s[3] > 0)
    .map((s) => ({ rgb: [s[0] / s[3], s[1] / s[3], s[2] / s[3]], share: s[3] / pixels.length }))
    .sort((a, b) => b.share - a.share);
}

// Map palette colours to DMC threads, merging clusters that land on the same thread.
export function paletteToThreads(palette) {
  const merged = new Map();
  for (const { rgb, share } of palette) {
    const [{ thread, distance }] = nearestThreads(rgb, 1);
    const prev = merged.get(thread.id);
    if (prev) prev.share += share;
    else merged.set(thread.id, { thread, distance, share, source: rgb });
  }
  return [...merged.values()].sort((a, b) => b.share - a.share);
}
