/**
 * Single source of truth for ALL landing-page copy.
 *
 * Everything visible on `/` is authored here so it can be replaced in one place
 * before launch — no string hunting across components. All values are placeholder
 * marketing copy. Written to read like a person wrote it: short and long sentences
 * mixed, specifics over adjectives, no "not only… but also", no filler triads, no
 * buzzwords. Swap the words, keep the shape.
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
    // Absolute hrefs (`/#section`) so the shared header works from any route,
    // not just the landing page. FAQ points at the dedicated page.
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Styles", href: "/#features" },
      { label: "Examples", href: "/#showcase" },
      { label: "FAQ", href: "/faq" },
    ],
  },

  hero: {
    // Eyebrow names the category in plain words so a cold visitor knows what
    // this is before reading anything else.
    eyebrow: "Custom fine art map",
    // Emotional outcome in ≤12 words; the subhead carries the mechanic.
    headline: "A map of everywhere that made you you.",
    subhead:
      "Set where home is, then add the places you were born, lived, visited, or have family. Pinprint draws an arrow to each one in its true compass direction, with the real distance beside it — ready to frame and hang.",
    primaryCta: PRIMARY_CTA,
    secondaryCta: "See how it works",
    // Small line under the CTAs — preserves the conversion value of the old
    // pricing section (people need to know it costs nothing to start).
    reassurance: "Free to design — pay only when you print.",
    media: {
      label: "Hero — a finished Pinprint print, framed and hung above a reading chair",
      aspect: "16 / 9",
      src: "/showcase/poster_on_wall.png",
      alt: "Framed minimal compass print centered on Brighton, hung on a wall above a green armchair",
    },
  },

  socialProof: {
    label: "Printed and framed by people in 40+ countries",
    logos: [
      "Press / partner logo 1",
      "Press / partner logo 2",
      "Press / partner logo 3",
      "Press / partner logo 4",
      "Press / partner logo 5",
    ],
  },

  problem: {
    eyebrow: "The problem",
    headline: "Your places live in a list. They belong on a wall.",
    body: [
      "The towns you grew up in, the city you fell in love in, the country your family came from — they're scattered across old photos and your memory.",
      "A pin map gets close, but the pins crowd together and the meaning gets lost. You want one frame that says where you've been and where home is, without the clutter.",
    ],
  },

  features: {
    eyebrow: "Pick a look",
    headline: "Four styles. The same places, drawn true.",
    items: [
      {
        title: "Vintage cartography",
        body: "Aged paper, hand-set serif labels, a compass rose. The classic look for a hallway.",
        media: {
          label: "Style — vintage cartography",
          aspect: "2 / 3",
          src: "/showcase/feature-vintage.png",
          alt: "Vintage cartography print centered on Rome",
        },
      },
      {
        title: "Minimal compass",
        body: "Clean lines, generous space, one accent. For modern rooms.",
        media: {
          label: "Style — minimal compass",
          aspect: "2 / 3",
          src: "/showcase/feature-minimal.png",
          alt: "Minimal compass print centered on Copenhagen",
        },
      },
      {
        title: "Bold modern",
        body: "Heavy geometric type and high contrast. A statement piece.",
        media: {
          label: "Style — bold modern",
          aspect: "2 / 3",
          src: "/showcase/feature-bold.png",
          alt: "Bold modern print centered on Los Angeles",
        },
      },
      {
        title: "Night sky",
        body: "Deep ink background, places glowing like stars over a dark map.",
        media: {
          label: "Style — night sky",
          aspect: "2 / 3",
          src: "/showcase/feature-night-sky.png",
          alt: "Night sky print centered on Reykjavik with places glowing like stars",
        },
      },
    ],
    layoutEngine: {
      title: "Forty places. No overlapping labels.",
      body: "Add as many places as you like and the names still don't collide. Our layout engine nudges every label into clear space — the arrows never move, so each bearing stays true — and a crowded map stays readable at any print size.",
      media: { label: "Before / after — overlapping pins vs. Pinprint's resolved labels", aspect: "16 / 10" },
    },
    exportCard: {
      title: "Export ready to print",
      body: "Download a crisp SVG for any size, or a print-quality PNG at full resolution. No watermarks on paid plans.",
      media: {
        label: "Export formats — SVG + print-quality PNG",
        aspect: "2 / 3",
        src: "/showcase/exportcard-export-formats.png",
        alt: "Bold modern print centered on Amsterdam",
      },
    },
  },

  howItWorks: {
    eyebrow: "How it works",
    headline: "Three steps to a finished print.",
    steps: [
      {
        title: "Set your home",
        body: "Search for a place or drop a pin on the map. Everything is measured from here.",
        media: { label: "Step 1 — picking home on the map", aspect: "16 / 10" },
      },
      {
        title: "Add your places",
        body: "Tag each one as born, lived, visited, or family. Add as many as you like.",
        media: { label: "Step 2 — adding tagged places", aspect: "16 / 10" },
      },
      {
        title: "Style and export",
        body: "Switch between styles, tweak the details, then download to print or frame.",
        media: { label: "Step 3 — styling and exporting", aspect: "16 / 10" },
      },
    ],
  },

  globe: {
    eyebrow: "How to read it",
    headline: "Home in the middle. Everywhere else, drawn true.",
    body: "Here's what you're looking at. Your home sits at the center. Every other place gets an arrow pointing in its real compass direction, with the great-circle distance — the actual shortest path across the globe — printed beside it. Search your own home town and watch every reading change.",
    // Three short labels that decode a single piece for a first-time visitor.
    annotations: [
      { term: "Home", def: "The center point. Everything is measured from here." },
      { term: "The arrow", def: "Points in that place's true compass bearing from home." },
      { term: "The number", def: "The real distance, as the crow flies." },
    ],
    tryLabel: "Try it — measure from your home town",
    posterLabel: "The print it makes",
    posterCta: "Make your own",
  },

  showcase: {
    eyebrow: "Made with Pinprint",
    headline: "A few we'd hang ourselves.",
    items: [
      {
        label: "Example — a transatlantic family",
        aspect: "2 / 3",
        src: "/showcase/showcase-transatlantic-family.png",
        alt: "Sea-atlas print of a transatlantic family, centered on London",
      },
      {
        label: "Example — a decade of moves",
        aspect: "2 / 3",
        src: "/showcase/showcase-decade-of-moves.png",
        alt: "Topographic print of a decade of moves, centered on Denver",
      },
      {
        label: "Example — student years abroad",
        aspect: "2 / 3",
        src: "/showcase/showcase-student-years-abroad.png",
        alt: "Blueprint print of student years abroad, centered on Manchester",
      },
      {
        label: "Example — coastal hometowns",
        aspect: "2 / 3",
        src: "/showcase/showcase-coastal-hometowns.png",
        alt: "Minimal compass print of coastal hometowns, centered on Brighton",
      },
      {
        label: "Example — three continents",
        aspect: "2 / 3",
        src: "/showcase/lady_holding_poster.png",
        alt: "A person holding a framed night-sky print centered on Singapore, spanning three continents",
      },
      {
        label: "Example — one long road trip",
        aspect: "2 / 3",
        src: "/showcase/showcase-one-long-road-trip.png",
        alt: "Art deco print of one long road trip, centered on Chicago",
      },
    ],
  },

  testimonials: {
    eyebrow: "What people say",
    headline: "The wall gift people actually keep.",
    // NOTE: illustrative sample quotes with placeholder attributions — replace
    // with real, permissioned customer testimonials before launch.
    items: [
      {
        quote:
          "I made one for my mum with every house we'd lived in. She cried, then asked me to make one for my aunt.",
        name: "Hannah M.",
        role: "Gift for her mum · Bristol",
      },
      {
        quote:
          "Forty-one places and not a single label overlapping. I don't know how it does it, but it looks printed by hand.",
        name: "Daniel O.",
        role: "Travel map · Toronto",
      },
      {
        quote:
          "Took five minutes. It's been on my wall for a year and people still ask about it.",
        name: "Priya R.",
        role: "Home office · Manchester",
      },
    ],
  },

  faq: {
    // Landing-page teaser heading. Only the `featured` items below appear here;
    // the full list lives on the dedicated /faq page (grouped by category).
    eyebrow: "Questions",
    headline: "Good to know.",
    seeAll: { label: "See all questions", href: "/faq" },
    // Heading + metadata for the dedicated /faq page.
    page: {
      eyebrow: "FAQ",
      headline: "Everything you might want to know.",
      intro:
        "Designing your print, sizes and framing, shipping, and what happens if something isn't right — it's all here. Still stuck? Get in touch and we'll help.",
      metaTitle: "FAQ — Pinprint",
      metaDescription:
        "Answers about designing your Pinprint print, sizes and framing, shipping and delivery, returns, and your account.",
    },
    // The full FAQ, grouped by category. `featured: true` marks the questions
    // surfaced on the landing page (the biggest pre-purchase objections); they
    // flatten in group order into: how it works → sizes → delivery → damaged → account.
    groups: [
      {
        title: "Designing your print",
        items: [
          {
            q: "How are the arrows and distances worked out?",
            a: "Each arrow points along the true compass bearing from your home to the place, and the distance is the great-circle distance — the real shortest path across the globe.",
            featured: true,
          },
          {
            q: "How many places can I add?",
            a: "As many as you like. The layout engine keeps labels from overlapping, even on a crowded map.",
          },
          {
            q: "Can I change the design after I've added places?",
            a: "Yes. Switch between all four designs at any time — your home and places stay exactly where they are.",
          },
        ],
      },
      {
        title: "Sizes, materials & framing",
        items: [
          {
            q: "What sizes can I order?",
            a: "Three portrait sizes: 12×18, 16×24, and 24×36 inches. The artwork is drawn as vector graphics, so every size prints razor-sharp.",
            featured: true,
          },
          {
            q: "How is each print made?",
            a: "Made to order with archival pigment inks that resist fading for decades, printed the moment you order — checked by hand, never mass-produced. Loose prints are on Hahnemühle German Etching 310gsm, a heavily textured fine-art paper chosen for the way it feels in your hands. Framed prints use 300gsm 100% cotton-rag paper — smooth and clean behind glass — with a premium natural-oak ready-to-hang frame.",
          },
          {
            q: "Can I get it framed?",
            a: "Yes. Add a premium natural-oak ready-to-hang frame at checkout: solid wood, glass front, arrives wired so it goes straight on the wall. Framed prints use 300gsm 100% cotton-rag paper — smooth and clean behind glass — no compromise on the paper.",
          },
          {
            q: "Can I just buy the digital file?",
            a: "Yes. Choose the digital download for a print-ready PNG and a scalable SVG you can print yourself, at any size. Every printed order includes the digital files too.",
          },
        ],
      },
      {
        title: "Shipping & delivery",
        items: [
          {
            q: "When will my print arrive?",
            a: "Most orders arrive within 5–10 business days. Your print is made and shipped within 2–3 business days, and you'll get a tracking link by email the moment it's on its way.",
            featured: true,
          },
          {
            q: "Where do you ship, and how much does it cost?",
            a: "We currently ship anywhere in the United States, and shipping is free — the price you see is the price you pay, with nothing added at checkout.",
          },
        ],
      },
      {
        title: "Returns & changes",
        items: [
          {
            q: "What if my print arrives damaged or there's a fault?",
            a: "We'll make it right. If your print arrives damaged, or there's a fault, email us a quick photo and we'll send a free replacement or refund you — no need to post the original back.",
            featured: true,
          },
          {
            q: "Can I return it if I change my mind?",
            a: "Because every piece is made to order from your own design, we can't take change-of-mind returns. Preview your print as much as you like before you buy — and if anything's wrong with what arrives, we'll always sort it out.",
          },
          {
            q: "Can I change my order or shipping address after I've paid?",
            a: "Get in touch as soon as you can. We can update or cancel an order while it's still in the queue, but once it's gone into production it's locked in and on its way.",
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
            a: "Your places are only ever used to render your artwork — we don't sell them or share them with anyone.",
          },
        ],
      },
    ],
  },

  finalCta: {
    headline: "Put your places on the wall.",
    subhead:
      "Design your first piece in a few minutes. Free to design — pay only when you print.",
    cta: PRIMARY_CTA,
  },

  footer: {
    tagline: "Fine art maps of the places that matter.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "How it works", href: "/#how-it-works" },
          { label: "Styles", href: "/#features" },
          { label: "Examples", href: "/#showcase" },
          { label: "Create a print", href: STUDIO_HREF },
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "FAQ", href: "/faq" },
          { label: "Print guide", href: "#" },
          { label: "Gift ideas", href: "#" },
          { label: "Contact", href: "#" },
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
          { label: "Privacy", href: "#" },
          { label: "Terms", href: "#" },
          { label: "Licenses", href: "#" },
        ],
      },
    ],
    copyright: "© Pinprint. Placeholder footer — replace links before launch.",
  },
} as const;
