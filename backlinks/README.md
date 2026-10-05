# Backlink plan for veethreads.com

Research, content and outreach material to earn real backlinks for Vee Threads. Everything here was built on 5 October 2026 from scraped competitor data, Reddit and Quora research, and verified public statistics.

## The situation in one paragraph

veethreads.com has about 20 referring domains, and the ones the backlink index showed first are auto-generated SEO spam pages (the kind that target every Shopify store). You have almost no editorial links yet. Your competitors are not far ahead: Okhai has around 427 referring domains from press, directories and an agency portfolio; Hoopables and Label Bombae have 66 to 76, mostly profiles and marketplaces. The gap is closable in a few months with steady, honest outreach. Full findings: [`research/competitor-backlinks.md`](research/competitor-backlinks.md).

## What is in this folder

| Path | What it is |
|---|---|
| [`prospects.csv`](prospects.csv) | 48 link targets with priority, URL, why, action, contact and template number. Open in Google Sheets and work top to bottom |
| [`signup-kit.md`](signup-kit.md) | Copy-paste business details and descriptions, plus 18 profiles and directories to create with abdvikashtomar@gmail.com |
| [`content/01-linkable-asset-hand-embroidery-numbers.md`](content/01-linkable-asset-hand-embroidery-numbers.md) | **Publish this first.** A data page for your Journal with six infographics and embed codes. Every outreach email points here |
| [`content/02-guest-post-hand-vs-machine.md`](content/02-guest-post-hand-vs-machine.md) | Guest post for fashion and lifestyle blogs |
| [`content/03-guest-post-reddit-lessons.md`](content/03-guest-post-reddit-lessons.md) | Guest post for embroidery and craft blogs, built on the Reddit research |
| [`content/04-guest-post-artisan-made-questions.md`](content/04-guest-post-artisan-made-questions.md) | Guest post for Indian lifestyle and conscious fashion sites. Has `[FILL: ...]` gaps only you can answer |
| [`content/quora-answers.md`](content/quora-answers.md) | Nine ready answers to real Quora questions, with disclosure lines |
| [`content/reddit-playbook.md`](content/reddit-playbook.md) | How to use Reddit without getting banned, and four post ideas |
| [`outreach/email-templates.md`](outreach/email-templates.md) | Eight email templates matched to the `template` column in the CSV |
| [`outreach/gift-guide-pitch-pack.md`](outreach/gift-guide-pitch-pack.md) | Paste-ready product blurbs for Diwali and other gift guides |
| [`infographics/`](infographics/) | Six PNG infographics (2400 px wide) and their HTML sources |
| [`research/`](research/) | Competitor findings, every statistic with its source, Reddit and Quora research, raw theme counts |
| [`scripts/render-infographics.mjs`](scripts/render-infographics.mjs) | Re-renders the PNGs after you edit any `infographics/src/*.html` file |

## The infographics

| File | Shows | Best for |
|---|---|---|
| `women-artisans.png` | 64 of every 100 Indian handloom and handicraft artisans are women (PIB, Dec 2025) | Indian lifestyle, women in business, sustainability pitches |
| `embroidery-exports.png` | Rs 4,350 crore of embroidered and crocheted exports in 2024-25, up 9.12% (EPCH) | Business and craft economy pieces |
| `hours-per-piece.png` | 5 minutes by machine vs 24 to 50 hours by hand | Any "why does handmade cost more" piece |
| `hand-vs-machine.png` | Illustrated inside view of hand vs machine embroidery, five checks | Fashion blogs, Quora, Pinterest |
| `care-guide.png` | Six rules for washing hand embroidery | Care and laundry content, your own product pages |
| `reddit-comments.png` | What 395 Reddit comments on embroidered tees talked about | Craft blogs, marketing blogs |

To edit wording or numbers: change the HTML file in `infographics/src/`, then from the repo root run `npm install` once and `node backlinks/scripts/render-infographics.mjs`.

## Week-by-week plan

**Week 1 (by 12 October): set up and hit the Diwali window**
1. Review and publish the draft already in Shopify: Online Store > Blog posts > "Hand Embroidery in India, by the Numbers (2026)" (URL `/blogs/news/hand-embroidery-india-numbers`). The six infographics are already in Shopify Files.
2. Add `care-guide.png` to the description of every tee and sweatshirt product. It answers the washing worry and gets pinned.
3. Pin all six infographics to Pinterest, each linking to the data page.
4. Do the eight week 1 signups in `signup-kit.md` and fix the website field on Instagram, Threads, Facebook and Pinterest.
5. Send the Diwali pitches (CSV priority 1, template 2) to Homegrown, LeBrands.Space, Local Samosa and All About Eve. Diwali is 8 November; guides close in mid to late October.

**Week 2: directories and press platforms**
1. Finish the week 2 signups (Justdial, IndiaMART, Trustpilot, Tracxn, Qwoted, Featured, SourceBottle).
2. On Qwoted and Featured, answer three relevant journalist questions.
3. Post the first two Quora answers.
4. Send listicle requests (template 1) to five priority 2 sites.

**Week 3: guest posts**
1. Take real photos for `content/02` (the inside of a hand-embroidered tee) and send three guest post pitches (template 3).
2. Fill the `[FILL: ...]` gaps in `content/04` and pitch it to two Indian publications.
3. Post the "inside out" comparison on r/Embroidery (see the Reddit playbook).

**Week 4: the Chrome extension**
1. Once Thread Color Finder is live on the Chrome Web Store, create `/pages/thread-color-finder` (copy is in the main repo README).
2. Send template 5 to the eight tool-roundup sites in the CSV and pitch `content/03` to Crewel Ghoul.
3. Launch on Product Hunt and list it on AlternativeTo.

**Every week after that**
- 10 personalised outreach emails, one follow-up each.
- 2 Quora answers, 3 journalist responses.
- Update `status` in the CSV. Expect a reply rate of roughly one in ten and plan for it.

## Rules that protect the site

- **Do not buy links**, "guest post packages" or "DA 50 PBN" services. The spam already pointing at you is exactly that industry. Paid links risk a Google penalty.
- **No link exchanges at scale** ("I'll link to you if you link to me"). One or two genuine ones are fine.
- **Never publish a number you cannot source.** Editors check, and one wrong figure gets your email ignored next time. All sources are in `research/sources-and-stats.md`.
- **Do not post the personal Gmail on public pages.** It is used for signups only. The articles use a `[STUDIO EMAIL]` placeholder; a hello@veethreads.com address forwarding to Gmail is better for public use.

## Before you publish anything, fill these placeholders

| Placeholder | Where |
|---|---|
| `[STUDIO EMAIL]`, `[PHONE]`, `[YOUR NAME]` | articles, templates, signup kit, pitch pack |
| `[FILL: ...]` | `content/04` (artisan pay model, how regular work is, which traditions they trained in) and template 6 |
| `[CHECK PRICE]`, cut-off dates | `outreach/gift-guide-pitch-pack.md` |
| Real studio photos | `content/02` photo slot |

## Limits of this research

- Ahrefs and Semrush were connected but returned "insufficient plan" and "no API units", so competitor link lists come from a cheaper Apify index (first 10 links per domain plus totals) and from search-based mention mining, not a full export.
- The Apify free monthly allowance ran out during the run. The Reddit scrape finished 2 of its 10 searches and the page crawler finished 10 of 28 pages. If you top up Apify (about US$5), the same actors can be re-run to extend both.
- Reddit themes were coded by keyword, not by reading each comment by hand. Treat the percentages as a good indication, not a survey.
