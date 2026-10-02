// Citation formatting for OpenAlex works: APA 7, MLA 9, Chicago author-date 17, Harvard
// (Cite Them Right), IEEE and BibTeX. Output is Markdown (*italics*).

export const STYLES = ["apa", "mla", "chicago", "harvard", "ieee", "bibtex"];

const PARTICLES = new Set(["van", "von", "der", "den", "de", "del", "della", "di", "da", "dos", "das", "du", "la", "le", "ten", "ter", "bin", "al", "el", "st."]);
const SUFFIXES = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
const ORGANIZATION = /\b(collaboration|consortium|group|organi[sz]ation|committee|institute|network|team|society|association|council|project|investigators|working party)\b/i;

/** "Jennifer A. Doudna" → { family: "Doudna", given: "Jennifer A." }. Organisations become { literal }. */
export function parseName(raw) {
  const name = String(raw).replace(/\s+/g, " ").trim();
  if (ORGANIZATION.test(name)) return { literal: name };
  if (name.includes(",")) {
    const [family, given] = name.split(",", 2).map((s) => s.trim());
    return { family, given };
  }
  const parts = name.split(" ");
  let suffix = "";
  if (parts.length > 2 && SUFFIXES.test(parts.at(-1))) suffix = parts.pop();
  if (parts.length === 1) return { family: parts[0], given: "", suffix };
  let start = parts.length - 1;
  while (start > 1 && PARTICLES.has(parts[start - 1].toLowerCase())) start--;
  return { family: parts.slice(start).join(" "), given: parts.slice(0, start).join(" "), suffix };
}

/** "Jean-Paul A." → ["J.-P.", "A."] */
function initials(given) {
  return given
    .replace(/\./g, ". ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.split("-").map((p) => `${p[0].toUpperCase()}.`).join("-"));
}

const familyFirst = (a, sep = " ") => (a.literal ? a.literal : `${a.family}${a.given ? `, ${initials(a.given).join(sep)}` : ""}${a.suffix ? `, ${a.suffix}` : ""}`);
const initialsFirst = (a) => (a.literal ? a.literal : `${a.given ? `${initials(a.given).join(" ")} ` : ""}${a.family}${a.suffix ? ` ${a.suffix}` : ""}`);
const fullFamilyFirst = (a) => (a.literal ? a.literal : `${a.family}${a.given ? `, ${a.given}` : ""}${a.suffix ? `, ${a.suffix}` : ""}`);
const fullGivenFirst = (a) => (a.literal ? a.literal : `${a.given ? `${a.given} ` : ""}${a.family}${a.suffix ? ` ${a.suffix}` : ""}`);

/** Joins names: serialComma adds the comma before the conjunction for 3+ names, pairComma for 2. */
function joinList(items, conjunction, { serialComma = true, pairComma = false } = {}) {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]}${pairComma ? "," : ""} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}${serialComma ? "," : ""} ${conjunction} ${items.at(-1)}`;
}

const stripTags = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const endPunct = (s) => (/[.?!]$/.test(s) ? s : `${s}.`);

/** Abbreviated second page number for MLA/Chicago: 816–821 → 816–21. */
function shortRange(first, last) {
  if (!/^\d+$/.test(first) || !/^\d+$/.test(last) || first.length !== last.length || first.length < 3) return last;
  let i = 0;
  while (i < first.length && first[i] === last[i]) i++;
  return last.slice(Math.min(i, last.length - 2));
}

const KIND = { book: "book", "book-chapter": "chapter", preprint: "preprint", dissertation: "thesis", dataset: "dataset", report: "report" };

/** Normalises an OpenAlex work for the formatters. */
export function citationRecord(work) {
  const source = work.primary_location?.source;
  const biblio = work.biblio ?? {};
  return {
    kind: KIND[work.type] ?? "article",
    authors: (work.authorships ?? []).map((a) => a.author?.display_name || a.raw_author_name).filter(Boolean).map(parseName),
    year: work.publication_year ? String(work.publication_year) : null,
    title: stripTags(work.title ?? work.display_name ?? "Untitled"),
    container: source?.display_name ? stripTags(source.display_name) : null,
    publisher: source?.host_organization_name ?? null,
    volume: biblio.volume || null,
    issue: biblio.issue || null,
    firstPage: biblio.first_page || null,
    lastPage: biblio.last_page && biblio.last_page !== biblio.first_page ? biblio.last_page : null,
    doi: work.doi ? work.doi.replace(/^https?:\/\/doi\.org\//i, "") : null,
    url: work.primary_location?.landing_page_url || work.id || null,
  };
}

const link = (r) => (r.doi ? `https://doi.org/${r.doi}` : r.url);
const pages = (r, dash = "–", short = false) => (r.firstPage ? (r.lastPage ? `${r.firstPage}${dash}${short ? shortRange(r.firstPage, r.lastPage) : r.lastPage}` : r.firstPage) : null);

function apa(r) {
  const names = r.authors.map((a) => familyFirst(a));
  const authors = names.length > 20 ? `${names.slice(0, 19).join(", ")}, . . . ${names.at(-1)}` : joinList(names, "&", { pairComma: true });
  const year = `(${r.year ?? "n.d."}).`;
  const head = authors ? `${endPunct(authors)} ${year}` : null;
  let body;
  if (r.kind === "book" || r.kind === "thesis" || r.kind === "report" || r.kind === "dataset") {
    const label = { thesis: " [Doctoral dissertation]", dataset: " [Data set]" }[r.kind] ?? "";
    body = `*${r.title}*${label}.${r.publisher ? ` ${endPunct(r.publisher)}` : ""}`;
  } else if (r.kind === "chapter") {
    body = `${endPunct(r.title)}${r.container ? ` In *${r.container}*${pages(r) ? ` (pp. ${pages(r)})` : ""}.` : ""}${r.publisher ? ` ${endPunct(r.publisher)}` : ""}`;
  } else if (r.kind === "preprint") {
    body = `*${r.title}* [Preprint].${r.container ? ` ${endPunct(r.container)}` : ""}`;
  } else {
    const volume = r.volume ? `, *${r.volume}*${r.issue ? `(${r.issue})` : ""}` : "";
    body = `${endPunct(r.title)}${r.container ? ` *${r.container}*${volume}${pages(r) ? `, ${pages(r)}` : ""}.` : ""}`;
  }
  const parts = head ? [head, body] : [body, year];
  return `${parts.join(" ")} ${link(r) ?? ""}`.trim();
}

function mla(r) {
  const a = r.authors;
  const authors = a.length === 0 ? "" : a.length === 1 ? fullFamilyFirst(a[0]) : a.length === 2 ? `${fullFamilyFirst(a[0])}, and ${fullGivenFirst(a[1])}` : `${fullFamilyFirst(a[0])}, et al`;
  const isBook = ["book", "thesis", "report", "dataset"].includes(r.kind);
  const title = isBook ? `*${r.title}*.` : `“${endPunct(r.title)}”`;
  const container = [];
  if (!isBook && r.container) container.push(`*${r.container}*`);
  if (isBook && r.publisher) container.push(r.publisher);
  if (r.volume) container.push(`vol. ${r.volume}`);
  if (r.issue) container.push(`no. ${r.issue}`);
  if (r.year) container.push(r.year);
  if (pages(r)) container.push(`${r.lastPage ? "pp." : "p."} ${pages(r, "-", true)}`);
  const doi = r.doi ? `https://doi.org/${r.doi}` : r.url;
  return [authors && endPunct(authors), title, container.length ? `${container.join(", ")}.` : "", doi ? `${doi}.` : ""].filter(Boolean).join(" ");
}

function chicago(r) {
  let a = r.authors;
  let etAl = false;
  if (a.length > 10) {
    a = a.slice(0, 7);
    etAl = true;
  }
  const names = a.map((x, i) => (i === 0 ? fullFamilyFirst(x) : fullGivenFirst(x)));
  const authors = etAl ? `${names.join(", ")}, et al` : joinList(names, "and", { pairComma: true });
  const isBook = ["book", "thesis", "report", "dataset"].includes(r.kind);
  const title = isBook ? `*${endPunct(r.title)}*` : `“${endPunct(r.title)}”`;
  let container = "";
  if (isBook) container = r.publisher ? endPunct(r.publisher) : "";
  else if (r.container) {
    container = `*${r.container}*`;
    if (r.volume) container += ` ${r.volume}${r.issue ? ` (${r.issue})` : ""}`;
    if (pages(r)) container += `${r.volume ? ":" : ","} ${pages(r, "–", true)}`;
    container += ".";
  }
  return [authors && endPunct(authors), `${r.year ?? "n.d."}.`, title, container, link(r) ? `${link(r)}.` : ""].filter(Boolean).join(" ");
}

function harvard(r) {
  const a = r.authors;
  const authors = a.length > 3 ? `${familyFirst(a[0], "")} et al.` : joinList(a.map((x) => familyFirst(x, "")), "and", { serialComma: false });
  const isBook = ["book", "thesis", "report", "dataset"].includes(r.kind);
  const title = isBook ? `*${r.title}*.` : `‘${r.title}’,`;
  let rest = "";
  if (isBook) rest = r.publisher ? `${endPunct(r.publisher)}` : "";
  else if (r.container) {
    rest = `*${r.container}*`;
    if (r.volume) rest += `, ${r.volume}${r.issue ? `(${r.issue})` : ""}`;
    if (pages(r)) rest += `, ${r.lastPage ? "pp." : "p."} ${pages(r)}`;
    rest += ".";
  }
  const available = link(r) ? `Available at: ${link(r)}.` : "";
  return [authors, `(${r.year ?? "no date"})`, title, rest, available].filter(Boolean).join(" ");
}

function ieee(r, n) {
  const a = r.authors;
  const authors = a.length > 6 ? `${initialsFirst(a[0])} *et al.*` : joinList(a.map(initialsFirst), "and");
  const isBook = ["book", "thesis", "report", "dataset"].includes(r.kind);
  const parts = [];
  if (isBook) {
    parts.push(`*${r.title}*`);
    if (r.publisher) parts.push(r.publisher);
  } else {
    parts.push(`“${r.title},”`);
    if (r.container) parts.push(`*${r.container}*`);
    if (r.volume) parts.push(`vol. ${r.volume}`);
    if (r.issue) parts.push(`no. ${r.issue}`);
    if (pages(r)) parts.push(`${r.lastPage ? "pp." : "p."} ${pages(r)}`);
  }
  if (r.year) parts.push(r.year);
  if (r.doi) parts.push(`doi: ${r.doi}`);
  let text = parts.join(", ").replace(",”,", ",”");
  if (!r.doi && r.url) text += `. [Online]. Available: ${r.url}`;
  return `[${n}] ${authors ? `${authors}, ` : ""}${endPunct(text)}`;
}

const bibEscape = (s) => String(s).replace(/([&%$#_])/g, "\\$1");
const BIB_TYPE = { article: "article", book: "book", chapter: "incollection", thesis: "phdthesis", preprint: "misc", dataset: "misc", report: "techreport" };
const STOPWORDS = new Set(["a", "an", "the", "on", "of", "in", "for", "and", "to", "with", "from", "at", "by"]);

function bibtexKey(r) {
  const first = r.authors[0];
  const name = first?.literal ? first.literal.split(" ")[0] : (first?.family.split(" ").at(-1) ?? "");
  const ascii = (s) => s.normalize("NFKD").replace(/[^\w]/g, "").toLowerCase();
  const word = r.title.split(/\s+/).map(ascii).find((w) => w && !STOPWORDS.has(w)) ?? "";
  return `${ascii(name) || "anon"}${r.year ?? ""}${word}`;
}

function bibtex(r, key) {
  const type = BIB_TYPE[r.kind] ?? "misc";
  const fields = [["author", r.authors.map((a) => (a.literal ? `{${a.literal}}` : `${a.family}${a.suffix ? `, ${a.suffix}` : ""}${a.given ? `, ${a.given}` : ""}`)).join(" and ")], ["title", `{${r.title}}`]];
  if (type === "article") fields.push(["journal", r.container]);
  if (type === "incollection") fields.push(["booktitle", r.container]);
  if (type === "misc" && r.container) fields.push(["howpublished", r.container]);
  if (type === "phdthesis") fields.push(["school", r.publisher ?? r.container]);
  if (type === "techreport") fields.push(["institution", r.publisher ?? r.container]);
  if (["book", "incollection"].includes(type)) fields.push(["publisher", r.publisher]);
  fields.push(["year", r.year], ["volume", r.volume], ["number", r.issue], ["pages", r.firstPage && (r.lastPage ? `${r.firstPage}--${r.lastPage}` : r.firstPage)], ["doi", r.doi], ["url", link(r)]);
  const body = fields.filter(([, v]) => v).map(([k, v]) => `  ${k} = {${k === "url" || k === "doi" ? v : bibEscape(v)}}`);
  return `@${type}{${key},\n${body.join(",\n")}\n}`;
}

/** Formats a list of OpenAlex works in one style. Returns a Markdown string. */
export function formatCitations(works, style) {
  const records = works.map(citationRecord);
  if (style === "bibtex") {
    const used = new Map();
    const entries = records.map((r) => {
      const base = bibtexKey(r);
      const n = used.get(base) ?? 0;
      used.set(base, n + 1);
      return bibtex(r, n ? `${base}${String.fromCharCode(97 + n)}` : base);
    });
    return `\`\`\`bibtex\n${entries.join("\n\n")}\n\`\`\``;
  }
  if (style === "ieee") return records.map((r, i) => ieee(r, i + 1)).join("\n\n");
  const format = { apa, mla, chicago, harvard }[style];
  // Author-date styles are alphabetised by first author.
  const sortKey = (r) => (r.authors[0]?.family ?? r.authors[0]?.literal ?? r.title).toLowerCase();
  return records
    .map((r) => ({ r, key: sortKey(r) }))
    .sort((x, y) => x.key.localeCompare(y.key) || String(x.r.year).localeCompare(String(y.r.year)))
    .map(({ r }) => format(r))
    .join("\n\n");
}
