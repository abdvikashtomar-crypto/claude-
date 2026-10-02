# Plugin Directory listings

Copy these into the OpenAI dashboard when you create each app and plugin. Names, descriptions, categories and sample prompts match `plugins/*/.codex-plugin/plugin.json`.

Shared fields for all three:
- **Developer:** Vee Threads
- **Website:** https://veethreads.com
- **Privacy policy:** https://veethreads.com/pages/chatgpt-plugins-privacy
- **Terms:** https://veethreads.com/pages/chatgpt-plugins-terms
- **Support:** https://veethreads.com/pages/contact
- **Authentication:** none. No user data is stored.

---

## Research Papers

- **Icon:** `plugins/research-papers/assets/icon-64.png`
- **MCP URL:** `https://YOUR-URL/research/mcp`
- **Category:** Education
- **Short description:** Find real papers and cite them
- **Long description:** Search over 250 million scholarly works and get real, verifiable papers instead of invented references. Each result includes its DOI, authors, journal, year, citation count, abstract and, when available, a free full-text link. When you need a bibliography, the plugin formats it from the official metadata in APA 7, MLA 9, Chicago, Harvard, IEEE or BibTeX. It's built for students, researchers, journalists and anyone checking what the evidence says. Data comes from OpenAlex, an open index of the world's research.
- **Screenshots:** take them in ChatGPT developer mode after you deploy (this plugin has no widget, so the screenshots show ChatGPT's answer).

### Review test cases

| Prompt | Expected |
|---|---|
| "Find the most cited papers on intermittent fasting and weight loss since 2018." | Calls `search_papers` with `sort: most_cited`, `from_year: 2018`. The answer lists real papers with DOI links. |
| "Give me an APA reference for doi 10.1126/science.1225829" | Calls `format_citations`. Returns: Jinek, M., Chylinski, K., Fonfara, I., Hauer, M., Doudna, J. A., & Charpentier, E. (2012). A Programmable Dual-RNA–Guided DNA Endonuclease in Adaptive Bacterial Immunity. *Science*, *337*(6096), 816–821. https://doi.org/10.1126/science.1225829 |
| "Is 10.1234/fake-paper-2099 a real paper?" | Calls `get_paper`, which reports that no paper was found. |
| "Find open-access review articles about CRISPR off-target effects and give me BibTeX." | Calls `search_papers` (`type: review`, `open_access_only: true`), then `format_citations` with `style: bibtex`. |

---

## Diagrams

- **Icon:** `plugins/diagrams/assets/icon-64.png`
- **MCP URL:** `https://YOUR-URL/diagrams/mcp`
- **Category:** Design
- **Short description:** Flowcharts, mind maps and more
- **Long description:** Ask for a diagram and see it drawn right in the chat. Diagrams renders flowcharts, process maps, decision trees, mind maps, sequence diagrams, timelines, Gantt charts, org charts, entity-relationship diagrams, class and state diagrams, user journeys, quadrant charts, kanban boards and architecture diagrams. Download any diagram as a high-resolution PNG or a scalable SVG for slides and documents, or open it in the Mermaid Live Editor to fine-tune it. If a diagram has a syntax error, one click asks ChatGPT to fix it.
- **Screenshots:** `plugins/diagrams/assets/screenshot.png`, plus one from ChatGPT once deployed.

### Review test cases

| Prompt | Expected |
|---|---|
| "Draw a flowchart of our customer refund process." | Calls `render_diagram` with `flowchart` code. The widget shows the diagram with Download PNG/SVG and Edit in Mermaid Live. |
| "Make a mind map for planning a product launch." | `render_diagram` with `mindmap` code, rendered in the widget. |
| "Create a Gantt chart for a 6-week website redesign starting next Monday." | `render_diagram` with `gantt` code and real dates. |
| Click **Download PNG** | The host's download dialog offers `<title>.png`. |

---

## QR Code Generator

- **Icon:** `plugins/qr-code/assets/icon-64.png`
- **MCP URL:** `https://YOUR-URL/qr/mcp`
- **Category:** Productivity
- **Short description:** Scannable QR codes in seconds
- **Long description:** Make QR codes that actually scan. Describe what you need, such as a link to your menu, your café's Wi-Fi password, a contact card for your business card, a pre-filled email or text, a phone number or a map location, and get a crisp QR code with a print-ready PNG or SVG download. Add a caption like "Scan for our menu", pick brand colours, and choose higher error correction for codes printed on fabric, packaging or small labels. Warnings flag colour choices that phone cameras struggle to read.
- **Screenshots:** `plugins/qr-code/assets/screenshot.png`, plus one from ChatGPT once deployed.

### Review test cases

| Prompt | Expected |
|---|---|
| "Make a QR code for https://veethreads.com with the caption \"Shop handmade\"." | Calls `create_qr_code` (`kind: url`). The widget shows a code that scans to https://veethreads.com, with the caption below it. |
| "Create a Wi-Fi QR code for network CafeGuest, password latte2026." | `create_qr_code` with `kind: wifi`. Scanning it on a phone offers to join CafeGuest. |
| "Make a contact card QR code for Ada Lovelace, ada@example.com, +44 20 7946 0000." | `create_qr_code` with `kind: contact`. Scanning it offers to save the contact. |
| "Make a white-on-black QR code for example.com" | The code is created, and ChatGPT passes on the tool's warning that inverted codes may not scan. |
