// OpenAlex work records in the API's shape (trimmed), used by the tests instead of the live API.

const authorship = (name, position = "middle") => ({ author_position: position, author: { id: "https://openalex.org/A0", display_name: name }, raw_author_name: name });
const inverted = (text) => {
  const index = {};
  text.split(" ").forEach((word, i) => (index[word] ??= []).push(i));
  return index;
};

export const jinek2012 = {
  id: "https://openalex.org/W2045435533",
  doi: "https://doi.org/10.1126/science.1225829",
  title: "A Programmable Dual-RNA–Guided DNA Endonuclease in Adaptive Bacterial Immunity",
  display_name: "A Programmable Dual-RNA–Guided DNA Endonuclease in Adaptive Bacterial Immunity",
  publication_year: 2012,
  publication_date: "2012-06-28",
  type: "article",
  authorships: ["Martin Jinek", "Krzysztof Chylinski", "Ines Fonfara", "Michael Hauer", "Jennifer A. Doudna", "Emmanuelle Charpentier"].map((n, i) => authorship(n, i === 0 ? "first" : "middle")),
  primary_location: {
    is_oa: true,
    landing_page_url: "https://doi.org/10.1126/science.1225829",
    pdf_url: null,
    source: { id: "https://openalex.org/S3880285", display_name: "Science", type: "journal", host_organization_name: "American Association for the Advancement of Science" },
  },
  best_oa_location: { pdf_url: "https://europepmc.org/articles/pmc6286148?pdf=render" },
  open_access: { is_oa: true, oa_status: "green", oa_url: "https://europepmc.org/articles/pmc6286148" },
  cited_by_count: 15873,
  biblio: { volume: "337", issue: "6096", first_page: "816", last_page: "821" },
  abstract_inverted_index: inverted("Clustered regularly interspaced short palindromic repeats (CRISPR)/CRISPR-associated (Cas) systems provide bacteria and archaea with adaptive immunity against viruses and plasmids by using CRISPR RNAs (crRNAs) to guide the silencing of invading nucleic acids."),
};

export const doudna2014 = {
  id: "https://openalex.org/W2129937209",
  doi: "https://doi.org/10.1126/science.1258096",
  title: "The new frontier of genome engineering with CRISPR-Cas9",
  publication_year: 2014,
  type: "review",
  authorships: [authorship("Jennifer A. Doudna", "first"), authorship("Emmanuelle Charpentier", "last")],
  primary_location: { landing_page_url: "https://doi.org/10.1126/science.1258096", source: { display_name: "Science", host_organization_name: "American Association for the Advancement of Science" } },
  best_oa_location: null,
  open_access: { is_oa: false, oa_url: null },
  cited_by_count: 9120,
  biblio: { volume: "346", issue: "6213", first_page: "1258096", last_page: null },
  abstract_inverted_index: null,
};

export const preprint2023 = {
  id: "https://openalex.org/W4386000001",
  doi: "https://doi.org/10.48550/arxiv.2303.08774",
  title: "GPT-4 Technical Report",
  publication_year: 2023,
  type: "preprint",
  authorships: [authorship("OpenAI Team", "first")],
  primary_location: { landing_page_url: "https://arxiv.org/abs/2303.08774", source: { display_name: "arXiv (Cornell University)", host_organization_name: "Cornell University" } },
  best_oa_location: { pdf_url: "https://arxiv.org/pdf/2303.08774" },
  open_access: { is_oa: true, oa_url: "https://arxiv.org/pdf/2303.08774" },
  cited_by_count: 4200,
  biblio: {},
  abstract_inverted_index: inverted("We report the development of GPT-4, a large-scale, multimodal model."),
};

export const works = [jinek2012, doudna2014, preprint2023];

/** A fetch() stand-in that answers like api.openalex.org for the fixtures above. */
export function fakeOpenAlexFetch(calls = []) {
  return async (url) => {
    const u = new URL(url);
    calls.push(u);
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
    if (u.pathname === "/works") {
      const q = (u.searchParams.get("search") ?? "").toLowerCase();
      const results = works.filter((w) => q.split(/\s+/).some((t) => w.title.toLowerCase().includes(t)));
      return json(200, { meta: { count: results.length * 1000, per_page: Number(u.searchParams.get("per_page")) }, results });
    }
    const id = decodeURIComponent(u.pathname.replace(/^\/works\//, ""));
    const work = works.find((w) => w.id.endsWith(`/${id}`) || (id.startsWith("doi:") && w.doi.toLowerCase().endsWith(id.slice(4).toLowerCase())));
    return work ? json(200, work) : json(404, { error: "not found" });
  };
}
