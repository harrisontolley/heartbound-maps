// Data for the "Pinprint vs [Competitor]" comparison pages. One Competitor entry
// per page; the route, table and layout render straight from these.
//
// TRUTHFULNESS RULES (see plan):
//  - Every competitor claim is sourced from their live site as of `lastReviewed`.
//    Where a figure could not be verified (e.g. prices locked in a JS editor) the
//    copy stays qualitative rather than inventing a number.
//  - Pinprint's own prices come from PINPRINT_FACTS (derived from the canonical
//    commerce catalogue) so they can't drift — never hardcode them here.
//  - Pinprint ships US-only (do NOT claim "40+ countries"), and we do NOT assert a
//    specific number of styles (the engine ships more than the landing advertises);
//    say "multiple styles" instead.
//  - Honest but favorable: concede genuine competitor strengths in whoFits.competitor
//    and the shipping/pricing sections; win on real differentiators.

import type { Competitor } from "./types";
import { PINPRINT_FACTS } from "./pinprintFacts";

const PP = PINPRINT_FACTS;

export const COMPETITORS: readonly Competitor[] = [
  // ── Mapiful ────────────────────────────────────────────────────────────────
  {
    slug: "pinprint-vs-mapiful",
    key: "mapiful",
    name: "Mapiful",
    oneLiner:
      "Sweden's minimalist custom map-poster shop — one beautifully styled city or street.",
    homepage: "https://www.mapiful.com",
    lastReviewed: "2026-06-30",
    hero: {
      h1: "Pinprint vs Mapiful: which custom map print is right for you?",
      subhead:
        "Both turn a place into wall art, but they answer different briefs. Mapiful styles one location with Scandinavian polish; Pinprint maps every place that matters at once, each drawn in its true compass direction from home. Here's the honest head-to-head.",
    },
    tldr: [
      "Mapiful makes a gorgeous poster of one place. Pinprint maps many places on a single print, with a real bearing and distance from home to each — a more personal story for a gift.",
      "Pinprint includes the digital files with every print and sells a standalone download; Mapiful is print-and-ship only, with no digital option.",
      "Loose Pinprint prints are on Hahnemühle German Etching 310gsm — a textured fine-art paper; Mapiful's posters are 200gsm matte. Pinprint's is the heavier, more premium fine-art stock.",
      "Mapiful ships worldwide; Pinprint currently ships within the US only. If you're outside the US, that may settle it.",
    ],
    atAGlance: [
      {
        attribute: "What it puts on the wall",
        pinprint:
          "Every place that matters on one map — born, lived, visited, family — measured from home",
        competitor: "One location: a single city, street, or address",
        advantage: "pinprint",
      },
      {
        attribute: "Bearings & distances",
        pinprint: "A true compass bearing and great-circle distance to each place",
        competitor: "No measurements — a styled map of one place",
        advantage: "pinprint",
      },
      {
        attribute: "Number of places",
        pinprint: "As many as you like; labels never overlap",
        competitor: "One per poster",
        advantage: "pinprint",
      },
      {
        attribute: "Paper (loose print)",
        pinprint: "Hahnemühle German Etching 310gsm, archival pigment inks",
        competitor: "200gsm matte, FSC-certified, “museum-grade”",
        advantage: "pinprint",
      },
      {
        attribute: "Sizes",
        pinprint: PP.sizeRange,
        competitor: "11×17, 18×24, 24×36 in",
      },
      {
        attribute: "Print price",
        pinprint: `${PP.priceRange} (digital files included)`,
        competitor: "$44.99–$79.99 list (often ~25% off; frames extra)",
      },
      {
        attribute: "Framing",
        pinprint: "Ready-to-hang wood frame, wired, +$50–$100",
        competitor: "Frames sold separately (~$49.99+); odd sizes add a surcharge",
        advantage: "pinprint",
      },
      {
        attribute: "Digital download",
        pinprint: `Included with every print; standalone ${PP.digitalPrice}`,
        competitor: "Not offered — every order is printed and shipped",
        advantage: "pinprint",
      },
      {
        attribute: "Shipping",
        pinprint: "Free standard shipping (US only)",
        competitor: "Worldwide; free over ~$59 (promo-dependent)",
        advantage: "competitor",
      },
    ],
    deepDive: [
      {
        id: "concept",
        heading: "A single location vs. the whole story",
        body: [
          "Mapiful is a single-location product. You search for one place — a city, a street, your hometown — set the zoom and labels, and it renders a clean, Scandinavian-style map of that spot. It does that one job beautifully.",
          "Pinprint starts from a different idea: the places that made you rarely sit in one city. You set where home is, then add everywhere else — where you were born, the towns you've lived in, the country your family is from, the trips that stuck. Pinprint draws an arrow to each one in its true compass direction, with the real distance beside it, all on a single print.",
          "So the two aren't really substitutes. If you want one city on the wall, Mapiful is excellent. If you want one frame that holds a whole life of places — and the directions and distances between them — that's what Pinprint is built for.",
        ],
        takeaway:
          "Pinprint's edge: it's the only one of the two that maps multiple places at once, measured from home.",
      },
      {
        id: "quality",
        heading: "Paper and print quality",
        body: [
          "Mapiful prints on 200gsm matte paper, FSC-certified, which it describes as “museum-grade.” It's a genuinely nice, weighty matte stock and the print quality is well reviewed.",
          "Pinprint's loose prints are on Hahnemühle German Etching 310gsm — a heavily textured fine-art paper — with archival pigment inks, made to order. Framed prints use 300gsm 100% cotton-rag paper (smooth behind glass) with a premium natural-oak ready-to-hang frame. Because the artwork is drawn as vectors, every size prints razor-sharp.",
          "Both are archival fine-art papers; the honest difference is weight and character. Pinprint's German Etching 310gsm is the heavier, more textured substrate, and it names the paper specifically rather than leaning on \"museum-grade\" language.",
        ],
        takeaway: "Pinprint's edge: Hahnemühle German Etching 310gsm vs. 200gsm matte.",
      },
      {
        id: "styles",
        heading: "Styles and customization",
        body: [
          "Mapiful's editor is polished, with a well-known set of color themes and clean controls for location, text and labels. The Scandinavian aesthetic is consistent and tasteful.",
          "Pinprint offers multiple print styles too — from minimal to vintage cartography to a night-sky look — and the same places re-render instantly in any of them, with home always at the center. Its standout is the layout engine: add as many places as you like and the labels never collide, because the engine nudges each label into clear space while the arrows stay fixed so every bearing stays true.",
          "If your map has one pin, label collisions never come up. The moment you have a dozen places, that layout work is the difference between a crowded mess and something that looks hand-set.",
        ],
        takeaway: "Pinprint's edge: a layout engine built for many places, not one.",
      },
      {
        id: "pricing",
        heading: "Pricing and what's included",
        body: [
          `Pinprint's prints run ${PP.priceRange} across its three sizes (${PP.sizeRange}), with a ready-to-hang frame adding $50–$100. Every print includes the digital files, and a standalone digital download is ${PP.digitalPrice}.`,
          "Mapiful's posters list at $44.99–$79.99 and are frequently shown at around 25% off, so a single unframed poster can dip below Pinprint's entry price. Frames are sold separately (roughly $49.99 and up), and ordering a frame in a non-standard size adds a surcharge. There's no digital option, so every order is a physical print.",
          "Net of it: Mapiful can be cheaper for one unframed poster on sale. Pinprint's price bundles the digital files and a wired, ready-to-hang frame, and the value grows with how many places you put on one print.",
        ],
        takeaway:
          "Pinprint's edge: digital files included and framing that arrives ready to hang.",
      },
      {
        id: "shipping",
        heading: "Shipping and delivery",
        body: [
          "This is the clearest point in Mapiful's favor. Mapiful ships worldwide, with free shipping over about $59 (promo-dependent) and standard delivery in roughly 4–10 business days.",
          "Pinprint currently ships within the United States only, but shipping is always free with no threshold — the price you see is the price you pay. Most orders arrive within 5–10 business days.",
          "If you're ordering from outside the US today, Mapiful is the practical choice. Inside the US, Pinprint's free, no-minimum shipping is the simpler deal.",
        ],
        takeaway:
          "Honest call: Mapiful wins on international reach; Pinprint wins on free US shipping.",
      },
      {
        id: "ease",
        heading: "Designing your print",
        body: [
          "Both let you design and preview before paying, which is the right way to buy something custom. Mapiful's editor is mature and smooth.",
          "Pinprint is free to design with no account required — you only sign in to save your work or export without a watermark, and you only pay when you print. Because the fiddly part (placing and labeling many points) is automated, even a busy map comes together in a few minutes.",
        ],
      },
    ],
    whoFits: {
      pinprint: [
        "You want several meaningful places on one print, not just one city",
        "The bearings and distances from home are the point — the map is a story, not décor",
        "You'd like the digital files included, or a frame that arrives ready to hang",
        "You're ordering within the United States",
      ],
      competitor: [
        "You want a beautifully styled map of a single location",
        "You're shopping from outside the US and need international shipping",
        "You want the lowest price on one unframed poster and don't need digital files",
        "You specifically love Mapiful's Scandinavian house style",
      ],
    },
    verdict:
      "For a single, gorgeously styled city map — especially shipped overseas — Mapiful is a safe, well-reviewed choice. But if the point is the places that made you, and the directions and distances between them, Pinprint is the better buy: it's the only one of the two that maps many locations on a single print, each measured from home, on Hahnemühle German Etching 310gsm fine-art paper, with the digital files included. For a gift that tells a story rather than decorates a wall, start with Pinprint.",
    faq: [
      {
        q: "Can Mapiful map more than one location on a single poster?",
        a: "No. Mapiful's maps are centered on a single location — a city, street or address. If you want several places on one print, with a bearing and distance to each from home, that's what Pinprint does.",
      },
      {
        q: "Is Pinprint cheaper than Mapiful?",
        a: `Mapiful's posters list at $44.99–$79.99 and are often shown around 25% off, so one unframed poster can come in under Pinprint's ${PP.prints[0].price} entry. Pinprint includes the digital files with every print and a ready-to-hang frame for $50–$100, so the better value depends on whether you want framing and digital files.`,
      },
      {
        q: "Does Mapiful offer a digital download?",
        a: `No — every Mapiful order is printed and shipped. Pinprint includes print-ready digital files (PNG + SVG) with every print and sells a standalone download for ${PP.digitalPrice}.`,
      },
      {
        q: "What paper does each one use?",
        a: "Mapiful prints on 200gsm matte, FSC-certified paper. Pinprint's loose prints are on Hahnemühle German Etching 310gsm with archival pigment inks; framed prints use 300gsm 100% cotton-rag paper behind a premium natural-oak ready-to-hang frame.",
      },
      {
        q: "Does Pinprint ship internationally like Mapiful?",
        a: "Not yet — Pinprint currently ships within the United States, with free shipping and no minimum. Mapiful ships worldwide, so for international orders it's currently the better option.",
      },
    ],
    meta: {
      title: "Pinprint vs Mapiful: Custom Map Print Comparison",
      description:
        "Pinprint vs Mapiful: multi-place measured maps vs single-location posters — Hahnemühle German Etching 310gsm vs 200gsm matte. Pricing and shipping compared.",
    },
  },

  // ── Grafomap ───────────────────────────────────────────────────────────────
  {
    slug: "pinprint-vs-grafomap",
    key: "grafomap",
    name: "Grafomap",
    oneLiner:
      "Affordable custom city-map posters (now run through CanvasDiscount) — one location, US-focused.",
    homepage: "https://grafomap.com",
    lastReviewed: "2026-06-30",
    hero: {
      h1: "Pinprint vs Grafomap: which custom map print should you buy?",
      subhead:
        "Grafomap helped popularize the one-click custom city map; today it runs through CanvasDiscount as an affordable single-location poster. Pinprint takes a different path — many places on one measured map, on genuine fine-art paper. Here's the comparison.",
    },
    tldr: [
      "Grafomap prints one location as an affordable poster; Pinprint maps many places on one print, each with a true bearing and distance from home.",
      "Grafomap's current live prints are on genuine photo paper; Pinprint's loose prints are on Hahnemühle German Etching 310gsm with archival pigment inks.",
      "Grafomap has no digital download and starts cheap; Pinprint starts higher but includes the digital files and sells a standalone download.",
      "Grafomap is the budget single-map pick; Pinprint is the fine-art, multi-place gift.",
    ],
    atAGlance: [
      {
        attribute: "What it puts on the wall",
        pinprint: "Many places on one map, measured from home",
        competitor: "One location — a city or exact address",
        advantage: "pinprint",
      },
      {
        attribute: "Bearings & distances",
        pinprint: "True bearing + great-circle distance to each place",
        competitor: "No measurements; a styled single map",
        advantage: "pinprint",
      },
      {
        attribute: "Paper (loose print)",
        pinprint: "Hahnemühle German Etching 310gsm, archival pigment inks",
        competitor: "Genuine photo paper (current CanvasDiscount product)",
        advantage: "pinprint",
      },
      {
        attribute: "Sizes & price",
        pinprint: `${PP.priceRange} (12×18 to 24×36 in)`,
        competitor: "$19–$48 unframed (8×12 to 20×30 in)",
        advantage: "competitor",
      },
      {
        attribute: "Digital download",
        pinprint: `Included with every print; standalone ${PP.digitalPrice}`,
        competitor: "Not offered",
        advantage: "pinprint",
      },
      {
        attribute: "Framing",
        pinprint: "Ready-to-hang wood frame, +$50–$100, digital included",
        competitor: "Framed $52–$118 (acrylic glass + wood backing)",
      },
      {
        attribute: "Shipping",
        pinprint: "Free standard shipping, no minimum (US only)",
        competitor: "Free over $75; otherwise ~$8.90; US-focused",
        advantage: "pinprint",
      },
    ],
    deepDive: [
      {
        id: "concept",
        heading: "One place vs. the whole map of you",
        body: [
          "Grafomap is a single-location custom map: pick a city or exact address, choose a color theme, and it renders that one spot from real map data. It's quick — a design takes a few minutes — and the result is a clean, recognizable poster of one place.",
          "Pinprint isn't a single-place tool. You set home, then add every place that matters and Pinprint draws an arrow to each in its true compass direction, with the great-circle distance beside it. One print, many places, measured.",
          "Worth knowing: grafomap.com's custom-map product currently runs through CanvasDiscount, a US discount-print company, so it's positioned as an affordable single-map poster rather than a fine-art piece.",
        ],
        takeaway:
          "Pinprint's edge: a measured, multi-place map vs. a single styled location.",
      },
      {
        id: "quality",
        heading: "Photo paper vs. Hahnemühle German Etching",
        body: [
          "Grafomap's current live product is described as a “deluxe print on genuine photo paper,” with the framed version adding acrylic glass and a wooden backing. We couldn't verify an archival rating, paper weight, or pigment-ink claim on the live site, so photo paper is the spec to go on.",
          "Pinprint's loose prints are on Hahnemühle German Etching 310gsm with archival pigment inks, made to order. Framed prints use 300gsm 100% cotton-rag paper behind a premium natural-oak ready-to-hang frame. That's a genuinely different, more premium substrate than photo paper — for a print you hold in your hands, nothing competes with the texture of that 310gsm German Etching.",
        ],
        takeaway: "Pinprint's edge: real cotton-rag fine-art paper vs. photo paper.",
      },
      {
        id: "styles",
        heading: "Styles and customization",
        body: [
          "Grafomap offers around eleven color themes plus control over location, zoom, orientation and text — solid options for styling one map.",
          "Pinprint offers multiple print styles and lets you re-style the same set of places instantly, with home fixed at the center. Its layout engine keeps every label readable no matter how many places you add — the part that simply doesn't come up when there's only one pin on the map.",
        ],
        takeaway: "Pinprint's edge: styling and layout built for many places at once.",
      },
      {
        id: "pricing",
        heading: "Pricing and what's included",
        body: [
          "Grafomap is the cheaper entry point: its current live sizes run roughly $19–$48 unframed and $52–$118 framed, with free shipping over $75 and aggressive price-match guarantees. There's no digital download.",
          `Pinprint's prints run ${PP.priceRange}, with a ready-to-hang frame adding $50–$100. Every print includes the digital files, and a standalone download is ${PP.digitalPrice}. Shipping is free with no minimum.`,
          "If the goal is the lowest possible price on a single map, Grafomap wins. If you want fine-art paper, the digital files, and many places on one print, Pinprint is the stronger value despite the higher sticker.",
        ],
        takeaway:
          "Honest call: Grafomap is cheaper up front; Pinprint includes more for the money.",
      },
      {
        id: "shipping",
        heading: "Shipping and delivery",
        body: [
          "Grafomap (via CanvasDiscount) is US-focused, with free shipping over $75 and a flat fee otherwise; it advertises fast dispatch with typical delivery in about 5–10 days.",
          "Pinprint also ships within the US, but shipping is free on every order with no threshold, and most orders arrive within 5–10 business days.",
        ],
        takeaway: "Pinprint's edge: free shipping with no $75 minimum.",
      },
      {
        id: "ease",
        heading: "Designing your print",
        body: [
          "Both are quick to use with a live preview. Grafomap's editor is famously a few-minutes job for a single map.",
          "Pinprint is free to design with no account needed, and the layout engine does the tedious work of placing and de-cluttering labels, so even a map with many places stays fast and tidy.",
        ],
      },
    ],
    whoFits: {
      pinprint: [
        "You want several places on one print, measured from home",
        "Hahnemühle German Etching 310gsm fine-art paper and included digital files matter to you",
        "You want free shipping with no minimum order",
        "You're buying a keepsake gift, not just décor",
      ],
      competitor: [
        "You want the lowest price on a single city map",
        "A genuine-photo-paper poster is fine for your wall",
        "You like a price-match / money-back guarantee",
        "You just want a quick, inexpensive single-location print",
      ],
    },
    verdict:
      "Grafomap is a fine budget choice if you want one city on the wall as cheaply as possible. But Pinprint is the better buy when the print is meant to mean something: it maps many places at once, each measured from home, on Hahnemühle German Etching 310gsm fine-art paper, with the digital files included and free shipping with no minimum. For a gift you want to last, Pinprint is worth the higher price.",
    faq: [
      {
        q: "Can Grafomap put multiple locations on one poster?",
        a: "No — Grafomap renders a single location. For several places on one print, each with a bearing and distance from home, that's Pinprint.",
      },
      {
        q: "Is Grafomap cheaper than Pinprint?",
        a: `Yes, at the entry level — Grafomap's current live prints start around $19 versus Pinprint's ${PP.prints[0].price}. But Grafomap has no digital download and prints on photo paper, while Pinprint includes digital files and prints on Hahnemühle German Etching 310gsm.`,
      },
      {
        q: "What paper does Grafomap use?",
        a: "Its current live product (via CanvasDiscount) is a print on genuine photo paper. Pinprint's loose prints are on Hahnemühle German Etching 310gsm with archival pigment inks.",
      },
      {
        q: "Does Grafomap offer a digital download?",
        a: `No. Pinprint includes print-ready digital files with every print and sells a standalone download for ${PP.digitalPrice}.`,
      },
      {
        q: "Is Grafomap the same as CanvasDiscount now?",
        a: "As of our review, grafomap.com's custom-map product runs through CanvasDiscount, a US discount-print company. Check their site for current ownership, pricing and materials.",
      },
    ],
    meta: {
      title: "Pinprint vs Grafomap: Custom Map Print Comparison",
      description:
        "Pinprint vs Grafomap, compared honestly: a measured multi-place map on Hahnemühle German Etching 310gsm vs an affordable single-location poster on photo paper.",
    },
  },

  // ── Craft & Oak ──────────────────────────────────────────────────────────────
  {
    slug: "pinprint-vs-craft-and-oak",
    key: "craft-and-oak",
    name: "Craft & Oak",
    oneLiner:
      "A US custom map & star-map shop (formerly YourOwnMaps) — pin-and-coordinate city maps, shipped free worldwide.",
    homepage: "https://craftoak.com",
    lastReviewed: "2026-06-30",
    hero: {
      h1: "Pinprint vs Craft & Oak: which custom map print is right for you?",
      subhead:
        "Craft & Oak makes polished city maps, coordinate prints and star maps you can pin and personalize; Pinprint maps your places with a true compass bearing and distance from home. These two are closer than most — here's where they differ.",
    },
    tldr: [
      "Both can put several places on one map, but Craft & Oak marks pins and coordinates, while Pinprint measures each place — a true compass bearing and great-circle distance from home.",
      "Both offer a digital download; Pinprint's is cheaper and included free with every print.",
      "Craft & Oak prints on 250gsm matte archival paper; Pinprint's loose prints are on Hahnemühle German Etching 310gsm, a heavier textured fine-art paper.",
      "Craft & Oak ships free worldwide; Pinprint currently ships in the US only — a real point in Craft & Oak's favor for international orders.",
    ],
    atAGlance: [
      {
        attribute: "Places on one map",
        pinprint: "As many as you like, measured from home",
        competitor: "Up to ~15 pins/markers on one map",
      },
      {
        attribute: "Bearings & distances",
        pinprint: "True compass bearing + great-circle distance to each place",
        competitor: "Pins and coordinates; no measured bearing or distance",
        advantage: "pinprint",
      },
      {
        attribute: "Paper (loose print)",
        pinprint: "Hahnemühle German Etching 310gsm, archival pigment inks",
        competitor: "250gsm matte, acid-free/archival, HP Indigo pigment inks",
        advantage: "pinprint",
      },
      {
        attribute: "Digital download",
        pinprint: `Included with every print; standalone ${PP.digitalPrice}`,
        competitor: "Yes — 300 DPI PDF, $25",
        advantage: "pinprint",
      },
      {
        attribute: "Sizes & price",
        pinprint: `${PP.priceRange} (12×18 to 24×36 in)`,
        competitor: "From $44 (12×18); larger from $100",
      },
      {
        attribute: "Shipping",
        pinprint: "Free standard shipping (US only)",
        competitor: "Free worldwide shipping",
        advantage: "competitor",
      },
      {
        attribute: "Returns",
        pinprint: "Free replacement or refund on damage — a photo, no return needed",
        competitor: "Damaged/undelivered case-by-case; strict on custom items",
        advantage: "pinprint",
      },
    ],
    deepDive: [
      {
        id: "concept",
        heading: "Pins and coordinates vs. measured bearings",
        body: [
          "Craft & Oak (formerly YourOwnMaps) is one of the closer comparisons here, because its city-map product lets you drop up to about fifteen pins on a single map and add coordinates as text. You can mark several meaningful spots on one print.",
          "The difference is what Pinprint does with those places: it sets home at the center and draws an arrow to each place in its true compass direction, with the great-circle distance beside it. It's a measured, directional layout — not pins on a street map — and a layout engine keeps every label readable however many you add.",
          "So if you want pinned landmarks on a city map, Craft & Oak handles that well. If you want the directions and distances from home — the measured story — that's Pinprint's specific thing.",
        ],
        takeaway:
          "Pinprint's edge: it measures each place (bearing + distance from home) rather than marking pins.",
      },
      {
        id: "quality",
        heading: "Paper and print quality",
        body: [
          "Craft & Oak prints on 250gsm matte, acid-free archival paper with HP Indigo pigment inks, and markets it as museum-grade. It's a legitimately good archival stock — closer to Pinprint's than most competitors here.",
          "Pinprint's loose prints are on Hahnemühle German Etching 310gsm — a heavily textured fine-art paper — with archival pigment inks. Framed prints use 300gsm 100% cotton-rag paper (smooth behind glass) in a premium natural-oak ready-to-hang frame. Both are archival; Pinprint's German Etching 310gsm is the heavier, more distinctly textured fine-art substrate.",
        ],
        takeaway:
          "Pinprint's edge: Hahnemühle German Etching 310gsm vs. 250gsm matte (both genuinely archival).",
      },
      {
        id: "styles",
        heading: "Styles and customization",
        body: [
          "Craft & Oak offers minimalist, high-contrast and monochrome map styles (Mapbox data), several colors and layouts, plus star-map and coordinate products — a flexible, well-built editor.",
          "Pinprint offers multiple print styles for the same set of places and re-renders them instantly with home fixed at the center. Its layout engine is the difference once you have many places: labels never overlap, and the arrows stay put so each bearing stays accurate.",
        ],
        takeaway:
          "Pinprint's edge: a measured layout that stays readable as places add up.",
      },
      {
        id: "pricing",
        heading: "Pricing and what's included",
        body: [
          `The two start in the same place: Craft & Oak's prints are “from $44” (12×18), larger pieces from $100, and a 300 DPI PDF download is $25. Pinprint's prints run ${PP.priceRange}, and its digital download is ${PP.digitalPrice} — included free with every print.`,
          "Framing is an add-on for both; Craft & Oak's exact frame surcharge is set in its editor, while Pinprint's ready-to-hang frame adds $50–$100.",
          "On price they're close. Pinprint's digital is a little cheaper and bundled with prints; Craft & Oak's headline floor is a dollar lower.",
        ],
        takeaway: "Pinprint's edge: digital files cheaper and included with every print.",
      },
      {
        id: "shipping",
        heading: "Shipping and delivery",
        body: [
          "Here Craft & Oak has the clear advantage: free shipping worldwide on every order, with production in the US and Europe and typical delivery in about 3–7 business days (its terms allow up to 30).",
          "Pinprint currently ships within the United States only, though shipping is free with no minimum. If you're ordering internationally, Craft & Oak is the practical pick today.",
        ],
        takeaway:
          "Honest call: Craft & Oak ships free worldwide; Pinprint is free but US-only.",
      },
      {
        id: "ease",
        heading: "Designing your print",
        body: [
          "Both are in-browser editors with live previews and no files to wrestle with. Craft & Oak's editor is polished across maps, coordinates and star maps.",
          "Pinprint is free to design with no account needed, includes the digital files, and automates the measured layout so a map of many places stays quick to build.",
        ],
      },
    ],
    whoFits: {
      pinprint: [
        "You want the measured story — bearing and distance from home to each place",
        "Hahnemühle German Etching 310gsm fine-art paper matters to you",
        "You'd like the digital files included and a simple damage-replacement policy",
        "You're ordering within the United States",
      ],
      competitor: [
        "You want pinned landmarks or coordinates on a city or star map",
        "You're ordering from outside the US and want free worldwide shipping",
        "You want a star map or coordinate print alongside your map",
        "A 250gsm archival matte print suits your wall",
      ],
    },
    verdict:
      "Craft & Oak is the closest competitor here — it shares the multi-pin map idea, offers a digital download, and ships free worldwide, which makes it a strong choice for international buyers. But if the appeal is the measured story — a true compass bearing and real distance from home to each place — Pinprint is purpose-built for exactly that, on Hahnemühle German Etching 310gsm fine-art paper, with the digital files included. For US buyers who want the measured map, Pinprint is the better pick.",
    faq: [
      {
        q: "Can Craft & Oak put several places on one map?",
        a: "Yes — its city map lets you add up to about fifteen pins. The difference is that Pinprint measures each place: a true compass bearing and great-circle distance from home, in a directional layout, rather than pins on a street map.",
      },
      {
        q: "Does Craft & Oak offer a digital download?",
        a: `Yes — a 300 DPI PDF for $25. Pinprint's digital download is ${PP.digitalPrice} and is included free with every print.`,
      },
      {
        q: "What paper does Craft & Oak use?",
        a: "250gsm matte, acid-free archival paper with HP Indigo pigment inks. Pinprint's loose prints are on Hahnemühle German Etching 310gsm — a heavier, heavily textured fine-art paper.",
      },
      {
        q: "Which one ships internationally?",
        a: "Craft & Oak ships free worldwide; Pinprint currently ships within the United States only. For international orders, Craft & Oak is currently the better option.",
      },
      {
        q: "Is Pinprint or Craft & Oak cheaper?",
        a: `They're close — Craft & Oak's prints start from $44 and Pinprint's from ${PP.prints[0].price}, but Pinprint's ${PP.digitalPrice} digital download is cheaper than Craft & Oak's $25 and is included free with every print.`,
      },
    ],
    meta: {
      title: "Pinprint vs Craft & Oak: Custom Map Print Comparison",
      description:
        "Pinprint vs Craft & Oak, compared honestly: measured bearings and distances from home vs pinned city maps, on Hahnemühle German Etching 310gsm vs 250gsm matte.",
    },
  },

  // ── Positive Prints ──────────────────────────────────────────────────────────
  {
    slug: "pinprint-vs-positive-prints",
    key: "positive-prints",
    name: "Positive Prints",
    oneLiner:
      "A broad personalized-art shop — custom maps, star maps, coordinates and more, shipped worldwide.",
    homepage: "https://positiveprints.com",
    lastReviewed: "2026-06-30",
    hero: {
      h1: "Pinprint vs Positive Prints: which custom map print is right for you?",
      subhead:
        "Positive Prints is a wide personalized-art shop with maps, star maps and coordinate prints; Pinprint does one thing — a measured map of all the places that matter, from home. Here's how they compare.",
    },
    tldr: [
      "Positive Prints offers a broad range of personalized art (maps, star maps, coordinates, route posters). Pinprint focuses on one thing: a multi-place map measured from home.",
      "Positive Prints' map and coordinate products are single-location; its route poster shows stats for one GPX route. Pinprint draws a true bearing and distance to many places at once.",
      "Both offer digital downloads and print on archival-leaning papers. Pinprint's loose prints are on Hahnemühle German Etching 310gsm — a heavier, textured fine-art paper.",
      "Positive Prints ships worldwide; Pinprint currently ships in the US only.",
    ],
    atAGlance: [
      {
        attribute: "What it puts on the wall",
        pinprint: "Many places on one map, measured from home",
        competitor: "Mostly single-location maps, star maps, coordinates",
        advantage: "pinprint",
      },
      {
        attribute: "Bearings & distances",
        pinprint: "True bearing + great-circle distance to each place",
        competitor:
          "Coordinates shown as text; route poster shows one route's stats; no place-to-place bearings",
        advantage: "pinprint",
      },
      {
        attribute: "Paper (loose print)",
        pinprint: "Hahnemühle German Etching 310gsm, archival pigment inks",
        competitor: "200gsm matte giclée, acid-free, “museum-quality”",
        advantage: "pinprint",
      },
      {
        attribute: "Digital download",
        pinprint: `Included with every print; standalone ${PP.digitalPrice}`,
        competitor: "Yes — instant 300 dpi JPEG",
      },
      {
        attribute: "Range of products",
        pinprint: "Focused: the measured map, done well",
        competitor: "Broad: maps, star maps, moon phases, lyrics, jewelry",
        advantage: "competitor",
      },
      {
        attribute: "Pricing",
        pinprint: `${PP.priceRange}, shown clearly on-site`,
        competitor: "Set in the product editor; varies by region",
      },
      {
        attribute: "Shipping",
        pinprint: "Free standard shipping (US only)",
        competitor: "Worldwide, with local production; free over a cart threshold",
        advantage: "competitor",
      },
    ],
    deepDive: [
      {
        id: "concept",
        heading: "A focused tool vs. a broad catalog",
        body: [
          "Positive Prints is a broad personalized-gift shop: custom maps, star maps, moon-phase posters, song-lyric prints, coordinate art and more. Its map and coordinate products center on a single place, and the closest thing to “measured” data is a route poster that shows distance, time and elevation for one uploaded GPX route.",
          "Pinprint does one thing instead of many: a single map centered on home, with an arrow to each place you add in its true compass direction and the great-circle distance beside it. It's a focused tool for one specific, personal idea.",
          "So if you want variety — a star map here, a coordinates print there — Positive Prints has the wider catalog. If you specifically want the measured, multi-place map, that's Pinprint's whole reason for existing.",
        ],
        takeaway:
          "Pinprint's edge: a purpose-built measured map of many places, not a single point or route.",
      },
      {
        id: "quality",
        heading: "Paper and print quality",
        body: [
          "Positive Prints uses 200gsm matte paper, giclée-printed on acid-free stock with archival inks, which it markets as “museum-quality.” It's a respectable, well-reviewed print.",
          "Pinprint's loose prints are on Hahnemühle German Etching 310gsm — a heavily textured fine-art paper — with archival pigment inks. Framed prints use 300gsm 100% cotton-rag paper (smooth behind glass) in a premium natural-oak ready-to-hang frame. Both brands lean archival, but Pinprint's German Etching 310gsm is the heavier, more premium fine-art substrate.",
        ],
        takeaway: "Pinprint's edge: Hahnemühle German Etching 310gsm vs. 200gsm matte.",
      },
      {
        id: "styles",
        heading: "Styles and customization",
        body: [
          "Positive Prints is flexible on shape (square, circle, heart), offers curated and fully custom color schemes, and adds text, dates and quotes — strong, friendly customization across its product range.",
          "Pinprint offers multiple print styles for the same set of places and re-renders them instantly, with home at the center. Its layout engine is the differentiator: it keeps every label readable however many places you add, while the arrows stay fixed so each bearing stays true.",
        ],
        takeaway:
          "Pinprint's edge: a layout engine tuned for many measured places on one print.",
      },
      {
        id: "pricing",
        heading: "Pricing and what's included",
        body: [
          "Positive Prints sets prices inside its product editor and varies them by region, so there isn't a single public price list to quote — it's worth pricing your exact piece on their site. It does offer a true digital download (an instant 300 dpi JPEG).",
          `Pinprint's pricing is shown clearly on-site: prints run ${PP.priceRange}, a ready-to-hang frame adds $50–$100, and every print includes the digital files (a standalone download is ${PP.digitalPrice}).`,
        ],
        takeaway: "Pinprint's edge: transparent, on-site pricing with digital included.",
      },
      {
        id: "shipping",
        heading: "Shipping and delivery",
        body: [
          "Positive Prints ships worldwide with local production hubs (US, UK, EU, Australia) for faster delivery, and offers free shipping above a cart threshold.",
          "Pinprint currently ships within the United States only, but shipping is free on every order with no minimum. For international buyers, Positive Prints is the practical choice today.",
        ],
        takeaway:
          "Honest call: Positive Prints wins on international reach; Pinprint on free US shipping.",
      },
      {
        id: "ease",
        heading: "Designing your print",
        body: [
          "Both have a real-time design preview and offer digital files, so you can see and download your piece quickly. Positive Prints walks you through a few simple steps.",
          "Pinprint is free to design with no account needed, and the layout engine handles the tricky work of arranging many labeled places, so a busy map still comes together in minutes.",
        ],
      },
    ],
    whoFits: {
      pinprint: [
        "You want a measured map of many places from home, done well",
        "Hahnemühle German Etching 310gsm fine-art paper and clear on-site pricing matter to you",
        "You want the digital files included with your print",
        "You're ordering within the United States",
      ],
      competitor: [
        "You want a star map, coordinates print, or another gift type",
        "You're shopping internationally",
        "You value a long track record of reviews",
        "You specifically want one of Positive Prints' designs",
      ],
    },
    verdict:
      "If you want variety — a star map, a coordinates print, a single-route poster — Positive Prints' catalog is broad and well-reviewed. But if you specifically want a measured map of many places from home, Pinprint is the better fit: it's purpose-built for that one idea, on Hahnemühle German Etching 310gsm fine-art paper, with transparent pricing and the digital files included. For the measured multi-place map, choose Pinprint.",
    faq: [
      {
        q: "Does Positive Prints make a multi-location distance map?",
        a: "Not in the way Pinprint does. Its coordinates product is single-location and shows GPS text, and its route poster shows stats for one route. For a true bearing and distance to many places from home, that's Pinprint.",
      },
      {
        q: "Do both offer digital downloads?",
        a: `Yes — Positive Prints delivers an instant 300 dpi JPEG, and Pinprint includes print-ready PNG + SVG files with every print and sells a standalone download for ${PP.digitalPrice}.`,
      },
      {
        q: "What paper does Positive Prints use?",
        a: "200gsm matte, giclée-printed on acid-free paper. Pinprint's loose prints are on Hahnemühle German Etching 310gsm with archival pigment inks.",
      },
      {
        q: "How much does Positive Prints cost?",
        a: `Prices are set in their product editor and vary by region, so check their site for your exact piece. Pinprint's prints are ${PP.priceRange}.`,
      },
      {
        q: "Which one ships internationally?",
        a: "Positive Prints ships worldwide with local production. Pinprint currently ships within the United States only.",
      },
    ],
    meta: {
      title: "Pinprint vs Positive Prints: Map Print Comparison",
      description:
        "Pinprint vs Positive Prints, honestly compared: a focused measured map of many places vs a broad personalized-art catalog. Paper, pricing and shipping.",
    },
  },

  // ── Posterhaste ──────────────────────────────────────────────────────────────
  {
    slug: "pinprint-vs-posterhaste",
    key: "posterhaste",
    name: "Posterhaste",
    oneLiner:
      "A UK personalized-print shop with a maps line — six preset styles, one location, no digital.",
    homepage: "https://www.posterhaste.com",
    lastReviewed: "2026-06-30",
    hero: {
      h1: "Pinprint vs Posterhaste: which custom map print is right for you?",
      subhead:
        "Posterhaste is a UK print shop whose maps line styles a single location (or two side by side); Pinprint maps many places on one print, measured from home. Here's the honest comparison.",
    },
    tldr: [
      "Posterhaste styles one location from six preset map styles (its Dual Heart shows two places side by side, but doesn't measure between them). Pinprint maps many places at once, with a true bearing and distance to each from home.",
      "Posterhaste has no digital download and no custom colors; Pinprint includes digital files and lets you re-style freely.",
      "Posterhaste prints on 200gsm art paper; Pinprint's loose prints are on Hahnemühle German Etching 310gsm, a heavier textured fine-art paper.",
      "Posterhaste's entry print is cheap, but free shipping needs 2+ items and its returns policy is strict on personalized goods.",
    ],
    atAGlance: [
      {
        attribute: "What it puts on the wall",
        pinprint: "Many places on one map, measured from home",
        competitor: "One location (or two side by side) from preset styles",
        advantage: "pinprint",
      },
      {
        attribute: "Bearings & distances",
        pinprint: "True bearing + great-circle distance to each place",
        competitor: "None — “Dual” maps sit side by side without measuring",
        advantage: "pinprint",
      },
      {
        attribute: "Paper (loose print)",
        pinprint: "Hahnemühle German Etching 310gsm, archival pigment inks",
        competitor: "200gsm matte art paper, giclée",
        advantage: "pinprint",
      },
      {
        attribute: "Custom colors / layout",
        pinprint: "Multiple styles; re-style any time",
        competitor: "Preset styles only — “no bespoke colour schemes or layouts”",
        advantage: "pinprint",
      },
      {
        attribute: "Digital download",
        pinprint: `Included; standalone ${PP.digitalPrice}`,
        competitor: "Not offered",
        advantage: "pinprint",
      },
      {
        attribute: "Price (entry print)",
        pinprint: `${PP.prints[0].price} (free shipping, no minimum)`,
        competitor: "From $42.50 (free shipping needs 2+ items)",
      },
      {
        attribute: "Returns",
        pinprint: "Free replacement or refund on damage",
        competitor: "Strict — customer-error mistakes aren't refunded",
        advantage: "pinprint",
      },
    ],
    deepDive: [
      {
        id: "concept",
        heading: "Preset single maps vs. a measured multi-place map",
        body: [
          "Posterhaste's maps line lets you pick a location, choose one of six preset map styles, and adjust the zoom. There are nice variants — a heart-shaped map, a “Wordy Map” with up to fifteen lines of text, and a Dual Heart that places two locations side by side — but none of them measure direction or distance between places.",
          "Pinprint is built around exactly that measurement: home at the center, an arrow to each place in its true compass bearing, and the great-circle distance beside it — many places on one print.",
        ],
        takeaway:
          "Pinprint's edge: measured bearings and distances to many places, not side-by-side single maps.",
      },
      {
        id: "quality",
        heading: "Paper and print quality",
        body: [
          "Posterhaste prints its maps on 200gsm matte art paper (giclée), with a heavier 400gsm canvas option; framed versions add conservation-grade acid-free mounts. It markets the prints as “museum-quality.”",
          "Pinprint's loose prints are on Hahnemühle German Etching 310gsm — a heavily textured fine-art paper — with archival pigment inks. Framed prints use 300gsm 100% cotton-rag paper (smooth behind glass) in a premium natural-oak ready-to-hang frame. Pinprint's loose stock is the heavier, genuinely fine-art paper on either option.",
        ],
        takeaway: "Pinprint's edge: Hahnemühle German Etching 310gsm vs. 200gsm art paper.",
      },
      {
        id: "styles",
        heading: "Styles and customization",
        body: [
          "Posterhaste gives you six preset map styles and control over location, zoom and orientation, but its FAQ is explicit that it does not offer bespoke color schemes or layouts — you choose from the presets.",
          "Pinprint offers multiple styles and lets you re-style the same set of places instantly, and its layout engine keeps every label readable however many places you add. For a map with one or two pins that distinction barely matters; for a life's worth of places, it's the whole game.",
        ],
        takeaway: "Pinprint's edge: re-styling and a layout engine for many places.",
      },
      {
        id: "pricing",
        heading: "Pricing and what's included",
        body: [
          "Posterhaste's entry unframed print is inexpensive (from $42.50 on its US store), but framing roughly doubles it (framed prints from about $97), and there's no digital download.",
          `Pinprint's prints run ${PP.priceRange}, a ready-to-hang frame adds $50–$100, and every print includes the digital files (standalone ${PP.digitalPrice}). Shipping is free with no minimum.`,
          "On a single unframed poster, Posterhaste's headline price is lower — but watch the conditions: free shipping requires buying two or more items, and framed orders cost and ship differently.",
        ],
        takeaway:
          "Honest call: Posterhaste's sticker is lower; Pinprint includes digital and free, no-minimum shipping.",
      },
      {
        id: "shipping",
        heading: "Shipping and delivery",
        body: [
          "Posterhaste ships unframed prints worldwide, but framed items go only to a limited European list, and free shipping applies only when you order two or more unframed prints together — single items are always charged.",
          "Pinprint ships within the United States with free standard shipping on every order and no minimum. For US buyers that's simpler; for buyers wanting framed art shipped across Europe, Posterhaste has the wider framed reach.",
        ],
        takeaway:
          "Honest call: Posterhaste ships unframed worldwide; Pinprint gives free US shipping with no minimum.",
      },
      {
        id: "ease",
        heading: "Designing your print",
        body: [
          "Both show a live preview before you order. Posterhaste leans on that as its headline feature.",
          "Pinprint is free to design with no account needed, includes the digital files, and automates the label layout, so even a crowded map stays quick and clean.",
        ],
      },
    ],
    whoFits: {
      pinprint: [
        "You want many places on one print, measured from home",
        "You want to re-style freely and get the digital files included",
        "Heavier cotton-rag paper matters to you",
        "You're ordering within the United States",
      ],
      competitor: [
        "You want an inexpensive single-location or heart-shaped map",
        "You're in the UK or Europe",
        "You like one of Posterhaste's six preset styles",
        "You're ordering two or more unframed prints (for free shipping)",
      ],
    },
    verdict:
      "Posterhaste is a reasonable pick for an inexpensive, single-location decorative map — particularly in the UK. But for a measured, multi-place map on Hahnemühle German Etching 310gsm fine-art paper, with free re-styling, the digital files included, and a friendlier damage policy, Pinprint is the stronger choice. If the map is meant to tell a story, choose Pinprint.",
    faq: [
      {
        q: "Can Posterhaste show the distance between places?",
        a: "No. Its maps style a single location, and even the Dual Heart map places two locations side by side without measuring direction or distance. Pinprint draws a true bearing and great-circle distance from home to each place.",
      },
      {
        q: "Does Posterhaste offer a digital download?",
        a: `No — Posterhaste sells physical prints only. Pinprint includes digital files with every print and sells a standalone download for ${PP.digitalPrice}.`,
      },
      {
        q: "Is Posterhaste cheaper than Pinprint?",
        a: `Its entry unframed print starts around $42.50 versus Pinprint's ${PP.prints[0].price}, but free shipping requires two or more items, there's no digital download, and framing roughly doubles the price.`,
      },
      {
        q: "What paper does Posterhaste use?",
        a: "200gsm matte art paper (giclée), with a 400gsm canvas option. Pinprint's loose prints are on Hahnemühle German Etching 310gsm with archival pigment inks.",
      },
      {
        q: "Can I customize the colors on Posterhaste?",
        a: "Only within its six preset styles — its FAQ states it does not offer bespoke colour schemes or layouts. Pinprint offers multiple styles you can switch between freely.",
      },
    ],
    meta: {
      title: "Pinprint vs Posterhaste: Custom Map Print Comparison",
      description:
        "Pinprint vs Posterhaste: a measured multi-place map on Hahnemühle German Etching 310gsm vs preset single-location maps. Paper, pricing, shipping.",
    },
  },
];

/** All comparison slugs, e.g. "pinprint-vs-mapiful" — used by the sitemap + route. */
export const COMPARE_SLUGS: readonly string[] = COMPETITORS.map((c) => c.slug);

/** Slug → competitor lookup. */
export const competitorBySlug: ReadonlyMap<string, Competitor> = new Map(
  COMPETITORS.map((c) => [c.slug, c]),
);

/** Resolve a comparison slug to its competitor, or undefined if unknown. */
export function getCompetitor(slug: string): Competitor | undefined {
  return competitorBySlug.get(slug);
}
