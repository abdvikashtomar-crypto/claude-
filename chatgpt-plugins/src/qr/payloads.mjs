// Turns structured input into the exact strings phone cameras expect inside a QR code.

const wifiEscape = (s) => String(s).replace(/([\\;,:"])/g, "\\$1");
const vcardEscape = (s) => String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

export class PayloadError extends Error {}

function need(value, message) {
  if (value === undefined || value === null || String(value).trim() === "") throw new PayloadError(message);
  return String(value).trim();
}

export function normalizeUrl(raw) {
  let text = need(raw, "Give the URL to encode in `text`.");
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = `https://${text}`;
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new PayloadError(`"${raw}" is not a valid URL.`);
  }
  if (!/^https?:$/.test(url.protocol)) throw new PayloadError("Only http and https links can be encoded as a URL QR code.");
  if (!url.hostname.includes(".") && url.hostname !== "localhost") throw new PayloadError(`"${raw}" is missing a domain such as example.com.`);
  // Keep the link as typed unless the URL parser had to encode something.
  return url.href === text || url.href === `${text}/` ? text : url.href;
}

function phoneNumber(raw, message) {
  const phone = need(raw, message).replace(/[\s().-]/g, "");
  if (!/^\+?\d{3,20}$/.test(phone)) throw new PayloadError(`"${raw}" is not a valid phone number.`);
  return phone;
}

export function wifiPayload({ ssid, password, security = "WPA", hidden = false } = {}) {
  const name = need(ssid, "Give the Wi-Fi network name in `wifi.ssid`.");
  const type = security === "none" ? "nopass" : security;
  if (type !== "nopass" && !password) throw new PayloadError("This network is secured, so `wifi.password` is required (or set `wifi.security` to \"none\").");
  let out = `WIFI:T:${type};S:${wifiEscape(name)};`;
  if (type !== "nopass") out += `P:${wifiEscape(password)};`;
  if (hidden) out += "H:true;";
  return `${out};`;
}

export function emailPayload({ to, subject, body } = {}) {
  const address = need(to, "Give the email address in `email.to`.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new PayloadError(`"${address}" is not a valid email address.`);
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${address}${params.length ? `?${params.join("&")}` : ""}`;
}

export function smsPayload({ phone, message } = {}) {
  const number = phoneNumber(phone, "Give the phone number in `sms.phone`.");
  return message ? `SMSTO:${number}:${message}` : `SMSTO:${number}`;
}

export function vcardPayload({ name, phone, email, organization, title, url, address, note } = {}) {
  const full = need(name, "Give the person's name in `contact.name`.");
  const parts = full.split(/\s+/);
  const family = parts.length > 1 ? parts.pop() : "";
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${vcardEscape(family)};${vcardEscape(parts.join(" "))};;;`, `FN:${vcardEscape(full)}`];
  if (organization) lines.push(`ORG:${vcardEscape(organization)}`);
  if (title) lines.push(`TITLE:${vcardEscape(title)}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${phoneNumber(phone, "")}`);
  if (email) lines.push(`EMAIL:${email}`);
  if (url) lines.push(`URL:${normalizeUrl(url)}`);
  if (address) lines.push(`ADR:;;${vcardEscape(address)};;;;`);
  if (note) lines.push(`NOTE:${vcardEscape(note)}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

export function geoPayload({ latitude, longitude } = {}) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new PayloadError("`location.latitude` must be between -90 and 90.");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new PayloadError("`location.longitude` must be between -180 and 180.");
  return `geo:${lat},${lng}`;
}

/** Returns `{ payload, summary }` for a create_qr_code request. */
export function buildPayload(input) {
  switch (input.kind) {
    case "url": {
      const payload = normalizeUrl(input.text);
      return { payload, summary: payload };
    }
    case "text":
      return { payload: need(input.text, "Give the text to encode in `text`."), summary: "Plain text" };
    case "phone": {
      const number = phoneNumber(input.text, "Give the phone number to call in `text`.");
      return { payload: `tel:${number}`, summary: `Call ${number}` };
    }
    case "wifi":
      return { payload: wifiPayload(input.wifi), summary: `Join Wi-Fi “${input.wifi.ssid}”` };
    case "email":
      return { payload: emailPayload(input.email), summary: `Email ${input.email.to}` };
    case "sms":
      return { payload: smsPayload(input.sms), summary: `Text ${input.sms.phone}` };
    case "contact":
      return { payload: vcardPayload(input.contact), summary: `Save contact ${input.contact.name}` };
    case "location":
      return { payload: geoPayload(input.location), summary: `Open map at ${input.location.latitude}, ${input.location.longitude}` };
    default:
      throw new PayloadError(`Unknown QR code kind "${input.kind}".`);
  }
}

const KIND_FIELDS = { wifi: "wifi", email: "email", sms: "sms", contact: "contact", location: "location" };

/** Makes sure the nested object for structured kinds is present before buildPayload reads it. */
export function requireKindFields(input) {
  const field = KIND_FIELDS[input.kind];
  if (field && !input[field]) throw new PayloadError(`kind "${input.kind}" needs the \`${field}\` object.`);
}
