/**
 * Single source of truth for ALL landing-page copy.
 *
 * Everything visible on `/` is authored here so it can be changed in one place.
 * Voice (DESIGN.md): warm-gift premium. Short declaratives with periods.
 * Specifics over adjectives. No em dashes, no exclamation marks, no emoji.
 * Every claim here is verifiable: paper stock, ink type, bearing math, shipping
 * policy. Nothing invented, no fabricated testimonials or press logos.
 */

import { GUARANTEE_NAME } from "@heartbound/shared";

export const STUDIO_HREF = "/studio";
export const PRIMARY_CTA = "Create your print";
/**
 * Name for the existing damage/fault policy (FAQ "Returns & changes" +
 * terms/page.tsx). Reused across buy-decision surfaces and by a later PR.
 * Scope stays exactly what it already was: damaged or flawed prints only, a
 * photo, a free replacement or full refund, nothing to send back.
 * Change-of-mind returns are still excluded because every piece is made to
 * order. Defined in @heartbound/shared (not here) so the backend's order-
 * confirmation email can use the identical name without importing frontend
 * code — re-exported so existing imports of it from this module keep working.
 */
export { GUARANTEE_NAME };

/** A single FAQ entry. `featured` items are surfaced on the landing-page teaser. */
export type FaqItem = {
  q: string;
  a: string;
  featured?: boolean;
  /** Renders an embedded widget below the answer — see FaqItemRow. */
  formId?: "mailing-list-size";
};
/** A category of FAQ entries, rendered as one block on the /faq page. */
export type FaqGroup = { title: string; items: readonly FaqItem[] };

export const copy = {
  brand: {
    name: "Heartbound Maps",
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
      "Set where home is, then add the places you were born, lived, visited, or have family. Heartbound Maps draws an arrow to each one, pointing exactly where it really is, with the true distance beside it. Then we print it on gallery paper and send it to your door.",
    primaryCta: PRIMARY_CTA,
    secondaryCta: "See how it works",
    // Quiet materials line under the CTAs: the upmarket signal is the spec.
    specLine: "Hahnemühle 310gsm · archival giclée · solid oak frames",
    reassurance:
      "See your finished design free, before you pay a cent. Pay only when you're ready for the print, shipped free to your door.",
    media: {
      label: "A warm living room wall above a long oak sideboard",
      aspect: "33 / 14",
      src: "/showcase/scene-hero-bg.png",
      alt: "Warm ivory plaster wall above a long oak sideboard with a vase and books",
    },
    framed: {
      label: "The hero print in its oak frame",
      src: "/showcase/framed-hero.png",
      alt: "A warm-minimal Heartbound Maps of San Francisco in a natural oak frame",
    },
  },

  // Thin hairline strip of verifiable quality signals. Replaces logo bars and
  // star widgets: specifics are the trust currency (DESIGN.md).
  trustLine: {
    items: [
      "Free US shipping",
      "See your design before you buy",
      "Hahnemühle 310gsm paper",
      "Archival giclée inks",
      "Natural oak frames",
      GUARANTEE_NAME,
    ],
  },

  howItWorks: {
    eyebrow: "How it works",
    headline: "Designed in about five minutes. Free until you print.",
    steps: [
      {
        title: "Pick a preset, set your home",
        body: "Start from one of nine designer presets and search for the place you call home. Every arrow and every distance is measured from here. Free to design, no account needed.",
      },
      {
        title: "Add the places that matter",
        body: "The town you were born in. The city where you met. The coast your family still lives on. Tag each one with what it means: born, lived, studied, met, married, family, visited, adventure.",
      },
      {
        title: "See it before you buy",
        body: "We email you a free copy of your exact design at screen resolution, no purchase needed. Ready to make it real? We print it on fine art paper and ship it to your door, shipping on us. Every print includes the full 300 DPI files too.",
      },
    ],
  },

  // The authority section: why the map can be trusted, written for someone
  // who has never seen the product. Pairs with the interactive globe.
  accuracy: {
    eyebrow: "The cartography",
    headline: "Accurate enough to navigate by.",
    body: [
      "A Heartbound Maps is not decorated with random arrows. It is drawn from real coordinates. Each arrow points along the true compass bearing from your home to that place, and the number beside it is the great-circle distance, the actual shortest path over the curve of the earth.",
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
    eyebrow: "Start from a preset",
    headline: "Pick a preset. Make it yours.",
    body: "Nine designer looks, ready to go. Pick one, drop in your places, then change anything you like: colors, labels, pins, sizes. Your places and every bearing stay exactly where they are. Most people go from blank page to finished design in about five minutes.",
    // The look cards themselves come straight from src/lib/looks/looks.ts so
    // the gallery can never drift from what the studio actually ships.
    startHere: "Start here",
  },

  stories: {
    eyebrow: "Made with Heartbound Maps",
    headline: "Every one tells a different story.",
    items: [
      {
        title: "Where it started",
        caption: "Born in Memphis, met in Chicago, still measuring everything from Kansas City.",
        src: "/showcase/story-where-it-started.png",
        alt: "Mid-Century-style Heartbound Maps centered on Kansas City",
      },
      {
        title: "The honeymoon",
        caption: "Married on Rarotonga, home in Auckland before the tan faded.",
        src: "/showcase/story-the-honeymoon.png",
        alt: "Celestial Heartbound Maps centered on Auckland",
      },
      {
        title: "First home",
        caption: "Four cities of rented rooms, then keys of their own in Denver.",
        src: "/showcase/story-first-home.png",
        alt: "Minimal Heartbound Maps centered on Denver",
      },
      {
        title: "Family across oceans",
        caption: "One family, five continents, every arrow pointing to someone loved.",
        src: "/showcase/story-family-across-oceans.png",
        alt: "Atlas-style Heartbound Maps centered on London",
      },
      {
        title: "The year abroad",
        caption: "Twelve months from a flat in Prague, and every arrow is still a story they tell.",
        src: "/showcase/story-the-year-abroad.png",
        alt: "Swiss editorial Heartbound Maps centered on Prague",
      },
      {
        title: "Every house so far",
        caption: "Every front door they have ever called home, measured from Melbourne.",
        src: "/showcase/story-every-house-so-far.png",
        alt: "Topographic Heartbound Maps centered on Melbourne",
      },
    ],
  },

  // The gifting beat: the product's most common purchase is for someone else.
  gift: {
    eyebrow: "The gift",
    headline: "Made to be given.",
    body: [
      "The hardest people to buy for already own everything except this. A Heartbound Maps is their story, drawn from real coordinates: where they started, where they went, where home is now.",
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
      label: "A framed Heartbound Maps leaning on a wall beside wrapping paper",
      aspect: "3 / 2",
      src: "/showcase/scene-gift.png",
      alt: "Framed celestial Heartbound Maps of Auckland leaning against an ivory wall next to kraft wrapping paper and twine",
    },
  },

  pricingPreview: {
    eyebrow: "Founding prices",
    headline: "One price. Everything is already included.",
    body: `Every print bundles the digital files and a few keepsake extras, with free US shipping and the ${GUARANTEE_NAME}, so the price you see is the whole story.`,
    link: { label: "See pricing and sizes", href: "/pricing" },
  },

  // The itemized "everything included" stack that replaced the struck-through
  // sale price: every real, already-shipping bonus named plainly instead of a
  // fake discount. `id: "digital"` is the one line ValueStack.tsx appends a
  // dollar figure to (sourced from DIGITAL_PRICE_CENTS, never hardcoded here)
  // because it's the only bonus genuinely sold on its own. No Reveal Card.
  valueStack: {
    eyebrow: "Every print includes",
    items: [
      {
        id: "print",
        title: "The print itself",
        body: "Loose prints on Hahnemühle German Etching, a heavily textured 310gsm archival paper. Framed prints on smooth 300gsm cotton rag behind glass. Both printed with archival pigment inks and checked by hand before they ship.",
        href: undefined,
      },
      {
        id: "digital",
        title: "The 300 DPI print files",
        body: "A print-ready PNG at full 300 DPI resolution, plus a scalable SVG you can print yourself at any size.",
        href: undefined,
      },
      {
        id: "wallpapers",
        title: "Phone and desktop wallpapers",
        body: "Your exact design, rendered again to fit a phone lock screen and a desktop background.",
        href: undefined,
      },
      {
        id: "story",
        title: "The Story Behind Your Coordinates",
        body: "A short written keepsake covering the places, bearings, and distances in your design, emailed with your order.",
        href: undefined,
      },
      {
        id: "hanging-guide",
        title: "The hanging and styling guide",
        body: "Notes on hanging height, wall placement, and choosing between an oak or metal frame.",
        href: "/hanging-guide",
      },
      {
        id: "shipping",
        title: "Free US shipping",
        body: "No minimum order and no surprise fee at checkout.",
        href: undefined,
      },
      {
        id: "guarantee",
        title: GUARANTEE_NAME,
        body: "Arrives damaged or flawed, and we'll replace it free or refund you in full.",
        href: "/guarantee",
      },
    ],
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
      metaTitle: "FAQ | Heartbound Maps",
      metaDescription:
        "Answers about designing your Heartbound Maps, sizes and framing, shipping and delivery, returns, and your account.",
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
            a: "Yes. Switch between all nine looks at any time. Your home and places stay exactly where they are.",
          },
          {
            q: "Can I see exactly what I'll get before I pay?",
            a: "Yes. The studio preview is rendered by the same engine that prints your piece, so what you see is exactly what arrives, down to the arrow and the label. Nothing changes at checkout.",
          },
        ],
      },
      {
        title: "Sizes, materials & framing",
        items: [
          {
            q: "What sizes can I order?",
            a: "Three portrait sizes: 12 by 18, 16 by 24, and 24 by 36 inches. The artwork is vector, not a flat image, so it's rendered fresh for your order at 300 DPI, the same resolution standard used for gallery and museum prints, and every hairline and label stays sharp at any size.",
            featured: true,
          },
          {
            q: "How is each print made?",
            a: "Made to order the moment you buy: archival pigment inks rated to hold their color for decades, on Hahnemühle German Etching, a heavily textured 310gsm fine art paper, not poster-shop stock. Every piece is checked by hand before it ships.",
          },
          {
            q: "Can I get it framed?",
            a: "Yes. Choose a ready-to-hang frame in the studio: oak or metal, in four colors each (natural, black, white, and walnut oak; or white, black, silver, and gold metal). Every frame is solid, glass-fronted, and arrives wired straight on the wall, no assembly needed. Framed prints use smooth 300gsm cotton rag paper, so there's no compromise on the paper.",
          },
          {
            q: "What's the difference between the frame colors?",
            a: "Only the look. Every color, in both oak and metal, is the same solid frame, the same glass front, and the same price. Pick whichever suits the wall it's going on.",
          },
          {
            q: "Can I just buy the digital file?",
            a: "Yes, for $19. It includes a print-ready PNG at full 300 DPI resolution plus a scalable SVG you can print yourself, at any size, from any print shop. Every physical print order includes both digital files too, at no extra cost.",
          },
          {
            q: "We don't have your size, material, or map style?",
            a: "We're always adding new sizes, materials, and map styles based on what people ask for. Tell us what you're after and we'll email you the moment it ships.",
            formId: "mailing-list-size",
          },
        ],
      },
      {
        title: "Shipping & delivery",
        items: [
          {
            q: "How much does shipping cost?",
            a: "Nothing. Every order ships free across the United States, no minimum order and no surprise fee at checkout. The price you see when you check out is the price you pay.",
            featured: true,
          },
          {
            // These figures are single-sourced as PRODUCTION_BUSINESS_DAYS
            // and TOTAL_BUSINESS_DAYS in lib/commerce/deliveryEstimate.ts,
            // which also drives the live "Arrives [date] to [date]" estimate
            // shown at the buy decision (BuyBar, cart, studio review). Update
            // both places together if the figures ever change.
            q: "When will my print arrive?",
            a: "Your print is made and shipped within 2 to 3 business days, and arrives within 5 to 10 business days total. You'll get a tracking link by email the moment it's on its way.",
          },
          {
            q: "Do you ship outside the United States?",
            a: "Not yet. For now we ship to addresses within the United States only. We're working on more countries.",
          },
        ],
      },
      {
        title: "Returns & changes",
        items: [
          {
            q: "What if my print arrives damaged or there's a fault?",
            a: "We'll always make it right. If your print arrives damaged, or there's a fault, send us a quick photo and we'll ship a free replacement or refund you in full. No need to return the original.",
            featured: true,
          },
          {
            q: "Can I return it if I change my mind?",
            a: "Because every piece is made to order from your own design, we can't accept change-of-mind returns once it's gone into production. Preview your design as many times as you like before you buy, and if anything about the piece itself is wrong when it arrives, we'll always make it right.",
          },
          {
            q: "Can I change my order or shipping address after I've paid?",
            a: "Write to us as soon as you can. We can update or cancel an order while it's still queued for production, but once it's being printed it's locked in and on its way.",
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
            a: "Your home and places are only ever used to render your own artwork. We never sell them, share them with third parties, or use them for anything else.",
          },
          {
            q: "Is checkout secure?",
            a: "Yes. Checkout is handled by Stripe, the same payment processor used by major retailers worldwide. We never see or store your card details.",
          },
        ],
      },
    ],
  },

  // The named guarantee page. Scope is exactly the existing damage/fault
  // policy already promised in the FAQ "Returns & changes" group and
  // terms/page.tsx: this only names it and gives it a dedicated place to
  // link to. Invent no new promises here.
  guarantee: {
    name: GUARANTEE_NAME,
    eyebrow: "Our promise",
    headline: GUARANTEE_NAME,
    subhead: "We'll always make it right.",
    body: [
      "If your print arrives damaged, or there's a fault, send us a quick photo and we'll ship a free replacement or refund you in full. No need to return the original.",
      "Because every piece is made to order from your own design, we can't accept change-of-mind returns once it's gone into production. Preview your design as many times as you like before you buy, and if anything about the piece itself is wrong when it arrives, we'll always make it right.",
    ],
    exclusions:
      "Change of mind isn't covered. Every piece is made to order from your own design, so once it's in production we can't accept a return for that reason alone.",
    page: {
      metaTitle: `${GUARANTEE_NAME} | Heartbound Maps`,
      metaDescription:
        "If your Heartbound Maps arrives damaged or with a fault, we'll ship a free replacement or refund you in full. No need to return the original.",
    },
  },

  // Static hanging/care guide, linked from the post-payment digital-delivery
  // email and the footer. Practical, verifiable notes only: standard gallery
  // hanging height, sensible wall placement, the two frame materials we
  // actually offer, and basic archival paper care.
  hangingGuide: {
    eyebrow: "After it arrives",
    headline: "Hanging and care guide",
    subhead:
      "A few notes on getting your print on the wall, and keeping it looking its best for years.",
    sections: [
      {
        title: "Hanging height",
        body: "Center your print about 57 inches from the floor to the middle of the piece. That's eye level for most standing viewers, and the height galleries use as a rule of thumb. Over a sofa or console, leave 6 to 8 inches between the furniture and the bottom edge of the frame.",
      },
      {
        title: "Wall placement",
        body: "Pick a wall you pass often, not just one you sit across from. A hallway, a stairwell, or the wall behind a desk keeps the piece part of daily life rather than background decoration. Keep it out of direct sun and away from heat vents, since both fade paper over time.",
      },
      {
        title: "Oak vs metal frame styling",
        body: "The oak frame is warmer and reads well in a room with wood furniture, wool, or linen. The metal frame is cooler and cleaner, and suits a room with more glass, stone, or black hardware. Both use the same fine art print and the same ready-to-hang hardware, so the choice is about the room, not the piece inside.",
      },
      {
        title: "Caring for the paper",
        body: "Keep your print out of direct sunlight and away from damp rooms such as bathrooms. Dust the glass, or the paper edge on a loose print, with a dry, soft cloth. Don't use glass cleaner directly on an unframed print, and handle it by the edges to keep finger oils off the surface.",
      },
    ],
    page: {
      metaTitle: "Hanging and Care Guide | Heartbound Maps",
      metaDescription:
        "How to hang and care for your Heartbound Maps fine art print: hanging height, wall placement, oak vs metal frame styling, and paper care.",
    },
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
          { label: "Guarantee", href: "/guarantee" },
          { label: "Hanging and care guide", href: "/hanging-guide" },
          { label: "Track an order", href: "/track" },
          { label: "Contact", href: "mailto:hello@heartboundmaps.com" },
        ],
      },
      {
        // Comparison pages. Keep these hrefs in sync with the competitor slugs in
        // lib/compare/competitors.ts (a test asserts they match).
        title: "Compare",
        links: [
          { label: "All comparisons", href: "/compare" },
          { label: "vs Mapiful", href: "/compare/heartbound-maps-vs-mapiful" },
          { label: "vs Grafomap", href: "/compare/heartbound-maps-vs-grafomap" },
          { label: "vs Craft & Oak", href: "/compare/heartbound-maps-vs-craft-and-oak" },
          { label: "vs Positive Prints", href: "/compare/heartbound-maps-vs-positive-prints" },
          { label: "vs Posterhaste", href: "/compare/heartbound-maps-vs-posterhaste" },
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
    copyright: "© Heartbound Maps. Every print made to order.",
  },
} as const;
