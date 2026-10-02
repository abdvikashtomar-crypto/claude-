// One Node process serves all three ChatGPT plugins, each at its own MCP endpoint:
//   /research/mcp   Research Papers   (search_papers, get_paper, format_citations)
//   /diagrams/mcp   Diagrams          (render_diagram + widget)
//   /qr/mcp         QR Code Generator (create_qr_code + widget)
import http from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createDiagramsServer } from "./src/diagrams/server.mjs";
import { createQrServer } from "./src/qr/server.mjs";
import { OpenAlex } from "./src/research/openalex.mjs";
import { createResearchServer } from "./src/research/server.mjs";

const require = createRequire(import.meta.url);

function staticAsset(path, type) {
  const body = readFileSync(path);
  return { type, body, gzipped: gzipSync(body, { level: 9 }) };
}

const LEGAL = {
  "/privacy": new URL("./legal/privacy-policy.md", import.meta.url),
  "/terms": new URL("./legal/terms-of-use.md", import.meta.url),
};

export function createApp({ publicUrl, openalex = new OpenAlex(), log = console } = {}) {
  const base = publicUrl.replace(/\/$/, "");
  const onerror = (e) => log.error(`[mcp] ${e.message}`);
  const endpoints = {
    "/research/mcp": toNodeHandler(createMcpHandler(() => createResearchServer({ openalex }), { onerror }), { onerror }),
    "/diagrams/mcp": toNodeHandler(createMcpHandler(() => createDiagramsServer({ publicUrl: base }), { onerror }), { onerror }),
    "/qr/mcp": toNodeHandler(createMcpHandler(() => createQrServer(), { onerror }), { onerror }),
  };
  const assets = {
    "/assets/mermaid.min.js": staticAsset(require.resolve("mermaid/dist/mermaid.min.js"), "text/javascript; charset=utf-8"),
  };

  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    try {
      const endpoint = endpoints[pathname.replace(/\/$/, "")];
      if (endpoint) return await endpoint(req, res);

      const asset = assets[pathname];
      if (asset) {
        const gzip = /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");
        res.writeHead(200, {
          "content-type": asset.type,
          "cache-control": "public, max-age=86400",
          "access-control-allow-origin": "*",
          "cross-origin-resource-policy": "cross-origin",
          vary: "accept-encoding",
          ...(gzip && { "content-encoding": "gzip" }),
        });
        return res.end(gzip ? asset.gzipped : asset.body);
      }

      if (LEGAL[pathname]) {
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        return res.end(readFileSync(LEGAL[pathname]));
      }
      if (pathname === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ ok: true }));
      }
      if (pathname === "/") {
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        return res.end(Object.keys(endpoints).map((p) => `${base}${p}`).join("\n"));
      }
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
    } catch (e) {
      log.error(e);
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
      res.end("Internal error");
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 8787);
  const publicUrl = process.env.PUBLIC_URL ?? `http://localhost:${port}`;
  if (!process.env.OPENALEX_API_KEY) console.warn("OPENALEX_API_KEY is not set: OpenAlex allows only 100 anonymous requests a day. Get a free key at https://openalex.org/settings/api");
  if (!process.env.PUBLIC_URL) console.warn(`PUBLIC_URL is not set; widgets will load assets from ${publicUrl}. Set it to your public https URL in production.`);
  createApp({ publicUrl }).listen(port, () => console.log(`ChatGPT plugins listening on ${publicUrl} (port ${port})`));
}
