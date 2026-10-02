import QRCode from "qrcode";
import { McpServer } from "@modelcontextprotocol/server";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { buildWidget } from "../widget.mjs";
import { buildPayload, PayloadError, requireKindFields } from "./payloads.mjs";

const VIEW_URI = "ui://qr-code/view.html";
const hex = z.string().regex(/^#?[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour such as #1a1a1a");

const inputSchema = z.object({
  kind: z
    .enum(["url", "text", "phone", "wifi", "email", "sms", "contact", "location"])
    .default("url")
    .describe("What the QR code does when scanned. url/text/phone use `text`; the others use the object of the same name."),
  text: z.string().max(2000).optional().describe("For kind url: the link (https:// is added if missing). For kind text: the text. For kind phone: the number to call."),
  wifi: z
    .object({
      ssid: z.string().describe("Network name"),
      password: z.string().optional(),
      security: z.enum(["WPA", "WEP", "none"]).default("WPA").describe("WPA covers WPA/WPA2/WPA3"),
      hidden: z.boolean().default(false),
    })
    .optional()
    .describe("Wi-Fi login: scanning joins the network"),
  email: z.object({ to: z.string(), subject: z.string().optional(), body: z.string().optional() }).optional().describe("Pre-filled email"),
  sms: z.object({ phone: z.string(), message: z.string().optional() }).optional().describe("Pre-filled text message"),
  contact: z
    .object({
      name: z.string(),
      phone: z.string().optional(),
      email: z.string().optional(),
      organization: z.string().optional(),
      title: z.string().optional(),
      url: z.string().optional(),
      address: z.string().optional(),
      note: z.string().optional(),
    })
    .optional()
    .describe("Contact card (vCard): scanning offers to save the contact"),
  location: z.object({ latitude: z.number(), longitude: z.number() }).optional().describe("Map location"),
  label: z.string().max(60).optional().describe('Short caption printed under the code, e.g. "Scan for our menu"'),
  foreground: hex.default("#000000").describe("Colour of the dark modules. Keep it dark for reliable scanning."),
  background: hex.default("#ffffff").describe("Background colour. Keep it light."),
  error_correction: z
    .enum(["L", "M", "Q", "H"])
    .default("M")
    .describe("Damage tolerance: L 7%, M 15%, Q 25%, H 30%. Use H for codes that will be printed on fabric or small labels."),
});

const outputSchema = z.object({
  kind: z.string(),
  encoded: z.string().describe("The exact text stored in the QR code"),
  summary: z.string(),
  version: z.number().describe("QR version (size), 1-40"),
  error_correction: z.string(),
  warnings: z.array(z.string()),
});

const normHex = (c) => `#${c.replace("#", "").toLowerCase()}`;

function luminance(color) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function colorWarnings(foreground, background) {
  const fg = luminance(foreground);
  const bg = luminance(background);
  const warnings = [];
  if (fg > bg) warnings.push("The code is light-on-dark. Many phone cameras can't read inverted QR codes; use a dark foreground on a light background.");
  const contrast = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  if (contrast < 4) warnings.push(`Colour contrast is low (${contrast.toFixed(1)}:1). Aim for at least 4:1 so the code scans reliably.`);
  return warnings;
}

export async function makeQrCode(input) {
  requireKindFields(input);
  const { payload, summary } = buildPayload(input);
  const foreground = normHex(input.foreground ?? "#000000");
  const background = normHex(input.background ?? "#ffffff");
  const errorCorrectionLevel = input.error_correction ?? "M";
  let qr;
  try {
    qr = QRCode.create(payload, { errorCorrectionLevel });
  } catch (e) {
    throw new PayloadError(`That is too much data for one QR code (${payload.length} characters). Shorten it, or link to a page instead. (${e.message})`);
  }
  const options = { errorCorrectionLevel, margin: 4, color: { dark: `${foreground}ff`, light: `${background}ff` } };
  const svg = await QRCode.toString(payload, { ...options, type: "svg" });
  const png = (await QRCode.toBuffer(payload, { ...options, type: "png", width: 1024 })).toString("base64");
  const warnings = colorWarnings(foreground, background);
  if (qr.version > 15) warnings.push(`This is a dense code (version ${qr.version}). Print it at least 4 cm (1.6 in) wide, or encode a shorter link.`);
  return {
    result: { kind: input.kind, encoded: payload, summary, version: qr.version, error_correction: errorCorrectionLevel, warnings },
    view: { svg, png, label: input.label ?? "", foreground, background },
  };
}

export function createQrServer() {
  const server = new McpServer({ name: "qr-code", title: "QR Code Generator", version: "1.0.0" });

  registerAppResource(server, "QR code view", VIEW_URI, { description: "Shows a scannable QR code with download buttons" }, async () => ({
    contents: [
      {
        uri: VIEW_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: buildWidget("qr"),
        _meta: {
          ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } },
          "openai/widgetDescription": "Shows the QR code the tool created, with PNG/SVG download buttons. Don't repeat the image or the encoded data in your reply.",
        },
      },
    ],
  }));

  registerAppTool(
    server,
    "create_qr_code",
    {
      title: "Create QR code",
      description:
        "Create a real, scannable QR code and show it to the user with download buttons. Use this whenever the user asks for a QR code: for a website link, Wi-Fi login, contact card (vCard), email, text message, phone call, map location or plain text. Never draw QR codes with image generation; they won't scan. After calling, briefly confirm what the code does. Don't paste the image or the raw payload back.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      _meta: {
        ui: { resourceUri: VIEW_URI },
        "openai/toolInvocation/invoking": "Creating QR code…",
        "openai/toolInvocation/invoked": "QR code ready",
      },
    },
    async (input) => {
      try {
        const { result, view } = await makeQrCode(input);
        const notes = result.warnings.length ? ` Warnings: ${result.warnings.join(" ")}` : "";
        return {
          content: [{ type: "text", text: `Created a version-${result.version} QR code (${result.summary}). It is shown to the user with PNG and SVG download buttons.${notes}` }],
          structuredContent: result,
          _meta: view,
        };
      } catch (e) {
        if (e instanceof PayloadError) return { isError: true, content: [{ type: "text", text: e.message }] };
        throw e;
      }
    },
  );

  return server;
}
