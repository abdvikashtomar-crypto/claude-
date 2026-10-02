# Etsy listing pack: 7 Shopify products for Veethreads1

Etsy-optimized drafts for the six oversized tees and the Amaltas cap, built from keyword research on 499 live Etsy listings.

| File | What it is |
|---|---|
| [`LISTINGS.md`](LISTINGS.md) | Copy-paste sheets: title, price, category, variations, attributes, 13 tags, materials, photos and description for each listing |
| [`listings.json`](listings.json) | The same data in machine-readable form; the source for `LISTINGS.md` |
| [`RESEARCH.md`](RESEARCH.md) | The keyword research behind every choice, plus fixes for the rest of the shop |
| [`research/competitor_listings.csv`](research/competitor_listings.csv) | Raw data: 500 competitor listings with all tags, prices, views and favorites |
| [`build.py`](build.py) | Checks Etsy's limits (140-character titles, 13 tags of up to 20 characters) and regenerates `LISTINGS.md` |

## Create the drafts

**With Claude in Chrome**: sign in to Etsy in Chrome on your computer, open the Claude in Chrome side panel (or a Claude Desktop session that has Chrome connected), and paste:

```text
Create draft listings in my Etsy shop (Veethreads1). Do not publish anything.

1. Open https://raw.githubusercontent.com/abdvikashtomar-crypto/claude-/refs/heads/claude/etsy-shopify-product-listings-ufwdqk/etsy/listings.json and read it.
2. For each item in "listings", go to Etsy Shop Manager > Listings > Add a listing and fill in:
   - Photos: the URLs in "photos", in that order ("size_chart" means defaults.size_chart_photo). If you can't upload them, leave the photos for me.
   - Title, price_usd, and the category (defaults.tee_category or defaults.cap_category)
   - About: I did / A finished product / Made to order
   - The "variations", same price for every option, quantity 10 each
   - Description: the "description" lines joined with line breaks
   - The 13 "tags", the "materials" and the "attributes"
   - My existing shipping profile and return policy
3. Click "Save as draft", never "Publish".
4. Ask me before creating "neelbel": it may duplicate my Azure Bloom listing.
When you finish, list the drafts you created.
```

**By hand**: in Shop Manager, go to Listings, then Add a listing, and copy each field from `LISTINGS.md`. Use **Save as draft** at the bottom of the form.

## Edit and re-check

Change `listings.json`, then run:

```sh
python3 etsy/build.py
```

It reports anything Etsy would reject and rewrites `LISTINGS.md`.
