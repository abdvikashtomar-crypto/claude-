import { McpServer } from "@modelcontextprotocol/server";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { buildWidget } from "../widget.mjs";
import { DiagramError, mermaidLiveUrl, prepareMermaid } from "./mermaid.mjs";

const VIEW_URI = "ui://diagrams/view.html";

const DESCRIPTION = `Render a diagram from Mermaid code and show it to the user as an image they can download (PNG/SVG) or edit in Mermaid Live.
Use it whenever a picture explains better than text: flowcharts, process maps, decision trees, sequence diagrams, org charts, mind maps, timelines, Gantt charts/project plans, ER/database diagrams, class/state diagrams, user journeys, pie/quadrant/XY charts, git graphs, kanban boards and architecture diagrams.
Mermaid rules that avoid syntax errors:
- The first line names the type: flowchart TD (or LR), sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, mindmap, timeline, journey, quadrantChart, xychart, gitGraph, kanban, architecture-beta.
- Wrap labels with spaces or punctuation in double quotes: A["Check stock (daily)"] --> B{"In stock?"}. Never use unescaped quotes inside a label; use #quot; instead.
- Node ids are single words without spaces; don't use the word "end" as an id.
- mindmap uses indentation only, no arrows. gantt needs "dateFormat YYYY-MM-DD" and "section" lines.
If the user sees a syntax error, the widget asks you to fix it: correct the code and call this tool again.
After calling, describe the diagram in one or two sentences. Don't paste the Mermaid code unless asked.`;

const inputSchema = z.object({
  mermaid: z.string().max(20000).describe("Mermaid diagram code (no Markdown fences needed)"),
  title: z.string().max(120).optional().describe("Short title shown above the diagram and used for file names"),
  theme: z.enum(["default", "neutral", "dark", "forest", "base"]).default("default").describe("Mermaid colour theme"),
});

const outputSchema = z.object({
  title: z.string(),
  diagram_type: z.string(),
  mermaid: z.string(),
  theme: z.string(),
  edit_url: z.string().describe("Opens the diagram in the Mermaid Live Editor"),
});

export function createDiagramsServer({ publicUrl }) {
  const server = new McpServer({ name: "diagrams", title: "Diagrams", version: "1.0.0" });
  const assetOrigin = new URL(publicUrl).origin;

  registerAppResource(server, "Diagram view", VIEW_URI, { description: "Renders Mermaid diagrams with export buttons" }, async () => ({
    contents: [
      {
        uri: VIEW_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: buildWidget("diagram", { MERMAID_URL: `${publicUrl}/assets/mermaid.min.js` }),
        _meta: {
          ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [assetOrigin] } },
          "openai/widgetDescription": "Shows the rendered diagram with download and edit buttons. If rendering fails it shows the Mermaid error and offers to ask you for a fix.",
        },
      },
    ],
  }));

  registerAppTool(
    server,
    "render_diagram",
    {
      title: "Render diagram",
      description: DESCRIPTION,
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      _meta: {
        ui: { resourceUri: VIEW_URI },
        "openai/toolInvocation/invoking": "Drawing diagram…",
        "openai/toolInvocation/invoked": "Diagram ready",
      },
    },
    async ({ mermaid, title, theme }) => {
      try {
        const { code, typeName } = prepareMermaid(mermaid);
        const result = { title: title?.trim() || typeName, diagram_type: typeName, mermaid: code, theme, edit_url: mermaidLiveUrl(code, theme) };
        return {
          content: [{ type: "text", text: `Showing the ${typeName.toLowerCase()} "${result.title}" to the user. If Mermaid reports a syntax error the widget will tell you so you can fix it.` }],
          structuredContent: result,
        };
      } catch (e) {
        if (e instanceof DiagramError) return { isError: true, content: [{ type: "text", text: e.message }] };
        throw e;
      }
    },
  );

  return server;
}
