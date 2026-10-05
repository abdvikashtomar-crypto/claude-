// Renders every backlinks/infographics/src/*.html page to backlinks/infographics/<name>.png
// at 1200px wide (2x pixel density, so 2400px PNGs that stay sharp on blogs and Pinterest).
// Run from the repo root: node backlinks/scripts/render-infographics.mjs
import { chromium } from "playwright";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../infographics/", import.meta.url));
const src = join(root, "src");
const pages = readdirSync(src).filter((f) => f.endsWith(".html"));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
for (const file of pages) {
  await page.goto(pathToFileURL(join(src, file)).href);
  await page.waitForLoadState("networkidle");
  const out = join(root, file.replace(/\.html$/, ".png"));
  await page.screenshot({ path: out, fullPage: true });
  console.log("wrote", out);
}
await browser.close();
