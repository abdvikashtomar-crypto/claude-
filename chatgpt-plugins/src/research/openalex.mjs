// Small OpenAlex client (https://openalex.org): 250M+ scholarly works, free API key required
// since Feb 2026 (anonymous use is capped at 100 calls a day).

const BASE = "https://api.openalex.org";
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 500;

export class OpenAlexError extends Error {}
export class InvalidIdError extends OpenAlexError {}

export class OpenAlex {
  constructor({ apiKey = process.env.OPENALEX_API_KEY, fetch = globalThis.fetch } = {}) {
    this.apiKey = apiKey;
    this.fetch = fetch;
    this.cache = new Map();
  }

  async get(path, params = {}) {
    const url = new URL(path, BASE);
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") url.searchParams.set(key, value);
    const cacheKey = url.href;
    const hit = this.cache.get(cacheKey);
    if (hit && hit.expires > Date.now()) return hit.value;

    if (this.apiKey) url.searchParams.set("api_key", this.apiKey);
    const res = await this.fetch(url, { headers: { accept: "application/json", "user-agent": "research-papers-chatgpt-plugin/1.0" } });
    if (res.status === 404) return null;
    if (res.status === 429) throw new OpenAlexError("The paper database is rate-limiting requests right now. Try again in a minute.");
    if (!res.ok) throw new OpenAlexError(`The paper database returned an error (${res.status}).`);
    const value = await res.json();

    if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(cacheKey, { value, expires: Date.now() + CACHE_TTL_MS });
    return value;
  }

  async searchWorks({ query, limit = 8, fromYear, toYear, openAccessOnly = false, sort = "relevance", type }) {
    const filters = [];
    if (fromYear) filters.push(`from_publication_date:${fromYear}-01-01`);
    if (toYear) filters.push(`to_publication_date:${toYear}-12-31`);
    if (openAccessOnly) filters.push("is_oa:true");
    if (type) filters.push(`type:${type}`);
    const sortParam = { relevance: undefined, most_cited: "cited_by_count:desc", newest: "publication_date:desc" }[sort];
    const data = await this.get("/works", { search: query, filter: filters.join(","), sort: sortParam, per_page: limit });
    return { total: data?.meta?.count ?? 0, works: data?.results ?? [] };
  }

  /** Looks up one work by DOI (bare, doi: or https://doi.org/ form), OpenAlex id/URL, or PubMed id. */
  async getWork(id) {
    const path = encodeURIComponent(normalizeWorkId(id)).replace(/%2F/gi, "/").replace(/%3A/gi, ":");
    return this.get(`/works/${path}`);
  }
}

export function normalizeWorkId(raw) {
  const id = String(raw).trim();
  const doi = id.match(/(?:doi\.org\/|doi:\s*)?(10\.\d{4,9}\/\S+)$/i);
  if (doi) return `doi:${doi[1].replace(/[.,;]+$/, "")}`;
  const openalex = id.match(/(?:openalex\.org\/)?(W\d+)$/i);
  if (openalex) return openalex[1].toUpperCase();
  const pmid = id.match(/^(?:pmid:\s*)?(\d{5,9})$/i);
  if (pmid) return `pmid:${pmid[1]}`;
  throw new InvalidIdError(`"${id}" isn't a DOI, OpenAlex id (W…) or PubMed id.`);
}

/** OpenAlex stores abstracts as {word: [positions]}; rebuild the text. */
export function abstractText(invertedIndex) {
  if (!invertedIndex) return "";
  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) for (const p of positions) words[p] = word;
  return words.filter((w) => w !== undefined).join(" ");
}

const clip = (text, max) => (text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text);

/** Flattens an OpenAlex work into the fields the tools return. */
export function simplifyWork(work, { abstractChars = 600, maxAuthors = 10 } = {}) {
  const authors = (work.authorships ?? []).map((a) => a.author?.display_name || a.raw_author_name).filter(Boolean);
  const source = work.primary_location?.source;
  const doi = work.doi ? work.doi.replace(/^https?:\/\/doi\.org\//i, "") : null;
  const oaUrl = work.best_oa_location?.pdf_url || work.open_access?.oa_url || null;
  const abstract = abstractText(work.abstract_inverted_index);
  return {
    id: work.id?.replace("https://openalex.org/", "") ?? null,
    doi,
    title: work.title ?? work.display_name ?? "Untitled",
    authors: authors.length > maxAuthors ? [...authors.slice(0, maxAuthors), `+${authors.length - maxAuthors} more`] : authors,
    year: work.publication_year ?? null,
    venue: source?.display_name ?? null,
    type: work.type ?? null,
    cited_by: work.cited_by_count ?? 0,
    open_access_url: oaUrl,
    url: doi ? `https://doi.org/${doi}` : work.primary_location?.landing_page_url || work.id,
    abstract: abstractChars ? clip(abstract, abstractChars) : abstract,
  };
}
