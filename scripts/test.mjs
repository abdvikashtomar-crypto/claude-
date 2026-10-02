// End-to-end check: loads the unpacked extension in Chromium and exercises the side panel page.
import { chromium } from "playwright";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const extPath = fileURLToPath(new URL("../extension", import.meta.url));
const userDataDir = mkdtempSync(join(tmpdir(), "tcf-"));
const ctx = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium",
  args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`],
});

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
};

let [worker] = ctx.serviceWorkers();
if (!worker) worker = await ctx.waitForEvent("serviceworker");
const extId = new URL(worker.url()).host;
check(Boolean(extId), `service worker running (extension id ${extId})`);

const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`chrome-extension://${extId}/panel.html`);

check(!(await page.isVisible("#list-count")), "empty list hides the tab badge");

// Default colour → DMC 321
await page.waitForSelector("#matches .thread");
check((await page.textContent("#matches .thread .id")) === "DMC 321", "default red matches DMC 321");

// Hex input
await page.fill("#hex-input", "#000000");
check((await page.textContent("#matches .thread .id")) === "DMC 310", "#000000 matches DMC 310 (black)");

// Search by number shows similar shades, excluding itself
await page.fill("#search-input", "3865");
await page.click("#search-results .thread");
const similar = await page.$$eval("#matches .thread .id", (els) => els.map((e) => e.textContent));
check(!similar.includes("DMC 3865") && similar.length === 5, `search 3865 → similar shades ${similar.join(", ")}`);

// Save + list
await page.click("#matches .thread .save");
await page.click("#tab-list");
check((await page.$$("#saved .thread")).length === 1, "saved thread appears in My threads");
check((await page.textContent("#list-count")) === "1", "tab badge shows 1");

// Photo palette: generate a two-colour PNG in the page and feed it to the file input
await page.click("#tab-photo");
const png = await page.evaluate(async () => {
  const c = new OffscreenCanvas(100, 100);
  const g = c.getContext("2d");
  g.fillStyle = "#2f6f8f"; g.fillRect(0, 0, 100, 60);
  g.fillStyle = "#f0eada"; g.fillRect(0, 60, 100, 40);
  const blob = await c.convertToBlob({ type: "image/png" });
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
});
const pngPath = join(userDataDir, "test.png");
writeFileSync(pngPath, Buffer.from(png));
await page.setInputFiles("#file-input", pngPath);
await page.waitForSelector("#palette .thread");
const palette = await page.$$eval("#palette .thread", (els) =>
  els.map((e) => `${e.querySelector(".id").textContent} (${e.querySelector(".extra").textContent})`)
);
check(palette.length === 2 && palette[1].startsWith("DMC Ecru"), `photo palette → ${palette.join("; ")}`);

await page.click("#add-all");
check((await page.textContent("#list-count")) === "3", "add-all adds palette threads to list");

// Outbound links carry UTM tags
const hrefs = await page.$$eval("a[data-link]", (as) => as.map((a) => a.href));
check(
  hrefs.length >= 3 && hrefs.every((h) => h.startsWith("https://veethreads.com/") && h.includes("utm_source=chrome-extension")),
  `${hrefs.length} veethreads.com links tagged with UTM`
);

// Persistence across reloads
await page.reload();
await page.waitForSelector("#matches .thread", { state: "attached" });
check((await page.textContent("#list-count")) === "3", "saved list persists after reload");
check(await page.isVisible("#view-photo"), "last-used tab is restored after reload");

check(errors.length === 0, `no console errors${errors.length ? ": " + errors.join(" | ") : ""}`);

await ctx.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
