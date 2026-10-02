import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { formatCitations, STYLES } from "./citations.mjs";
import { InvalidIdError, OpenAlex, OpenAlexError, simplifyWork } from "./openalex.mjs";

const paperSchema = z.object({
  id: z.string().nullable().describe("OpenAlex id, usable with get_paper and format_citations"),
  doi: z.string().nullable(),
  title: z.string(),
  authors: z.array(z.string()),
  year: z.number().nullable(),
  venue: z.string().nullable().describe("Journal, conference or repository"),
  type: z.string().nullable(),
  cited_by: z.number(),
  open_access_url: z.string().nullable().describe("Free full text, when available"),
  url: z.string().nullable(),
  abstract: z.string(),
});

const READ_ONLY = { readOnlyHint: true, openWorldHint: true, destructiveHint: false };

function paperLine(p, i) {
  const by = p.authors.length ? `${p.authors.slice(0, 3).join(", ")}${p.authors.length > 3 ? " et al." : ""}` : "Unknown authors";
  const free = p.open_access_url ? ` · free full text: ${p.open_access_url}` : "";
  return `${i + 1}. ${p.title} (${p.year ?? "n.d."}). ${by}. ${p.venue ?? ""} · cited by ${p.cited_by} · ${p.url}${free} [id: ${p.id}]`;
}

function toolError(e) {
  if (e instanceof OpenAlexError) return { isError: true, content: [{ type: "text", text: e.message }] };
  throw e;
}

export function createResearchServer({ openalex = new OpenAlex() } = {}) {
  const server = new McpServer({ name: "research-papers", title: "Research Papers", version: "1.0.0" });

  server.registerTool(
    "search_papers",
    {
      title: "Search research papers",
      description:
        "Search 250M+ scholarly works (journal articles, preprints, books, theses) and get real, verifiable papers with DOIs, citation counts, abstracts and free full-text links. Use this for literature searches, finding evidence or sources, \"what does research say about…\", and before citing any paper: never invent references. Cite results with their DOI links. Search with short keyword queries (e.g. \"intermittent fasting weight loss randomized trial\"), not full questions.",
      inputSchema: z.object({
        query: z.string().min(2).max(300).describe("Keywords to search titles, abstracts and full text"),
        limit: z.number().int().min(1).max(25).default(8),
        from_year: z.number().int().min(1500).max(2100).optional(),
        to_year: z.number().int().min(1500).max(2100).optional(),
        sort: z.enum(["relevance", "most_cited", "newest"]).default("relevance"),
        open_access_only: z.boolean().default(false).describe("Only papers with free full text"),
        type: z.enum(["article", "review", "preprint", "book", "book-chapter", "dissertation"]).optional().describe("Restrict to one kind of work, e.g. review for review articles"),
      }),
      outputSchema: z.object({ total_results: z.number(), papers: z.array(paperSchema) }),
      annotations: READ_ONLY,
      _meta: { "openai/toolInvocation/invoking": "Searching papers…", "openai/toolInvocation/invoked": "Found papers" },
    },
    async ({ query, limit, from_year, to_year, sort, open_access_only, type }) => {
      try {
        const { total, works } = await openalex.searchWorks({ query, limit, fromYear: from_year, toYear: to_year, openAccessOnly: open_access_only, sort, type });
        const papers = works.map((w) => simplifyWork(w));
        const text = papers.length
          ? `${total.toLocaleString("en-US")} results for "${query}". Top ${papers.length}:\n${papers.map(paperLine).join("\n")}`
          : `No papers found for "${query}". Try fewer or broader keywords.`;
        return { content: [{ type: "text", text }], structuredContent: { total_results: total, papers } };
      } catch (e) {
        return toolError(e);
      }
    },
  );

  server.registerTool(
    "get_paper",
    {
      title: "Get paper details",
      description: "Get the full record for one paper by DOI, OpenAlex id (W…) or PubMed id: complete abstract, all authors, venue, citation count and free full-text link. Use it to check a reference is real or to read an abstract before summarising a paper.",
      inputSchema: z.object({ id: z.string().min(3).describe('DOI (e.g. "10.1126/science.1225829" or a doi.org link), OpenAlex id (e.g. "W2045435533") or PubMed id') }),
      outputSchema: z.object({ found: z.boolean(), paper: paperSchema.nullable() }),
      annotations: READ_ONLY,
      _meta: { "openai/toolInvocation/invoking": "Looking up paper…", "openai/toolInvocation/invoked": "Paper found" },
    },
    async ({ id }) => {
      try {
        const work = await openalex.getWork(id);
        if (!work) return { content: [{ type: "text", text: `No paper found for "${id}". It may not exist, or the identifier is mistyped.` }], structuredContent: { found: false, paper: null } };
        const paper = simplifyWork(work, { abstractChars: 0, maxAuthors: 100 });
        const text = `${paper.title} (${paper.year ?? "n.d."})\nAuthors: ${paper.authors.join(", ")}\nVenue: ${paper.venue ?? "unknown"} · type: ${paper.type} · cited by ${paper.cited_by}\nLink: ${paper.url}${paper.open_access_url ? `\nFree full text: ${paper.open_access_url}` : ""}\n\nAbstract: ${paper.abstract || "(no abstract available)"}`;
        return { content: [{ type: "text", text }], structuredContent: { found: true, paper } };
      } catch (e) {
        return toolError(e);
      }
    },
  );

  server.registerTool(
    "format_citations",
    {
      title: "Format citations",
      description:
        "Build an accurate reference list from the papers' official metadata in APA 7, MLA 9, Chicago (author-date), Harvard, IEEE or BibTeX. Use this instead of writing citations yourself whenever the user wants references, a bibliography or works cited. Pass DOIs or ids from search_papers. Show the returned text to the user as is.",
      inputSchema: z.object({
        ids: z.array(z.string()).min(1).max(25).describe("DOIs, OpenAlex ids or PubMed ids"),
        style: z.enum(STYLES).default("apa"),
      }),
      outputSchema: z.object({ style: z.string(), citations: z.string(), not_found: z.array(z.string()) }),
      annotations: READ_ONLY,
      _meta: { "openai/toolInvocation/invoking": "Formatting citations…", "openai/toolInvocation/invoked": "Citations ready" },
    },
    async ({ ids, style }) => {
      try {
        const works = await Promise.all(ids.map((id) => openalex.getWork(id).catch((e) => (e instanceof InvalidIdError ? null : Promise.reject(e)))));
        const found = works.filter(Boolean);
        const notFound = ids.filter((_, i) => !works[i]);
        const citations = found.length ? formatCitations(found, style) : "";
        const missing = notFound.length ? `\n\nNot found (check these identifiers): ${notFound.join(", ")}` : "";
        return {
          content: [{ type: "text", text: `${citations || "None of the identifiers matched a paper."}${missing}` }],
          structuredContent: { style, citations, not_found: notFound },
        };
      } catch (e) {
        return toolError(e);
      }
    },
  );

  return server;
}
