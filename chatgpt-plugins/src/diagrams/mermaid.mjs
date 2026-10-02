// Light server-side checks on Mermaid code. Full parsing happens in the widget (Mermaid needs a
// browser); the widget reports syntax errors back to ChatGPT so it can fix them.

// Mirrors the detectors in Mermaid 12 (first line of the diagram, after front matter/comments).
export const DIAGRAM_TYPES = [
  [/^(graph|flowchart)/, "Flowchart"],
  [/^sequenceDiagram/, "Sequence diagram"],
  [/^classDiagram/, "Class diagram"],
  [/^stateDiagram/, "State diagram"],
  [/^erDiagram/, "Entity relationship diagram"],
  [/^journey/, "User journey"],
  [/^gantt/, "Gantt chart"],
  [/^pie/, "Pie chart"],
  [/^quadrantChart/, "Quadrant chart"],
  [/^requirement(Diagram)?/, "Requirement diagram"],
  [/^gitGraph/, "Git graph"],
  [/^C4(Context|Container|Component|Dynamic|Deployment)/, "C4 diagram"],
  [/^mindmap/, "Mind map"],
  [/^timeline/, "Timeline"],
  [/^sankey(-beta)?/, "Sankey diagram"],
  [/^xychart(-beta)?/, "XY chart"],
  [/^block(-beta)?/, "Block diagram"],
  [/^packet(-beta)?/, "Packet diagram"],
  [/^kanban/, "Kanban board"],
  [/^architecture/, "Architecture diagram"],
  [/^radar-beta/, "Radar chart"],
  [/^treemap/, "Treemap"],
  [/^ishikawa(-beta)?\b/i, "Fishbone diagram"],
  [/^venn-beta/, "Venn diagram"],
  [/^wardley-beta/i, "Wardley map"],
  [/^swimlane-beta\b/, "Swimlane diagram"],
  [/^usecase-beta(\s|$)/, "Use case diagram"],
  [/^treeView-beta/, "Tree view"],
  [/^eventmodeling/, "Event model"],
  [/^cynefin-beta([\s:]|$)/, "Cynefin framework"],
  [/^agentflow-beta\b/, "Agent flow"],
  [/^railroad(-abnf|-ebnf|-peg)?-beta/i, "Railroad diagram"],
];

export class DiagramError extends Error {}

/** Strips Markdown fences and returns `{ code, type, typeName }`, or throws DiagramError. */
export function prepareMermaid(raw) {
  let code = String(raw ?? "").replace(/\r\n?/g, "\n").trim();
  const fenced = code.match(/^```[ \t]*(?:mermaid)?[ \t]*\n([\s\S]*?)\n?```$/i);
  if (fenced) code = fenced[1].trim();
  if (!code) throw new DiagramError("The Mermaid code is empty.");

  // Skip YAML front matter, %%{init}%% directives and %% comments to find the diagram keyword.
  const lines = code.split("\n");
  let i = 0;
  if (lines[0].trim() === "---") {
    const end = lines.findIndex((line, n) => n > 0 && line.trim() === "---");
    if (end === -1) throw new DiagramError("The front matter block that starts with --- is never closed.");
    i = end + 1;
  }
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith("%%")) break;
  }
  const first = (lines[i] ?? "").trim();
  const match = DIAGRAM_TYPES.find(([pattern]) => pattern.test(first));
  if (!match) {
    throw new DiagramError(
      `"${first.slice(0, 60)}" does not start a Mermaid diagram. The first line must name the diagram type, e.g. "flowchart TD", "sequenceDiagram", "gantt", "mindmap", "erDiagram" or "pie".`,
    );
  }
  return { code, type: first.match(match[0])[0], typeName: match[1] };
}

/** Link that opens the diagram in the Mermaid Live Editor for editing and export. */
export function mermaidLiveUrl(code, theme = "default") {
  const state = { code, mermaid: JSON.stringify({ theme }, null, 2), autoSync: true, updateDiagram: true };
  return `https://mermaid.live/edit#base64:${Buffer.from(JSON.stringify(state)).toString("base64")}`;
}
