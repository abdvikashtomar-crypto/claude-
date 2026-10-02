// Points each plugin's .mcp.json at your deployed server: node scripts/set-url.mjs https://plugins.example.com
import { readFileSync, writeFileSync } from "node:fs";

const base = process.argv[2]?.replace(/\/$/, "");
if (!base || !/^https:\/\//.test(base)) {
  console.error("Usage: node scripts/set-url.mjs https://your-server.example.com");
  process.exit(1);
}
for (const [plugin, path] of [["research-papers", "research"], ["diagrams", "diagrams"], ["qr-code", "qr"]]) {
  const file = new URL(`../plugins/${plugin}/.mcp.json`, import.meta.url);
  const config = JSON.parse(readFileSync(file, "utf8"));
  config.mcpServers[plugin].url = `${base}/${path}/mcp`;
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`${plugin}: ${config.mcpServers[plugin].url}`);
}
