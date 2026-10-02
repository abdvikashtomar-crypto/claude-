"""Validate listings.json against Etsy's listing limits and render LISTINGS.md.

Usage: python3 etsy/build.py
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent

TITLE_MAX = 140
TAG_COUNT = 13
TAG_MAX = 20
MATERIAL_MAX = 45
MATERIAL_COUNT_MAX = 13
PHOTO_MAX = 20
# Etsy accepts letters, numbers, whitespace, -, ', ™, © and ® in tags; materials allow no punctuation.
TAG_CHARS = re.compile(r"^[A-Za-z0-9 \-'™©®]+$")
MATERIAL_CHARS = re.compile(r"^[A-Za-z0-9 ]+$")


def validate(listing):
    errors, warnings = [], []
    title = listing["title"]
    if len(title) > TITLE_MAX:
        errors.append(f"title is {len(title)} chars (max {TITLE_MAX})")
    for ch in "%:&":
        if title.count(ch) > 1:
            errors.append(f"title uses '{ch}' more than once")
    if sum(1 for w in title.split() if len(w) > 1 and w.isupper()) > 3:
        errors.append("title has more than 3 all-caps words")

    tags = listing["tags"]
    if len(tags) != TAG_COUNT:
        errors.append(f"{len(tags)} tags (use all {TAG_COUNT})")
    if len({t.lower() for t in tags}) != len(tags):
        errors.append("duplicate tags")
    for tag in tags:
        if len(tag) > TAG_MAX:
            errors.append(f"tag '{tag}' is {len(tag)} chars (max {TAG_MAX})")
        if not TAG_CHARS.match(tag):
            errors.append(f"tag '{tag}' has characters Etsy rejects")

    materials = listing["materials"]
    if len(materials) > MATERIAL_COUNT_MAX:
        errors.append(f"{len(materials)} materials (max {MATERIAL_COUNT_MAX})")
    for material in materials:
        if len(material) > MATERIAL_MAX or not MATERIAL_CHARS.match(material):
            errors.append(f"material '{material}' is too long or has punctuation")

    if listing["price_usd"] <= 0:
        errors.append("price must be positive")
    if not "".join(listing["description"]).strip():
        errors.append("empty description")
    if len(listing["photos"]) > PHOTO_MAX:
        errors.append(f"{len(listing['photos'])} photos (max {PHOTO_MAX})")
    if not listing["photos"]:
        warnings.append("no photos: add at least one before publishing")
    return errors, warnings


def photo_url(photo, defaults):
    return defaults["size_chart_photo"] if photo == "size_chart" else photo


def render(data):
    defaults = data["defaults"]
    out = [
        f"# Etsy listings for {data['shop']}",
        "",
        f"Generated from `listings.json` by `build.py`. Researched {data['researched_on']}. "
        f"Prices in {data['currency']}. Create every listing as a **draft**.",
        "",
        "Settings shared by every listing:",
        "",
        f"- About: {defaults['who_made']} / {defaults['what_is_it']} / {defaults['when_made']}",
        f"- Type: {defaults['type']}; renewal: {defaults['renewal']}; personalization: {defaults['personalization']}",
        f"- Quantity: {defaults['quantity_per_variant']} per variant",
        f"- Shipping: {defaults['shipping_profile']}",
        f"- Returns: {defaults['return_policy']}",
        "",
    ]
    for n, listing in enumerate(data["listings"], 1):
        category = defaults[f"{listing['category']}_category"]
        out += [
            f"## {n}. {listing['shopify_title']}",
            "",
            f"Shopify: `{listing['shopify_id']}`",
            "",
            f"**Title** ({len(listing['title'])}/{TITLE_MAX} chars)",
            "",
            "```text",
            listing["title"],
            "```",
            "",
            f"**Price:** ${listing['price_usd']}  ",
            f"**Category:** {category}",
            "",
        ]
        if listing["variations"]:
            out.append("**Variations** (same price for every option):")
            out.append("")
            for name, options in listing["variations"].items():
                out.append(f"- {name}: {', '.join(options)}")
            out.append("")
        out.append("**Attributes:**")
        out.append("")
        for name, value in listing["attributes"].items():
            out.append(f"- {name}: {value}")
        out += [
            "",
            "**Tags** (13):",
            "",
            "```text",
            ", ".join(listing["tags"]),
            "```",
            "",
            f"**Materials:** {', '.join(listing['materials'])}",
            "",
            "**Photos** (upload in this order; the first is the search thumbnail):",
            "",
        ]
        if listing["photos"]:
            for i, photo in enumerate(listing["photos"], 1):
                label = "size chart" if photo == "size_chart" else f"photo {i}"
                out.append(f"{i}. [{label}]({photo_url(photo, defaults)})")
        else:
            out.append("None in Shopify yet.")
        out += [
            "",
            "**Description:**",
            "",
            "```text",
            *listing["description"],
            "```",
            "",
        ]
        if listing["notes"]:
            out.append("**Notes:**")
            out.append("")
            out += [f"- {note}" for note in listing["notes"]]
            out.append("")
    return "\n".join(out)


def main():
    data = json.loads((HERE / "listings.json").read_text())
    failed = False
    for listing in data["listings"]:
        errors, warnings = validate(listing)
        for message in errors:
            print(f"ERROR {listing['key']}: {message}")
        for message in warnings:
            print(f"WARN  {listing['key']}: {message}")
        failed = failed or bool(errors)
    if failed:
        sys.exit(1)
    (HERE / "LISTINGS.md").write_text(render(data))
    print(f"OK: {len(data['listings'])} listings valid, wrote LISTINGS.md")


if __name__ == "__main__":
    main()
