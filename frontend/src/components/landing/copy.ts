/**
 * Single source of truth for ALL landing-page copy.
 *
 * Everything visible on `/` is authored here so it can be changed in one place.
 * Voice (DESIGN.md): warm-gift premium. Short declaratives with periods.
 * Specifics over adjectives. No em dashes, no exclamation marks, no emoji.
 * Every claim here is verifiable: paper stock, ink type, bearing math, shipping
 * policy. Nothing invented, no fabricated testimonials or press logos.
 */

export const STUDIO_HREF = "/studio";
export const PRIMARY_CTA = "Create your print";

/** A single FAQ entry. `featured` items are surfaced on the landing-page teaser. */
export type FaqItem = { q: string; a: string; featured?: boolean };
/** A category of FAQ entries, rendered as one block on the /faq page. */
export type FaqGroup = { title: string; items: readonly FaqItem[] };

export const copy = {
  brand: {
    name: "Pinprint",
  },

  nav: {
    // Absolute hrefs (`/#section`) so the shared header works from any route.
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Styles", href: "/#styles" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/faq" },
    ],
  },

  hero: {
    // Eyebrow names the category in plain words so a cold visitor knows what
    // this is before reading anything else.
    eyebrow: "Custom fine art map print",
    headline: "A map of everywhere that made you you.",
    subhead:
      "Set where home is, then add the places you were born, lived, visited, or have family. Pinprint draws an arrow to each one, pointing exactly where it really is, with the true distance beside it. Then we print it on gallery paper and send it to your door.",
    primaryCta: PRIMARY_CTA,
    secondaryCta: "See how it works",
    // Quiet materials line under the CTAs: the upmarket signal is the spec.
    specLine: "Hahnemühle 310gsm · archival giclée · solid oak frames",
    reassurance: "Free to design. Pay only when you print.",
    media: {
      label: "A warm living room wall above a long oak sideboard",
      aspect: "33 / 14",
      src: "/showcase/scene-hero-bg.png",
      alt: "Warm ivory plaster wall above a long oak sideboard with a vase and books",
    },
    framed: {
      label: "The hero print in its oak frame",
      src: "/showcase/framed-hero.png",
      alt: "A warm-minimal Pinprint of San Francisco in a natural oak frame",
    },
  },

  // Thin hairline strip of verifiable quality signals. Replaces logo bars and
  // star widgets: specifics are the trust currency (DESIGN.md).
  trustLine: {
    items: [
      "Hahnemühle 310gsm paper",
      "Archival giclée inks",
      "Natural oak frames",
      "Free US shipping",
      "Damage replacement guarantee",
    ],
  },

  howItWorks: {
    eyebrow: "How it works",
    headline: "Three steps to a finished print.",
    steps: [
      {
        title: "Start at home",
        body: "Search for the place you call home, or drop a pin on the map. Every arrow and every distance on your print is measured from here.",
      },
      {
        title: "Add the places that matter",
        body: "The town you were born in. The city you fell in love with. The coast your family still lives on. Tag each one as born, lived, visited, or family.",
      },
      {
        title: "Make it yours, then print",
        body: "Choose one of ten looks and watch the preview redraw as you work. Order it framed or unframed, or take the files and print it yourself.",
      },
    ],
  },

  // The authority section: why the map can be trusted, written for someone
  // who has never seen the product. Pairs with the interactive globe.
  accuracy: {
    eyebrow: "The cartography",
    headline: "Accurate enough to navigate by.",
    body: [
      "A Pinprint is not decorated with random arrows. It is drawn from real coordinates. Each arrow points along the true compass bearing from your home to that place, and the number beside it is the great-circle distance, the actual shortest path over the curve of the earth.",
      "When forty labels crowd the page, our layout engine nudges each name into clear space. It never moves an arrow. The direction is the whole point, so the direction stays true no matter what.",
    ],
    annotations: [
      { term: "Home", def: "The center point. Everything is measured from here." },
      { term: "The arrow", def: "Points along that place's true compass bearing from home." },
      { term: "The number", def: "The great-circle distance, as the crow flies." },
    ],
    fidelity:
      "The artwork is drawn as vector graphics and rendered for print on our servers at 300 DPI. Whatever size you order, every hairline and every label comes out sharp.",
    tryLabel: "Try it. Measure from your own home town.",
    posterLabel: "The print it makes",
    posterCta: "Make your own",
  },

  craft: {
    eyebrow: "The craft",
    headline: "Paper you notice the moment you pick it up.",
    body: [
      "Every print is made to order on Hahnemühle German Etching, a 310gsm textured fine art paper, with archival pigment inks that hold their color for decades. Each one is checked by hand before it ships.",
      "For scale: everyday printer paper weighs about 90gsm. Most poster-shop prints are 120 to 170. This is 310, closer to card than paper, with a surface texture you can feel.",
      "Framed prints come on smooth 300gsm cotton rag behind glass, in a solid natural oak frame that arrives wired and ready to hang.",
    ],
    media: {
      label: "Close-up of 310gsm cotton paper and an oak frame corner",
      aspect: "3 / 2",
      src: "/showcase/scene-craft.png",
      alt: "Macro photograph of thick textured fine art paper with a deckled edge beside the corner of a natural oak frame",
    },
  },

  styles: {
    eyebrow: "Pick a look",
    headline: "Ten looks. The same places, drawn true.",
    body: "Switch between looks at any time. Your home, your places, and every bearing stay exactly where they are.",
    // The look cards themselves come straight from src/lib/looks/looks.ts so
    // the gallery can never drift from what the studio actually ships.
  },

  stories: {
    eyebrow: "Made with Pinprint",
    headline: "Every one tells a different story.",
    items: [
      {
        title: "Where it started",
        caption: "Five southern cities, measured from Nashville.",
        src: "/showcase/story-where-it-started.png",
        alt: "Heirloom-style Pinprint centered on Nashville",
      },
      {
        title: "The honeymoon",
        caption: "Four stops on one trip, measured from Seattle.",
        src: "/showcase/story-the-honeymoon.png",
        alt: "Celestial Pinprint centered on Seattle",
      },
      {
        title: "First home",
        caption: "Every city on the way to Portland.",
        src: "/showcase/story-first-home.png",
        alt: "Minimal Pinprint centered on Portland",
      },
      {
        title: "Family across oceans",
        caption: "Five family homes, measured from Toronto.",
        src: "/showcase/story-family-across-oceans.png",
        alt: "Atlas-style Pinprint centered on Toronto",
      },
      {
        title: "The year abroad",
        caption: "A year of trains, measured from Bristol.",
        src: "/showcase/story-the-year-abroad.png",
        alt: "Swiss editorial Pinprint centered on Bristol",
      },
      {
        title: "Every house so far",
        caption: "Five moves across two hemispheres, measured from Wellington.",
        src: "/showcase/story-every-house-so-far.png",
        alt: "Topographic Pinprint centered on Wellington",
      },
    ],
  },

  // The gifting beat: the product's most common purchase is for someone else.
  gift: {
    eyebrow: "The gift",
    headline: "Made to be given.",
    body: [
      "The hardest people to buy for already own everything except this. A Pinprint is their story, drawn from real coordinates: where they started, where they went, where home is now.",
      "It arrives ready to give. A solid oak frame, wired for the wall, in protective packaging that opens well.",
    ],
    occasions: [
      "Weddings and anniversaries",
      "A new home",
      "Leaving for college",
      "Retirement",
      "Mother's and Father's Day",
    ],
    cta: "Make one for someone",
    media: {
      label: "A framed Pinprint leaning on a wall beside wrapping paper",
      aspect: "3 / 2",
      src: "/showcase/scene-gift.png",
      alt: "Framed celestial Pinprint of Seattle leaning against an ivory wall next to kraft wrapping paper and twine",
    },
  },

  pricingPreview: {
    eyebrow: "Opening launch sale",
    headline: "Opening prices, before they go up.",
    body: "To mark our opening launch, all three print sizes are on sale. Shipping in the United States is free, and every order includes the digital files.",
    link: { label: "See pricing and sizes", href: "/pricing" },
  },

  faq: {
    eyebrow: "Questions",
    headline: "Good to know.",
    seeAll: { label: "See all questions", href: "/faq" },
    page: {
      eyebrow: "FAQ",
      headline: "Everything you might want to know.",
      intro:
        "Designing your print, sizes and framing, shipping, and what happens if something isn't right. It's all here. Still stuck? Write to us and we'll help.",
      metaTitle: "FAQ | Pinprint",
      metaDescription:
        "Answers about designing your Pinprint, sizes and framing, shipping and delivery, returns, and your account.",
    },
    groups: [
      {
        title: "Designing your print",
        items: [
          {
            q: "How are the arrows and distances worked out?",
            a: "From real coordinates. Each arrow points along the true compass bearing from your home to the place, and the distance is the great-circle distance, the real shortest path across the globe.",
            featured: true,
          },
          {
            q: "How many places can I add?",
            a: "As many as you like. The layout engine keeps labels from overlapping, even on a crowded map, and it never moves an arrow to do it.",
          },
          {
            q: "Can I change the design after I've added places?",
            a: "Yes. Switch between all ten looks at any time. Your home and places stay exactly where they are.",
          },
        ],
      },
      {
        title: "Sizes, materials & framing",
        items: [
          {
            q: "What sizes can I order?",
            a: "Three portrait sizes: 12 by 18, 16 by 24, and 24 by 36 inches. The artwork is drawn as vector graphics and rendered for print at 300 DPI, so every size prints sharp.",
            featured: true,
          },
          {
            q: "How is each print made?",
            a: "Made to order the moment you buy, with archival pigment inks that resist fading for decades, and checked by hand before it ships. Loose prints are on Hahnemühle German Etching, a heavily textured 310gsm fine art paper. Framed prints use smooth 300gsm cotton rag, which sits cleanly behind glass.",
          },
          {
            q: "Can I get it framed?",
            a: "Yes. Add a natural oak frame at checkout: solid wood, glass front, arrives wired so it goes straight on the wall. Framed prints use 300gsm cotton rag paper, so there's no compromise on the paper.",
          },
          {
            q: "Can I just buy the digital file?",
            a: "Yes. The digital download is a print-ready PNG plus a scalable SVG you can print yourself at any size. Every printed order includes the digital files too.",
          },
        ],
      },
      {
        title: "Shipping & delivery",
        items: [
          {
            q: "When will my print arrive?",
            a: "Most orders arrive within 5 to 10 business days. Your print is made and shipped within 2 to 3 business days, and you'll get a tracking link by email the moment it's on its way.",
            featured: true,
          },
          {
            q: "Where do you ship, and how much does it cost?",
            a: "We currently ship anywhere in the United States, and shipping is free. The price you see is the price you pay, with nothing added at checkout.",
          },
        ],
      },
      {
        title: "Returns & changes",
        items: [
          {
            q: "What if my print arrives damaged or there's a fault?",
            a: "We'll make it right. If your print arrives damaged, or there's a fault, email us a quick photo and we'll send a free replacement or refund you. No need to post the original back.",
            featured: true,
          },
          {
            q: "Can I return it if I change my mind?",
            a: "Because every piece is made to order from your own design, we can't take change-of-mind returns. Preview your print as much as you like before you buy, and if anything is wrong with what arrives, we'll always sort it out.",
          },
          {
            q: "Can I change my order or shipping address after I've paid?",
            a: "Write to us as soon as you can. We can update or cancel an order while it's still in the queue, but once it's gone into production it's locked in and on its way.",
          },
        ],
      },
      {
        title: "Account & privacy",
        items: [
          {
            q: "Do I need an account to try it?",
            a: "No. Build and preview your piece straight away. An account only matters when you want to save your work or export without a watermark.",
            featured: true,
          },
          {
            q: "Is my location data private?",
            a: "Your places are only ever used to render your artwork. We don't sell them or share them with anyone.",
          },
        ],
      },
    ],
  },

  finalCta: {
    headline: "Put your places on the wall.",
    subhead:
      "For your own wall, or for someone you love. Designing is free and takes about five minutes.",
    cta: PRIMARY_CTA,
  },

  footer: {
    tagline: "Fine art maps of the places that matter.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "How it works", href: "/#how-it-works" },
          { label: "Styles", href: "/#styles" },
          { label: "Examples", href: "/#stories" },
          { label: "Pricing", href: "/pricing" },
          { label: "Create a print", href: STUDIO_HREF },
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "FAQ", href: "/faq" },
          { label: "Track an order", href: "/track" },
          { label: "Contact", href: "mailto:hello@pinprint.com" },
        ],
      },
      {
        // Comparison pages. Keep these hrefs in sync with the competitor slugs in
        // lib/compare/competitors.ts (a test asserts they match).
        title: "Compare",
        links: [
          { label: "All comparisons", href: "/compare" },
          { label: "vs Mapiful", href: "/compare/pinprint-vs-mapiful" },
          { label: "vs Grafomap", href: "/compare/pinprint-vs-grafomap" },
          { label: "vs Craft & Oak", href: "/compare/pinprint-vs-craft-and-oak" },
          { label: "vs Positive Prints", href: "/compare/pinprint-vs-positive-prints" },
          { label: "vs Posterhaste", href: "/compare/pinprint-vs-posterhaste" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Privacy", href: "/privacy" },
          { label: "Terms", href: "/terms" },
        ],
      },
    ],
    copyright: "© Pinprint. Every print made to order.",
  },
} as const;
