// Renders store/src/icon.svg to the PNG sizes Chrome needs.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const svg = readFileSync(new URL("../store/src/icon.svg", import.meta.url), "utf8");
const browser = await chromium.launch();
for (const size of [16, 32, 48, 128]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  // Store guidelines: the 128px icon is 96px of artwork with 16px transparent padding.
  const pad = size === 128 ? 16 : 0;
  const inner = svg.replace("<svg ", `<svg width="${size - 2 * pad}" height="${size - 2 * pad}" `);
  await page.setContent(`<html><body style="margin:0;padding:${pad}px;background:transparent">${inner}</body></html>`);
  await page.screenshot({ path: new URL(`../extension/icons/icon${size}.png`, import.meta.url).pathname, omitBackground: true });
  await page.close();
}
await browser.close();
console.log("icons rendered");
