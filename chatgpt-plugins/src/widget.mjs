// Builds the HTML for a widget (an MCP Apps "view"). Widgets are self-contained: the MCP Apps
// client bundle is inlined, so the only network request a widget makes is to optional assets
// declared in its CSP.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const widgetsDir = new URL("../widgets/", import.meta.url);

let sdkScript;
function mcpAppsSdkScript() {
  if (sdkScript) return sdkScript;
  const bundlePath = require.resolve("@modelcontextprotocol/ext-apps/app-with-deps");
  const bundle = readFileSync(bundlePath, "utf8");
  // The bundle is an ES module whose only export statement sits at the end. Turn it into a
  // global so plain inline scripts can use it without an import map or a second request.
  const match = bundle.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
  if (!match) throw new Error("Unexpected @modelcontextprotocol/ext-apps bundle format");
  const entries = match[1].split(",").map((part) => {
    const [local, exported = local] = part.trim().split(/\s+as\s+/);
    return `${JSON.stringify(exported)}:${local}`;
  });
  const code = `${bundle.slice(0, match.index)}\nglobalThis.McpApps={${entries.join(",")}};`;
  sdkScript = `<script type="module">${code.replaceAll("</script", "<\\/script")}</script>`;
  return sdkScript;
}

const readWidgetFile = (file) => readFileSync(new URL(file, widgetsDir), "utf8");

/**
 * Reads widgets/<name>.html, inlines the MCP Apps SDK at `<!-- MCP_APPS_SDK -->`, the shared
 * styles and helpers at `/* BASE_CSS *\/` and `/* BASE_JS *\/`, and fills `{{KEY}}` placeholders
 * from `vars`.
 */
export function buildWidget(name, vars = {}) {
  let html = readWidgetFile(`${name}.html`);
  for (const [key, value] of Object.entries(vars)) html = html.replaceAll(`{{${key}}}`, () => value);
  return html
    .replace("/* BASE_CSS */", () => readWidgetFile("base.css"))
    .replace("/* BASE_JS */", () => readWidgetFile("base.js"))
    .replace("<!-- MCP_APPS_SDK -->", () => mcpAppsSdkScript());
}
