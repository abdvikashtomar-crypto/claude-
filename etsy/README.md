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

**With Claude in Chrome**, from a Claude session on your own computer (the Claude Desktop app, or `claude remote-control` in a terminal), paste:

> Read `etsy/listings.json` from branch `claude/etsy-shopify-product-listings-ufwdqk` of `abdvikashtomar-crypto/claude-`. Using Claude in Chrome, open my Etsy shop manager (Veethreads1) and create each listing as a draft. For each one: upload the photos in order (`size_chart` means `defaults.size_chart_photo`; the photos are public Shopify links, so download them first if direct upload is awkward), then fill in the title, category, About (I did / A finished product / Made to order), price, variations (same price for every option, quantity 10 each), description (one line per array item), the 13 tags, materials and attributes, and choose my existing shipping and return policies. Click **Save as draft**, never Publish. Ask me before creating Neelbel, which may duplicate my Azure Bloom listing.

**By hand**: in Shop Manager, go to Listings, then Add a listing, and copy each field from `LISTINGS.md`. Use **Save as draft** at the bottom of the form.

## Edit and re-check

Change `listings.json`, then run:

```sh
python3 etsy/build.py
```

It reports anything Etsy would reject and rewrites `LISTINGS.md`.
