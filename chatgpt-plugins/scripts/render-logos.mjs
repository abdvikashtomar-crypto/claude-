// Renders plugins/*/assets/logo.svg to logo.png (512px) and icon-64.png (directory icon, must stay under 5 KB).
import { chromium } from "playwright";
import { readFileSync, statSync } from "node:fs";

const browser = await chromium.launch();
for (const plugin of ["research-papers", "diagrams", "qr-code"]) {
  const dir = new URL(`../plugins/${plugin}/assets/`, import.meta.url);
  const svg = readFileSync(new URL("logo.svg", dir), "utf8");
  for (const [size, file] of [[512, "logo.png"], [64, "icon-64.png"]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
    const path = new URL(file, dir).pathname;
    await page.screenshot({ path, omitBackground: true });
    await page.close();
    console.log(`${plugin}/${file}: ${statSync(path).size} bytes`);
  }
}
await browser.close();
