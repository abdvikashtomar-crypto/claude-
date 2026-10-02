// End-to-end checks: starts the plugin server, talks to each MCP endpoint like ChatGPT does,
// then renders the widgets in Chromium inside a minimal MCP Apps host.
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import net from "node:net";
import { existsSync, readFileSync } from "node:fs";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { chromium } from "playwright";
import { createApp } from "../server.mjs";
import { OpenAlex } from "../src/research/openalex.mjs";
import { fakeOpenAlexFetch } from "../test/fixtures/openalex.mjs";

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
};

const openalexCalls = [];
// Widgets embed the server's public URL, so pick the port before creating the app.
const port = await new Promise((resolve) => {
  const probe = net.createServer().listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const base = `http://127.0.0.1:${port}`;
const server = createApp({ publicUrl: base, openalex: new OpenAlex({ apiKey: "test-key", fetch: fakeOpenAlexFetch(openalexCalls) }), log: { error() {} } });
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

async function connect(path) {
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}${path}`)));
  return client;
}

function decodeQr(base64) {
  const png = PNG.sync.read(Buffer.from(base64, "base64"));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null;
}

// ---------- Research Papers ----------
const research = await connect("/research/mcp");
const researchTools = (await research.listTools()).tools.map((t) => t.name).sort();
check(researchTools.join() === "format_citations,get_paper,search_papers", `research tools: ${researchTools.join(", ")}`);

let res = await research.callTool({ name: "search_papers", arguments: { query: "programmable crispr", limit: 5, from_year: 2010, sort: "most_cited", open_access_only: true } });
const papers = res.structuredContent.papers;
check(papers[0]?.title.startsWith("A Programmable Dual-RNA") && papers[0].doi === "10.1126/science.1225829", "search_papers returns the Jinek 2012 paper with its DOI");
check(papers[0].abstract.startsWith("Clustered regularly interspaced short palindromic repeats (CRISPR)"), "abstract rebuilt from OpenAlex inverted index");
check(papers[0].open_access_url === "https://europepmc.org/articles/pmc6286148?pdf=render", "free full-text link included");
const searchUrl = openalexCalls.at(-1);
check(
  searchUrl.searchParams.get("filter") === "from_publication_date:2010-01-01,is_oa:true" && searchUrl.searchParams.get("sort") === "cited_by_count:desc" && searchUrl.searchParams.get("api_key") === "test-key",
  `OpenAlex query built correctly (${searchUrl.search})`,
);
check(res.content[0].text.includes("[id: W2045435533]"), "search text gives the model ids for follow-up calls");

res = await research.callTool({ name: "get_paper", arguments: { id: "https://doi.org/10.1126/SCIENCE.1225829" } });
check(res.structuredContent.found && res.structuredContent.paper.authors.length === 6, "get_paper resolves a doi.org URL");
check(openalexCalls.at(-1).pathname === "/works/doi:10.1126/SCIENCE.1225829", `DOI path is not double-encoded (${openalexCalls.at(-1).pathname})`);
res = await research.callTool({ name: "get_paper", arguments: { id: "10.9999/does-not-exist" } });
check(res.structuredContent.found === false && !res.isError, "get_paper reports unknown DOIs as not found");

res = await research.callTool({ name: "format_citations", arguments: { ids: ["W2045435533", "10.1126/science.1258096", "not-an-id"], style: "apa" } });
const apa = res.structuredContent.citations;
check(
  apa.includes("Jinek, M., Chylinski, K., Fonfara, I., Hauer, M., Doudna, J. A., & Charpentier, E. (2012). A Programmable Dual-RNA–Guided DNA Endonuclease in Adaptive Bacterial Immunity. *Science*, *337*(6096), 816–821. https://doi.org/10.1126/science.1225829"),
  "APA 7 citation is exact",
);
check(apa.indexOf("Doudna, J. A., & Charpentier, E. (2014)") < apa.indexOf("Jinek"), "APA list is alphabetical");
check(res.structuredContent.not_found.join() === "not-an-id", "invalid ids listed as not found");
res = await research.callTool({ name: "format_citations", arguments: { ids: ["W2045435533"], style: "mla" } });
check(res.structuredContent.citations === "Jinek, Martin, et al. “A Programmable Dual-RNA–Guided DNA Endonuclease in Adaptive Bacterial Immunity.” *Science*, vol. 337, no. 6096, 2012, pp. 816-21. https://doi.org/10.1126/science.1225829.", "MLA 9 citation is exact");
res = await research.callTool({ name: "format_citations", arguments: { ids: ["W2045435533"], style: "bibtex" } });
check(res.structuredContent.citations.includes("@article{jinek2012programmable,") && res.structuredContent.citations.includes("pages = {816--821}"), "BibTeX entry has key and page range");

// ChatGPT may still speak the 2025 protocol: check the stateless fallback answers tools/list.
const legacy = await fetch(`${base}/research/mcp`, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
});
check(legacy.ok && (await legacy.text()).includes("search_papers"), "2025-era (legacy) MCP clients are served too");

// ---------- QR Code ----------
const qr = await connect("/qr/mcp");
const qrTool = (await qr.listTools()).tools[0];
check(qrTool.name === "create_qr_code" && qrTool._meta?.ui?.resourceUri === "ui://qr-code/view.html", "create_qr_code is linked to its widget");

res = await qr.callTool({ name: "create_qr_code", arguments: { kind: "url", text: "veethreads.com/collections/all", label: "Shop the collection" } });
check(res.structuredContent.encoded === "https://veethreads.com/collections/all", "URL gets https:// added");
check(decodeQr(res._meta.png) === "https://veethreads.com/collections/all", "generated PNG scans back to the URL");
check(res._meta.svg.startsWith("<svg") && !res.content[0].text.includes("<svg"), "SVG goes to the widget only, not the model");

res = await qr.callTool({ name: "create_qr_code", arguments: { kind: "wifi", wifi: { ssid: "Café;Guest", password: 'p:ss"word', security: "WPA" }, error_correction: "H" } });
check(res.structuredContent.encoded === 'WIFI:T:WPA;S:Café\\;Guest;P:p\\:ss\\"word;;', `Wi-Fi payload escaped (${res.structuredContent.encoded})`);
check(decodeQr(res._meta.png) === res.structuredContent.encoded, "Wi-Fi QR scans back to the same payload");

res = await qr.callTool({ name: "create_qr_code", arguments: { kind: "contact", contact: { name: "Ada Lovelace", phone: "+44 20 7946 0000", email: "ada@example.com", organization: "Analytical Engines; Ltd" } } });
check(decodeQr(res._meta.png)?.includes("ORG:Analytical Engines\\; Ltd") && res.structuredContent.encoded.includes("TEL;TYPE=CELL:+442079460000"), "vCard scans and is escaped");

res = await qr.callTool({ name: "create_qr_code", arguments: { kind: "url", text: "example.com", foreground: "#ffffff", background: "#000000" } });
check(res.structuredContent.warnings.some((w) => w.includes("light-on-dark")), "warns about inverted colours");
res = await qr.callTool({ name: "create_qr_code", arguments: { kind: "wifi" } });
check(res.isError && res.content[0].text.includes("`wifi`"), "missing wifi details is a clear tool error");
res = await qr.callTool({ name: "create_qr_code", arguments: { kind: "url", text: "not a url" } });
check(res.isError, "rejects an invalid URL");

// ---------- Diagrams ----------
const diagrams = await connect("/diagrams/mcp");
res = await diagrams.callTool({ name: "render_diagram", arguments: { mermaid: "```mermaid\nflowchart LR\n  A[\"Order placed\"] --> B{\"In stock?\"}\n  B -- Yes --> C[Ship]\n  B -- No --> D[Backorder]\n```", title: "Order flow" } });
const flow = res.structuredContent;
check(flow.mermaid.startsWith("flowchart LR") && flow.diagram_type === "Flowchart", "Markdown fences stripped and type detected");
check(flow.edit_url.startsWith("https://mermaid.live/edit#base64:"), "Mermaid Live link created");
res = await diagrams.callTool({ name: "render_diagram", arguments: { mermaid: "Here is your diagram:\nA --> B" } });
check(res.isError && res.content[0].text.includes("does not start a Mermaid diagram"), "prose instead of Mermaid is rejected with guidance");

const diagramView = (await diagrams.readResource({ uri: "ui://diagrams/view.html" })).contents[0];
check(diagramView.mimeType === "text/html;profile=mcp-app" && diagramView._meta.ui.csp.resourceDomains[0] === base, "diagram widget declares its asset origin in CSP");
const qrView = (await qr.readResource({ uri: "ui://qr-code/view.html" })).contents[0];
check(qrView.text.includes("globalThis.McpApps=") && !qrView.text.includes("/* BASE_JS */"), "widget HTML has the MCP Apps SDK and shared helpers inlined");

const asset = await fetch(`${base}/assets/mermaid.min.js`, { headers: { "accept-encoding": "gzip" } });
check(asset.ok && asset.headers.get("content-encoding") === "gzip", "Mermaid asset served gzipped");

// ---------- Widgets in a browser ----------
const HOST = `<!doctype html><body style="margin:0;background:#fff"><iframe id="view" style="border:0;width:720px;height:640px"></iframe><script>
window.hostLog = [];
window.mountView = (html, toolResult, hostContext) => {
  const frame = document.getElementById("view");
  const send = (msg) => frame.contentWindow.postMessage(msg, "*");
  window.addEventListener("message", (e) => {
    if (e.source !== frame.contentWindow) return;
    const msg = e.data;
    window.hostLog.push(msg);
    if (msg.method === "ui/initialize") {
      send({ jsonrpc: "2.0", id: msg.id, result: {
        protocolVersion: msg.params.protocolVersion,
        hostInfo: { name: "test-host", version: "1.0.0" },
        hostCapabilities: { openLinks: {}, downloadFile: {}, message: { text: {} }, updateModelContext: { text: {} } },
        hostContext,
      } });
    } else if (msg.method === "ui/notifications/initialized") {
      send({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params: toolResult });
    } else if (msg.method === "ui/request-display-mode") {
      send({ jsonrpc: "2.0", id: msg.id, result: { mode: msg.params.mode } });
    } else if (msg.id !== undefined && msg.method) {
      send({ jsonrpc: "2.0", id: msg.id, result: {} });
    }
  });
  frame.srcdoc = html;
};
</script></body>`;

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

async function mountView(html, toolResult, hostContext = { theme: "light", availableDisplayModes: ["inline", "fullscreen"] }) {
  await page.setContent(HOST);
  await page.evaluate(([h, r, c]) => window.mountView(h, r, c), [html, toolResult, hostContext]);
  return page.frameLocator("#view");
}
const listingScreenshot = (plugin) => new URL(`../plugins/${plugin}/assets/screenshot.png`, import.meta.url).pathname;
const hostCalls = (method) => page.evaluate((m) => window.hostLog.filter((x) => x.method === m), method);
async function waitForHostCall(method) {
  await page.waitForFunction((m) => window.hostLog.some((x) => x.method === m), method, { timeout: 15000 });
  return (await hostCalls(method)).at(-1);
}

// QR widget: renders the code and downloads a PNG that still scans (with the label drawn in).
res = await qr.callTool({ name: "create_qr_code", arguments: { kind: "url", text: "https://veethreads.com", label: "Scan me" } });
let view = await mountView(qrView.text, res);
await view.locator("#qr svg").waitFor({ timeout: 15000 });
check((await view.locator("#summary").textContent()) === "https://veethreads.com", "QR widget shows what the code does");
await page.screenshot({ path: listingScreenshot("qr-code"), clip: { x: 0, y: 0, width: 720, height: 300 } });
await view.locator("#download-png").click();
let download = await waitForHostCall("ui/download-file");
const qrPng = download.params.contents[0].resource;
const labelled = PNG.sync.read(Buffer.from(qrPng.blob, "base64"));
check(qrPng.mimeType === "image/png" && labelled.height > labelled.width, "downloaded QR PNG includes the label");
check(decodeQr(qrPng.blob) === "https://veethreads.com", "downloaded QR PNG scans");

// Diagram widget: renders a flowchart, exports SVG and PNG, opens Mermaid Live.
res = await diagrams.callTool({ name: "render_diagram", arguments: { mermaid: flow.mermaid, title: "Order flow" } });
view = await mountView(diagramView.text, res);
await view.locator("#paper svg").waitFor({ timeout: 20000 });
check((await view.locator("#paper svg .node").count()) === 4, "flowchart renders 4 nodes");
await page.screenshot({ path: listingScreenshot("diagrams"), clip: { x: 0, y: 0, width: 720, height: 420 } });
await view.locator("#download-svg").click();
download = await waitForHostCall("ui/download-file");
check(download.params.contents[0].resource.text.startsWith("<svg") && download.params.contents[0].resource.uri === "file:///order-flow.svg", "SVG export named after the title");
await view.locator("#download-png").click();
await page.waitForFunction(() => window.hostLog.filter((x) => x.method === "ui/download-file").length === 2, null, { timeout: 15000 });
const diagramPng = (await hostCalls("ui/download-file")).at(-1).params.contents[0].resource;
const png = PNG.sync.read(Buffer.from(diagramPng.blob, "base64"));
check(diagramPng.mimeType === "image/png" && png.width > 300, `PNG export works (${png.width}×${png.height})`);
await view.locator("#edit").click();
check((await waitForHostCall("ui/open-link")).params.url === flow.edit_url, "Edit opens Mermaid Live");
check(await view.locator("#fullscreen").isVisible(), "full screen offered when the host supports it");

// Other diagram types render too.
for (const [name, code] of [
  ["sequence", "sequenceDiagram\n  Customer->>Shop: Order\n  Shop-->>Customer: Confirmation"],
  ["mind map", "mindmap\n  root((Launch))\n    Marketing\n      Instagram\n    Product\n      Photos"],
  ["gantt", "gantt\n  dateFormat YYYY-MM-DD\n  section Build\n  Design :a1, 2026-10-01, 7d\n  Stitching :after a1, 10d"],
  // The examples in the diagrams skill must render as written.
  ...[...readFileSync(new URL("../plugins/diagrams/skills/diagrams/SKILL.md", import.meta.url), "utf8").matchAll(/```\n([\s\S]*?)```/g)].map((m, i) => [`skill example ${i + 1}`, m[1]]),
]) {
  res = await diagrams.callTool({ name: "render_diagram", arguments: { mermaid: code } });
  view = await mountView(diagramView.text, res);
  await view.locator("#paper svg, #error:not([hidden])").first().waitFor({ timeout: 20000 });
  check(await view.locator("#paper svg").count() === 1, `${name} diagram renders`);
}

// Broken Mermaid: shows the error, tells the model, and offers a fix button.
res = await diagrams.callTool({ name: "render_diagram", arguments: { mermaid: "flowchart TD\n  A[Start --> B" } });
view = await mountView(diagramView.text, res);
await view.locator("#error:not([hidden])").waitFor({ timeout: 20000 });
const context = await waitForHostCall("ui/update-model-context");
check(context.params.content[0].text.includes("failed to render"), "syntax error reported to the model");
await view.locator("#fix").click();
check((await waitForHostCall("ui/message")).params.content[0].text.includes("Please fix the Mermaid code"), "Fix button asks ChatGPT to correct the code");

// Dark host theme is applied.
res = await qr.callTool({ name: "create_qr_code", arguments: { kind: "text", text: "hello" } });
view = await mountView(qrView.text, res, { theme: "dark" });
await view.locator("#qr svg").waitFor();
check((await view.locator("html").getAttribute("data-theme")) === "dark", "widget follows the host's dark theme");

// ---------- Plugin packages ----------
for (const plugin of ["research-papers", "diagrams", "qr-code"]) {
  const dir = new URL(`../plugins/${plugin}/`, import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL(".codex-plugin/plugin.json", dir), "utf8"));
  const mcp = JSON.parse(readFileSync(new URL(".mcp.json", dir), "utf8"));
  const skill = readFileSync(new URL(`skills/${plugin}/SKILL.md`, dir), "utf8");
  const ui = manifest.interface;
  check(
    manifest.name === plugin && ui.displayName.length <= 30 && ui.shortDescription.length <= 40 && existsSync(new URL(ui.logo, dir)) && mcp.mcpServers[plugin]?.url.endsWith("/mcp") && skill.startsWith(`---\nname: ${plugin}\n`),
    `${plugin} plugin package is complete`,
  );
}

check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);

await browser.close();
await Promise.all([research.close(), qr.close(), diagrams.close()]);
server.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
