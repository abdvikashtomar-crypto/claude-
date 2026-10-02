// Generates Chrome Web Store images from the real extension UI:
//   store/screenshot-{1,2,3}.png (1280x800), store/promo-small.png (440x280), store/promo-marquee.png (1400x560)
import { chromium } from "playwright";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const extPath = join(root, "extension");
const out = (name) => join(root, "store", name);
const dataUri = (file, type) => `data:${type};base64,${readFileSync(join(root, file)).toString("base64")}`;
const icon = dataUri("store/src/icon.svg", "image/svg+xml");

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "tcf-shots-")), {
  channel: "chromium",
  args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
});
let [worker] = ctx.serviceWorkers();
if (!worker) worker = await ctx.waitForEvent("serviceworker");
const panelUrl = `chrome-extension://${new URL(worker.url()).host}/panel.html`;

// Render the flower sample to PNG so it can be uploaded through the file input.
const samplePng = join(tmpdir(), "tcf-sample.png");
{
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 400, height: 300 });
  await p.setContent(`<body style="margin:0">${readFileSync(join(root, "store/src/sample-flowers.svg"), "utf8")}</body>`);
  await p.screenshot({ path: samplePng });
  await p.close();
}

// Capture the side panel in three states.
const panel = await ctx.newPage();
await panel.setViewportSize({ width: 380, height: 720 });
await panel.goto(panelUrl);
await panel.waitForSelector("#matches .thread");

async function shot() {
  return `data:image/png;base64,${(await panel.screenshot()).toString("base64")}`;
}

await panel.fill("#hex-input", "#E07A5F");
await panel.waitForTimeout(100);
const pickShot = await shot();

await panel.click("#tab-photo");
await panel.setInputFiles("#file-input", samplePng);
await panel.waitForSelector("#palette .thread");
await panel.fill("#k-input", "7");
await panel.dispatchEvent("#k-input", "input");
await panel.waitForTimeout(100);
const photoShot = await shot();

await panel.click("#add-all");
await panel.click("#tab-list");
await panel.waitForTimeout(1800); // let the toast fade
const listShot = await shot();

const sampleUri = `data:image/png;base64,${readFileSync(samplePng).toString("base64")}`;

const frame = ({ title, sub, panelImg, left }) => `
<html><head><style>
  body { margin:0; width:1280px; height:800px; font-family: system-ui, "Segoe UI", Roboto, sans-serif;
         background: linear-gradient(135deg, #fbf7f0 0%, #f3e3d6 100%); color:#2b2420; display:flex; align-items:center; overflow:hidden; }
  .copy { flex:1; padding: 0 40px 0 80px; }
  .tag { display:inline-flex; gap:10px; align-items:center; font-weight:700; color:#a8412f; font-size:20px; }
  .tag img { width:40px; height:40px; }
  h1 { font-size:54px; line-height:1.08; margin:22px 0 18px; letter-spacing:-0.02em; }
  p { font-size:24px; line-height:1.4; color:#6f625a; margin:0; max-width:540px; }
  .left { margin-top:30px; }
  .panel { width:380px; height:720px; margin-right:80px; border-radius:16px; overflow:hidden;
           box-shadow: 0 30px 60px rgba(60,30,20,.22), 0 0 0 1px rgba(0,0,0,.06); flex:none; }
  .panel img { display:block; }
</style></head><body>
  <div class="copy">
    <div class="tag"><img src="${icon}">Thread Color Finder</div>
    <h1>${title}</h1>
    <p>${sub}</p>
    <div class="left">${left || ""}</div>
  </div>
  <div class="panel"><img src="${panelImg}" width="380" height="720"></div>
</body></html>`;

const swatchRow = ["#E07A5F", "#C72B3B", "#2F6F8F", "#E8A33D", "#4F7942"]
  .map((c) => `<span style="display:inline-block;width:46px;height:46px;border-radius:50%;background:${c};margin-right:10px;box-shadow:inset 0 0 0 3px rgba(255,255,255,.35)"></span>`)
  .join("");

const slides = [
  {
    file: "screenshot-1.png",
    title: "Pick any colour.<br>Get the DMC number.",
    sub: "Use the eyedropper on any website, pattern or photo and instantly see the closest DMC embroidery floss shades.",
    panelImg: pickShot,
    left: swatchRow,
  },
  {
    file: "screenshot-2.png",
    title: "Turn any photo into<br>a thread palette.",
    sub: "Drop in an image and get the DMC threads you need, with how much of the design each colour covers. Images never leave your computer.",
    panelImg: photoShot,
    left: `<img src="${sampleUri}" width="300" style="border-radius:12px;box-shadow:0 10px 30px rgba(60,30,20,.18)">`,
  },
  {
    file: "screenshot-3.png",
    title: "Build your thread<br>shopping list.",
    sub: "Save shades as you go, then copy the whole list in one click before your next trip to the craft store.",
    panelImg: listShot,
    left: "",
  },
];

const page = await ctx.newPage();
for (const s of slides) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setContent(frame(s));
  await page.waitForTimeout(100);
  await page.screenshot({ path: out(s.file) });
}

// Small promo tile 440x280
await page.setViewportSize({ width: 440, height: 280 });
await page.setContent(`<html><body style="margin:0;width:440px;height:280px;background:linear-gradient(135deg,#fbf7f0,#f3e3d6);color:#2b2420;font-family:system-ui,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;gap:22px;padding:0 30px;box-sizing:border-box">
  <img src="${icon}" width="120" height="120" style="flex:none;filter:drop-shadow(0 6px 14px rgba(60,30,20,.25))">
  <div><div style="font-size:30px;font-weight:800;line-height:1.1;letter-spacing:-.01em">Thread Color Finder</div>
  <div style="font-size:17px;margin-top:10px;color:#a8412f;font-weight:600;line-height:1.35">Match any colour to DMC embroidery floss</div></div>
</body></html>`);
await page.screenshot({ path: out("promo-small.png") });

// Marquee promo 1400x560
await page.setViewportSize({ width: 1400, height: 560 });
await page.setContent(`<html><body style="margin:0;width:1400px;height:560px;background:linear-gradient(120deg,#a8412f,#7d2c22);color:#fbf7f0;font-family:system-ui,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;gap:50px;padding:0 100px;box-sizing:border-box">
  <img src="${icon}" width="220" height="220" style="flex:none;filter:drop-shadow(0 10px 24px rgba(0,0,0,.3))">
  <div><div style="font-size:64px;font-weight:800;letter-spacing:-.02em">Thread Color Finder</div>
  <div style="font-size:30px;margin-top:16px;opacity:.92">Pick any colour or photo → get the DMC floss numbers</div>
  <div style="margin-top:28px">${swatchRow}</div></div>
</body></html>`);
await page.screenshot({ path: out("promo-marquee.png") });

await ctx.close();
console.log("store images written to store/");
