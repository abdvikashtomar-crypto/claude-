# Competitor backlink research (5 Oct 2026)

## How this was done

Ahrefs and Semrush were connected but unusable (Ahrefs: "Insufficient plan", Semrush: no API units), so the research used:

1. **Apify backlink checker** (`s-r/backlinks-checker`) on veethreads.com and four niche competitors. The free tier returns only the first 10 links per domain plus the totals, so it shows the shape of each profile, not the full list.
2. **Mention mining**: web searches for pages that name competitor brands (Okhai, Label Bombae, Hoopables, Haus of Handmade, Gaatha and others) and for the listicles, gift guides, directories and roundups that link to brands like Vee Threads.
3. **Apify website crawler** on 10 of those pages to pull out outbound links, contact emails and "list your brand" forms. The crawl stopped when the Apify free monthly allowance ran out, so the other prospects were checked through search results only.

## What your own profile looks like

| Metric (Apify index) | veethreads.com |
|---|---|
| Domain score | 17 |
| Referring domains | 20 |
| Backlinks counted | ~1,000 |

The first links returned were all auto-generated SEO spam pages, for example `seorankingschecker.shop/dir/authority-building-links-224441` and `trendyhealthtimes.com/all/831/14.html`, with anchors like "veethreads.com premium seo links for higher search engine rankings" and "high quality dofollow backlinks da 50 pa 40 premium pbn network service".

What this means:

- Your real, editorial link count is close to zero. Almost every competitor below has the same junk pointing at them (it is scraper spam that targets every Shopify store), so it is not something you did.
- Google says it ignores this kind of link in most cases. **Do not buy "DA 50 PBN" packages** from anyone who emails you; that is exactly what these pages advertise.
- You only need a disavow file if Search Console ever shows a manual action. Until then, leave it.

## Competitor profiles

| Brand | Site | Referring domains | Backlinks | Where their links come from (link sample plus search) |
|---|---|---|---|---|
| Okhai (Tata Trusts) | okhai.org | 427 | 739 | Web agency portfolio links (binaryic.com, 10 pages) plus press (Fibre2Fashion, LBB, IIAD, Tracxn, Discovering Brands) |
| Hoopables | hoopables.in | 76 | 113 | Buy Me a Coffee profile, Etsy shop, YouTube, Kala Curry marketplace, Threads profile |
| Label Bombae | labelbombae.com | 66 | 81 | Mostly the same SEO spam pages as yours; real links come from Instagram and press about "India's first pet embroidery brand" |
| Haus of Handmade | hausofhandmade.com | 14 | 117 | Spam pages plus one real editorial link: joinelara.com "Diwali 2026 outfit ideas" |
| Vee Threads | veethreads.com | 20 | ~1,000 | Spam only in the sample |

## Where real links in this niche come from

Grouping everything the scrape and searches turned up, the links that competitors actually earned fall into seven buckets. Each bucket maps to a row type in `../prospects.csv`.

1. **Brand roundups and listicles on Indian media**: LBB ("29 Homegrown Clothing Brands", "Love Okhai? Here's a list of brands"), Homegrown (the Diwali gifting guide links out to about 200 brand sites), Elle India ("5 Indian embroidery artists to follow"), Her Circle, IIAD, YourStory SMBStory.
2. **Brand directories**: Discovering Brands ("List Brand" form), LeBrands.Space (links to 166 brand sites, contact hello@lebrands.space), Prakati Green Directory (free listing, prakati.com/d/brand-name), Tracxn company profiles.
3. **Small blogs that write "best X brands" posts**: joinelara.com, the-shooting-star.com, thesustainablebrandsjournal.com, consciousfashion.co, lilpuj.substack.com, realshepower.in, sepiastories.in. These often add brands when asked politely and given a good reason.
4. **Marketplaces and maker platforms with a brand page**: Kala Curry, Etsy, Buy Me a Coffee, Gaatha, iTokri, Brown Living.
5. **Embroidery and craft blogs** that write gift guides and tool roundups: crewelghoul.com, sewwhatalicia.com, adventuresofadiymom.com, pumora.com, thestitcherycorner.com ("Best apps for cross stitchers in 2026"), needlic.com ("Free embroidery software 2026"), hooptalent.com and maggieframes.com (floss conversion resources), Domestika's "free tools" post. Your Thread Color Finder extension fits these better than any product page does.
6. **Press and journalist requests**: Qwoted, Featured, SourceBottle. Founders with an artisan story get quoted in fashion, gifting and women in business pieces.
7. **Brand-owned listicles from competitors** (nilamind.com, charkhatales.com, hausofhandmade.com, upcycleluxe.com): these mostly do not link out. Skip them.

## Unlinked mentions to fix

Search turned up your own profiles but no third-party articles naming Vee Threads yet. Make sure these all carry a link to veethreads.com in the website field:

- pinterest.com/veethreads (profile website field)
- threads.com/@vee.threads (bio link)
- instagram.com/vee.threads (bio link)
- facebook.com/profile.php?id=61563197999030 (About, website)

## Competitors worth watching

- **firstresort.in** already published "India's Handcraft & Embroidery Economy 2026", a statistics page. Our linkable asset (`../content/01-linkable-asset-hand-embroidery-numbers.md`) is built to be more useful than that page: original Reddit data, real hours per piece, and free infographics with embed code.
- **Free DMC colour tools** competing with Thread Color Finder: artpatt.com, xstitchify.com, stitchland.com, stitcherssuite.com, getstitchies.com, simonebalman.com. The pages that list them are the same pages you should pitch.
