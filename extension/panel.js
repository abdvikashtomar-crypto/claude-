import {
  hexToRgb, rgbToHex, nearestThreads, matchLabel, searchThreads, findThread, extractPalette, paletteToThreads,
} from "./lib/color.js";

const $ = (id) => document.getElementById(id);

// Tag outbound links so visits from the extension show up in the site's analytics.
for (const a of document.querySelectorAll("a[data-link]")) {
  const url = new URL(a.href);
  url.searchParams.set("utm_source", "chrome-extension");
  url.searchParams.set("utm_medium", "extension");
  url.searchParams.set("utm_campaign", "thread-color-finder");
  url.searchParams.set("utm_content", a.dataset.link);
  a.href = url.toString();
}

// ---------- Storage (falls back to memory when previewed outside Chrome) ----------
const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage?.local;
let memoryStore = {};
const store = {
  async get(key, fallback) {
    if (hasChromeStorage) return (await chrome.storage.local.get(key))[key] ?? fallback;
    return memoryStore[key] ?? fallback;
  },
  async set(key, value) {
    if (hasChromeStorage) return chrome.storage.local.set({ [key]: value });
    memoryStore[key] = value;
  },
};

// ---------- Toast ----------
let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1600);
}

async function copy(text, msg = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    toast("Couldn't copy to clipboard");
  }
}

// ---------- Tabs ----------
const tabs = ["pick", "photo", "list"];
function showTab(name) {
  for (const t of tabs) {
    $(`tab-${t}`).setAttribute("aria-selected", String(t === name));
    $(`view-${t}`).hidden = t !== name;
  }
  store.set("lastTab", name);
}
for (const t of tabs) $(`tab-${t}`).addEventListener("click", () => showTab(t));

// ---------- Saved threads ----------
let saved = [];

function isSaved(id) {
  return saved.includes(id);
}

async function saveThreads(ids) {
  const before = saved.length;
  for (const id of ids) if (!isSaved(id)) saved.push(id);
  await store.set("saved", saved);
  renderSaved();
  refreshSaveButtons();
  const added = saved.length - before;
  toast(added ? `Added ${added} thread${added > 1 ? "s" : ""}` : "Already in your list");
}

async function removeThread(id) {
  saved = saved.filter((s) => s !== id);
  await store.set("saved", saved);
  renderSaved();
  refreshSaveButtons();
}

function refreshSaveButtons() {
  for (const btn of document.querySelectorAll("button.save[data-id]")) {
    const on = isSaved(btn.dataset.id);
    btn.classList.toggle("saved", on);
    btn.title = on ? "Saved" : "Save to my threads";
  }
}

// ---------- Rendering ----------
const template = $("thread-item");

function threadItem(thread, { extra = "", share = null, onSelect = null, removable = false } = {}) {
  const li = template.content.firstElementChild.cloneNode(true);
  li.querySelector(".swatch").style.background = thread.hex;
  li.querySelector(".id").textContent = `DMC ${thread.id}`;
  li.querySelector(".name").textContent = `${thread.name} · ${thread.hex}`;
  li.querySelector(".extra").textContent = extra;
  if (share !== null) {
    const bar = document.createElement("span");
    bar.className = "share";
    bar.style.width = `${Math.max(4, Math.round(share * 100))}%`;
    li.querySelector(".meta").append(bar);
  }
  li.querySelector(".copy").addEventListener("click", (e) => {
    e.stopPropagation();
    copy(thread.id, `Copied DMC ${thread.id}`);
  });
  const saveBtn = li.querySelector(".save");
  if (removable) {
    saveBtn.title = "Remove";
    saveBtn.setAttribute("aria-label", "Remove from my threads");
    saveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>';
    saveBtn.addEventListener("click", (e) => { e.stopPropagation(); removeThread(thread.id); });
  } else {
    saveBtn.dataset.id = thread.id;
    saveBtn.addEventListener("click", (e) => { e.stopPropagation(); saveThreads([thread.id]); });
  }
  if (onSelect) {
    li.classList.add("selectable");
    li.addEventListener("click", onSelect);
  }
  return li;
}

function renderMatches(rgb, label = null) {
  const hex = rgbToHex(rgb);
  const picked = $("picked");
  picked.replaceChildren();
  const sw = document.createElement("span");
  sw.className = "swatch";
  sw.style.background = hex;
  const info = document.createElement("span");
  info.innerHTML = `<strong></strong><br><code></code>`;
  info.querySelector("strong").textContent = label || "Your colour";
  info.querySelector("code").textContent = `${hex} · rgb(${rgb.map(Math.round).join(", ")})`;
  picked.append(sw, info);

  const exclude = label ? findThread(label.replace(/^DMC /, "")) : null;
  $("match-heading").textContent = exclude ? "Similar DMC threads" : "Closest DMC threads";
  $("matches").replaceChildren(
    ...nearestThreads(rgb, 5, exclude).map(({ thread, distance }) =>
      threadItem(thread, { extra: `${matchLabel(distance)} · ΔE ${distance.toFixed(1)}` })
    )
  );
  refreshSaveButtons();
}

function renderSaved() {
  const threads = saved.map(findThread).filter(Boolean);
  $("saved").replaceChildren(...threads.map((t) => threadItem(t, { removable: true })));
  $("list-empty").hidden = threads.length > 0;
  $("list-actions").hidden = threads.length === 0;
  const count = $("list-count");
  count.hidden = threads.length === 0;
  count.textContent = threads.length;
}

// ---------- Pick a colour ----------
function setColor(rgb, { label = null, persist = true } = {}) {
  const hex = rgbToHex(rgb);
  $("color-input").value = hex.toLowerCase();
  $("hex-input").value = hex;
  renderMatches(rgb, label);
  if (persist) store.set("lastColor", hex);
}

if ("EyeDropper" in window) {
  $("eyedropper").addEventListener("click", async () => {
    try {
      const { sRGBHex } = await new EyeDropper().open();
      setColor(hexToRgb(sRGBHex));
    } catch {
      // User pressed Escape — nothing to do.
    }
  });
} else {
  $("eyedropper").hidden = true;
  $("eyedropper-note").hidden = false;
}

$("color-input").addEventListener("input", (e) => setColor(hexToRgb(e.target.value)));
$("hex-input").addEventListener("input", (e) => {
  const rgb = hexToRgb(e.target.value);
  if (rgb) {
    $("color-input").value = rgbToHex(rgb).toLowerCase();
    renderMatches(rgb);
    store.set("lastColor", rgbToHex(rgb));
  }
});
$("hex-input").addEventListener("blur", (e) => {
  if (!hexToRgb(e.target.value)) e.target.value = rgbToHex(hexToRgb($("color-input").value));
});

$("search-input").addEventListener("input", (e) => {
  const results = searchThreads(e.target.value);
  $("search-results").replaceChildren(
    ...results.map((t) =>
      threadItem(t, {
        onSelect: () => {
          setColor(t.rgb, { label: `DMC ${t.id}` });
          $("search-input").value = "";
          $("search-results").replaceChildren();
        },
      })
    )
  );
  refreshSaveButtons();
});

// ---------- From a photo ----------
let currentImage = null;
let currentPalette = [];
const MAX_SIDE = 120; // downscale for speed; plenty of pixels for a palette

function analyse() {
  if (!currentImage) return;
  const k = Number($("k-input").value);
  const scale = Math.min(1, MAX_SIDE / Math.max(currentImage.naturalWidth, currentImage.naturalHeight));
  const w = Math.max(1, Math.round(currentImage.naturalWidth * scale));
  const h = Math.max(1, Math.round(currentImage.naturalHeight * scale));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(currentImage, 0, 0, w, h);
  currentPalette = paletteToThreads(extractPalette(ctx.getImageData(0, 0, w, h), k));
  $("palette").replaceChildren(
    ...currentPalette.map(({ thread, share }) =>
      threadItem(thread, { extra: `${Math.round(share * 100)}% of image`, share })
    )
  );
  $("photo-actions").hidden = currentPalette.length === 0;
  refreshSaveButtons();
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    toast("Please choose an image file");
    return;
  }
  const url = URL.createObjectURL(file);
  const img = $("preview");
  img.onload = () => {
    currentImage = img;
    img.hidden = false;
    $("drop-text").hidden = true;
    analyse();
  };
  img.onerror = () => toast("Couldn't read that image");
  img.src = url;
}

const dz = $("dropzone");
$("file-input").addEventListener("change", (e) => loadImageFile(e.target.files[0]));
dz.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file-input").click(); }
});
dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("over"); });
dz.addEventListener("dragleave", () => dz.classList.remove("over"));
dz.addEventListener("drop", (e) => {
  e.preventDefault();
  dz.classList.remove("over");
  loadImageFile(e.dataTransfer.files[0]);
});
document.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
  if (item) {
    showTab("photo");
    loadImageFile(item.getAsFile());
  }
});
$("k-input").addEventListener("input", (e) => {
  $("k-out").textContent = e.target.value;
  analyse();
});
$("add-all").addEventListener("click", () => saveThreads(currentPalette.map((p) => p.thread.id)));

// ---------- Saved list actions ----------
$("copy-list").addEventListener("click", () => {
  const text = saved
    .map(findThread)
    .filter(Boolean)
    .map((t) => `DMC ${t.id} – ${t.name}`)
    .join("\n");
  copy(text, "Thread list copied");
});
$("clear-list").addEventListener("click", async () => {
  saved = [];
  await store.set("saved", saved);
  renderSaved();
  refreshSaveButtons();
});

// ---------- Init ----------
(async () => {
  saved = await store.get("saved", []);
  renderSaved();
  const last = hexToRgb(await store.get("lastColor", "#C72B3B")) || [199, 43, 59];
  setColor(last, { persist: false });
  showTab(await store.get("lastTab", "pick"));
})();
