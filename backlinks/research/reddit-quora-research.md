# Reddit and Quora research (5 Oct 2026)

## Reddit: what was collected

- Scraped with Apify (`fatihtahta/reddit-scraper-search-fast`) for the searches "hand embroidered t shirt" and "embroidered sweatshirt worth it". Eight more searches were queued but the Apify free monthly allowance ran out mid-run, so only these two finished.
- 40 posts and 684 comments came back. After dropping off-topic threads (fashion rep hauls, a marriage thread, a horror story subreddit), **21 threads and 395 comments** were about embroidered tees and sweatshirts. Those 21 threads had **19,656 upvotes** between them (median 316).
- Comments were coded by keyword. Results, with a comment allowed to fall in more than one theme:

| Theme | Comments | Share |
|---|---|---|
| Praise for the work | 151 | 38.2% |
| Time and effort | 21 | 5.3% |
| Wants to buy one or asks for a shop | 21 | 5.3% |
| Asks how it was made | 16 | 4.1% |
| Price and value | 13 | 3.3% |
| Washing and wear | 8 | 2.0% |
| Hand vs machine | 7 | 1.8% |

Raw counts: `reddit_themes.json`. Infographic: `../infographics/reddit-comments.png`.

## What it tells us

1. **Hand-embroidered tees get attention on Reddit.** A pink tee with a hand-stitched Clippy got 4,592 upvotes in r/Embroidery. A tee with a hand-embroidered Hertzsprung-Russell diagram that students gave their physics teacher got 3,498 in r/Physics.
2. **Two of the most upvoted posts were gifts.** The physics teacher's tee and a Bob's Burgers tee one Redditor stitched for their husband. The top comments on the physics tee were about how thoughtful the gift was. This supports leading every gift-guide pitch with personalisation, not with "handmade".
3. **People ask to buy.** "You should sell those for real" (43 upvotes), "Please take my money", "So when is your etsy store opening?" Readers who see the work want a place to order it. That is the gap Vee Threads fills.
4. **Makers publish their hours.** 25 hours for the front of one tee and 50 for both sides; "the whole month of May" and 150 metres of floss for another; 19 days of 2 to 4 hour sessions. Buyers rarely see these numbers, which is why the hours chart is a strong link magnet.
5. **Washing is the hidden worry.** A would-be stitcher in r/sashiko: "Something I stitched i would want to wear often and show off, but something i have to hand wash I'd avoid wearing, so I'm conflicted." In r/radiohead: "As the shirt shrinks or stretches, I have to imagine that the embroidered portions will remain the same size and cause weird wrinkles/bunching." The care guide infographic answers both.
6. **Stabiliser is the top technical tip.** In r/Embroidery: "def use a stabiliser, tshirts stretch like crazy and you'll end up with wavy lines."

## Quotes you can use (verbatim, with links)

Quote with the subreddit name and link, never the username, and never edit the wording.

- "During the last month and a half I was working on this Kill Bill movie graphic t-shirt ... there are 11 different patterns in total on both sides, patiently applied using more than 100 meters of thread." r/Embroidery: https://www.reddit.com/r/Embroidery/comments/1rmfjzt/
- "This is THE COOLEST. 100 meters of thread! How do you still have fingers?!" r/Embroidery, same thread
- "After 25 hours of work, the front of the t-shirt with Dennis Rodman ( NBA legend ) graphics is completed" r/streetwearstartup: https://www.reddit.com/r/streetwearstartup/comments/1mlv1zn/
- "Today, after totally 50 hours of work, I'm happy to share the finished project, both sides" r/Embroidery: https://www.reddit.com/r/Embroidery/comments/1o93voo/
- "Been working on this Public Enemy t-shirt the whole month of May ... 150 meters of floss went into this one" r/DIYclothes: https://www.reddit.com/r/DIYclothes/comments/1tyjd0e/
- "Finished it during one month, 2-4 hours sessions, but not everyday, the total was ~19days" r/DIYclothes, same thread
- "The knots are not bothering at all. I've tried to machine wash a t-shirt of mine, with a hand stitched pattern and it's better to do it by hand." r/sashiko: https://www.reddit.com/r/sashiko/comments/1llwzaj/
- "def use a stabiliser, tshirts stretch like crazy and you'll end up with wavy lines" r/Embroidery: https://www.reddit.com/r/Embroidery/comments/1wg3f57/
- "You should sell those for real." and "Love this design. You should absolutely sell these. I would be a customer!" r/BobsBurgers: https://www.reddit.com/r/BobsBurgers/comments/liaeb8/
- "... kudos to the students for such a thoughtful gift!" r/Physics: https://www.reddit.com/r/Physics/comments/1l432bs/
- A designer in r/SustainableFashion, asking followers to pick between hand and machine embroidery, warned that hand embroidery "is quite a bit more expensive to produce". https://www.reddit.com/r/SustainableFashion/comments/1km5g7g/

## Quora: questions worth answering

These came up for buyer-intent searches. Drafted answers are in `../content/quora-answers.md`. Quora links are nofollow, so the value is referral traffic and brand searches, not link equity.

| Question | Why it matters |
|---|---|
| https://www.quora.com/Why-is-hand-embroidery-the-most-expensive | Price objection, the most common one |
| https://www.quora.com/What-makes-machine-made-embroidery-so-much-cheaper-than-hand-embroidery-and-is-it-worth-the-price-difference | Same objection, comparison angle |
| https://www.quora.com/How-can-I-identify-an-authentic-hand-embroidered-shirt | Direct match for the hand vs machine infographic |
| https://www.quora.com/What-is-the-difference-between-hand-embroidery-and-machine-embroidery | High-traffic evergreen question |
| https://www.quora.com/How-can-you-tell-if-an-embroidered-blouse-on-a-sari-is-hand-embroidered-or-machine-made | Indian audience, same infographic |
| https://www.quora.com/Does-embroidery-on-shirts-become-undone-in-the-wash | Care worry |
| https://www.quora.com/How-can-an-embroidered-cloth-be-washed-and-dried-without-damaging-the-stitches | Care worry |
| https://www.quora.com/Where-can-I-get-custom-embroidered-T-shirts | Buying intent |
| https://www.quora.com/What-are-some-good-Indian-websites-to-make-custom-t-shirts-hoodies-sweatshirts-single-order-and-not-bulk-order | Buying intent, India, single orders |
| https://www.quora.com/How-do-I-find-personalized-gifts-online-in-India | Gifting intent |
| https://www.quora.com/Can-you-hand-embroidery-without-a-stabilizer | Hobbyist question, good for the Thread Color Finder mention |
