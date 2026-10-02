// Render the reel with headless Chromium.
//   node render.mjs stills 1.2,4.8,...   -> build/still-<t>.png
//   node render.mjs video                -> build/seg*.mp4 (silent) + build/cues.json
//   SCALE=2 node render.mjs video        -> build/x2/seg*.mp4, a 2160x3840 master
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const SCALE = Number(process.env.SCALE || 1);
const out = path.join(here, 'build', SCALE === 1 ? '' : `x${SCALE}`);
mkdirSync(out, { recursive: true });
const FPS = 30, WORKERS = 4;
const [mode = 'video', arg] = process.argv.slice(2);

const browser = await chromium.launch();
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: SCALE });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto('file://' + path.join(here, 'reel.html'));
  await page.waitForFunction(() => window.READY === true);
  return page;
}
const shot = page => page.locator('#stage').screenshot({ type: 'png', animations: 'allow' });

if (mode === 'stills') {
  const page = await openPage();
  for (const t of arg.split(',').map(Number)) {
    await page.evaluate(t => window.seek(t), t);
    writeFileSync(path.join(out, `still-${t.toFixed(2)}.png`), await shot(page));
  }
} else {
  const first = await openPage();
  const meta = await first.evaluate(() => ({ cues: window.CUES, duration: window.DURATION }));
  writeFileSync(path.join(out, 'cues.json'), JSON.stringify(meta.cues, null, 1));
  const total = Math.round(meta.duration * FPS);
  const per = Math.ceil(total / WORKERS);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const page = w === 0 ? first : await openPage();
    const a = w * per, b = Math.min(total, a + per);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', SCALE === 1 ? '14' : '16', '-pix_fmt', 'yuv420p', path.join(out, `seg${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
    for (let f = a; f < b; f++) {
      await page.evaluate(t => window.seek(t), f / FPS);
      const buf = await shot(page);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (w === 0 && (f - a) % 60 === 0) console.log(`frame ${f - a}/${b - a} per worker, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await done;
  }));
  writeFileSync(path.join(out, 'segments.txt'), Array.from({ length: WORKERS }, (_, w) => `file 'seg${w}.mp4'`).join('\n'));
  console.log(`rendered ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
