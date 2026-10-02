---
name: diagrams
description: Draw diagrams with the render_diagram tool. Use when the user asks for a flowchart, process map, decision tree, mind map, sequence diagram, timeline, Gantt chart, org chart, ER/database diagram, class or state diagram, user journey, quadrant/pie/XY chart, kanban board or architecture diagram, or when a visual would explain a process better than text.
---

# Diagrams

Write Mermaid code and call `render_diagram`. The user sees the rendered diagram with PNG/SVG download and an "Edit in Mermaid Live" button, so don't paste the code unless they ask for it.

## Pick the diagram type

| The user wants | Use |
|---|---|
| Process, workflow, decision tree, org chart | `flowchart TD` (top-down) or `flowchart LR` (left-right) |
| Who talks to whom, API calls, conversations | `sequenceDiagram` |
| Brainstorm, topic breakdown | `mindmap` |
| Project schedule | `gantt` |
| History, roadmap | `timeline` |
| Database tables | `erDiagram` |
| Software structure | `classDiagram`, `stateDiagram-v2`, `architecture-beta` |
| Customer experience | `journey` |
| Shares of a whole | `pie` |
| 2x2 prioritisation | `quadrantChart` |
| Tasks by status | `kanban` |

## Syntax rules that prevent errors

- The first line is the diagram type.
- Node ids are single words (`orderPlaced`, `A1`). Put display text in brackets: `A["Order placed"]`.
- Quote any label with spaces, punctuation or non-ASCII text: `B{"In stock?"}`, `C["Ship (2-3 days)"]`. Use `#quot;` for a double quote inside a label.
- Don't name a node `end`, `graph` or `subgraph`; write `finish` instead.
- Edge labels: `A -- "Yes" --> B` or `A -->|Yes| B`.
- `mindmap` uses indentation only, with no arrows or colons. The root looks like `root((Topic))`.
- `gantt` needs `dateFormat YYYY-MM-DD`, then `section` lines, then tasks like `Design :a1, 2026-10-01, 7d` and `Build :after a1, 14d`.
- `sequenceDiagram` arrows: `->>` for a request, `-->>` for a reply. Use `participant` lines to set the order.
- Keep diagrams readable: about 25 nodes at most. Split bigger processes into several diagrams.

## Examples

```
flowchart LR
  start(["Customer orders"]) --> pay{"Payment OK?"}
  pay -- "Yes" --> pack["Pack order"] --> ship["Ship"]
  pay -- "No" --> retry["Email payment link"]
```

```
mindmap
  root((Product launch))
    Audience
      Existing customers
      New buyers
    Channels
      Instagram
      Email
```

## When rendering fails

The widget shows Mermaid's error and may ask you to fix it. Read the error, correct the code (usually an unquoted label or a wrong keyword), and call `render_diagram` again. Don't explain the error at length.
