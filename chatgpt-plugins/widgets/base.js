// Shared widget helpers: connect to the host, follow its theme, and export files.
const { App, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } = globalThis.McpApps;

function applyHostContext(ctx) {
  if (!ctx) return;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

/** Connects to the host and calls `render(toolResult, app)` whenever a tool result arrives. */
async function connectWidget(name, render) {
  const app = new App({ name, version: "1.0.0" });
  let rendered = false;
  const show = (result) => {
    rendered = true;
    render(result, app);
  };
  app.ontoolresult = show;
  app.onhostcontextchanged = applyHostContext;
  try {
    await app.connect();
    applyHostContext(app.getHostContext());
  } catch (e) {
    console.warn("Could not connect to the MCP Apps host", e);
  }
  // ChatGPT also exposes the latest result on window.openai; use it if the notification was missed.
  const openai = globalThis.openai;
  if (!rendered && openai?.toolOutput) show({ structuredContent: openai.toolOutput, _meta: openai.toolResponseMetadata ?? {} });
  return app;
}

/** Wraps a button handler so failures (e.g. a host without that feature) show a message instead of throwing. */
function action(fn) {
  return () =>
    Promise.resolve()
      .then(fn)
      .catch((e) => setStatus(`That didn't work: ${e?.message || e}`));
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => (el.textContent = ""), 4000);
}

/** Saves a file through the host (sandboxed iframes can't download directly). Pass `text` or base64 `blob`. */
async function saveFile(app, filename, mimeType, { text, blob }) {
  if (app.getHostCapabilities()?.downloadFile) {
    const resource = { uri: `file:///${filename}`, mimeType, ...(text !== undefined ? { text } : { blob }) };
    const { isError } = await app.downloadFile({ contents: [{ type: "resource", resource }] });
    setStatus(isError ? "Download cancelled." : `Saved ${filename}`);
    return !isError;
  }
  const href = text !== undefined ? URL.createObjectURL(new Blob([text], { type: mimeType })) : `data:${mimeType};base64,${blob}`;
  const a = Object.assign(document.createElement("a"), { href, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setStatus(`Saved ${filename}`);
  return true;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  setStatus("Copied to clipboard");
}

function slugify(text, fallback) {
  const slug = String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return slug || fallback;
}

/** Draws an SVG string onto a canvas at `scale` and returns base64 PNG data (no data: prefix). */
async function svgToPng(svgText, scale = 2, background = null) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
  const viewBox = (doc.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
  const width = viewBox.length === 4 ? viewBox[2] : parseFloat(doc.getAttribute("width")) || 800;
  const height = viewBox.length === 4 ? viewBox[3] : parseFloat(doc.getAttribute("height")) || 600;
  doc.setAttribute("width", width);
  doc.setAttribute("height", height);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(doc))}`;
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("Could not draw the image"));
    img.src = url;
  });
  const canvas = Object.assign(document.createElement("canvas"), { width: Math.ceil(width * scale), height: Math.ceil(height * scale) });
  const ctx = canvas.getContext("2d");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png").split(",")[1];
}
