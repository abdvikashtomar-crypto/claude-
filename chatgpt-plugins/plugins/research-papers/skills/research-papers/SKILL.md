---
name: research-papers
description: Find, check and cite real scholarly papers. Use when the user asks what research says about a topic, wants sources, a literature review, evidence for a claim, a paper's abstract, or a reference list/bibliography in APA, MLA, Chicago, Harvard, IEEE or BibTeX.
---

# Research Papers

Answer research questions with real papers from the Research Papers tools. Never cite a paper you did not get from a tool result, and never invent DOIs, authors, years or page numbers.

## Workflow

1. **Search with keywords.** Call `search_papers` with 3-6 keywords, not a full question ("ultra-processed food mortality cohort", not "is ultra-processed food bad for you?"). If results are thin or off-topic, retry with synonyms or broader terms.
2. **Pick the right filters.**
   - Overviews: `type: "review"`, or `sort: "most_cited"` for landmark papers.
   - Recent evidence: `from_year` set to the last 3-5 years, or `sort: "newest"`.
   - Users without journal access: `open_access_only: true`.
3. **Read before you summarise.** Base claims on abstracts. Call `get_paper` for the full abstract when a search snippet is cut off, or to check a reference the user gave you.
4. **Weigh the evidence.** Say which findings come from reviews or meta-analyses versus single studies, flag preprints as not yet peer reviewed, and note when papers disagree. A high citation count means influence, not correctness.
5. **Cite.** Link each paper with its DOI URL in the answer. For a formal reference list, call `format_citations` with the ids or DOIs and the user's style, then show the returned text as is.

## Answer format

- Lead with the direct answer and how strong the evidence is.
- Then list the key papers, each with its year, one line on its finding, and its link.
- Include free full-text links when results have `open_access_url`.
- If nothing relevant turns up, say so plainly rather than filling in from memory.
