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
export const PRIMARY_CTA = "Create your poster";

export const copy = {
  brand: {
    name: "Pinprint",
  },

  nav: {
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },

  hero: {
    eyebrow: "Poster maps of the places that matter",
    // [Outcome] without [pain] — landing-page-design headline formula.
    headline: "Every place you love, pointed to from home.",
    subhead:
      "Pick where home is. Add the places you were born, lived, visited, or have family. Pinprint draws an arrow to each one in its true compass direction, with the real distance beside it — ready to print and hang.",
    primaryCta: PRIMARY_CTA,
    secondaryCta: "See how it works",
    media: {
      label: "Hero — a finished Pinprint poster, framed and hung above a reading chair",
      aspect: "16 / 9",
      src: "/showcase/poster_on_wall.png",
      alt: "Framed minimal compass poster centered on Brighton, hung on a wall above a green armchair",
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
    eyebrow: "What you get",
    headline: "One poster. Every tie to a place, drawn true.",
    items: [
      {
        title: "Vintage cartography",
        body: "Aged paper, hand-set serif labels, a compass rose. The classic look for a hallway.",
        media: {
          label: "Poster style — vintage-cartography",
          aspect: "2 / 3",
          src: "/showcase/feature-vintage.png",
          alt: "Vintage cartography poster centered on Rome",
        },
      },
      {
        title: "Minimal compass",
        body: "Clean lines, generous space, one accent. For modern rooms.",
        media: {
          label: "Poster style — minimal-compass",
          aspect: "2 / 3",
          src: "/showcase/feature-minimal.png",
          alt: "Minimal compass poster centered on Copenhagen",
        },
      },
      {
        title: "Bold modern",
        body: "Heavy geometric type and high contrast. A statement piece.",
        media: {
          label: "Poster style — bold-modern",
          aspect: "2 / 3",
          src: "/showcase/feature-bold.png",
          alt: "Bold modern poster centered on Los Angeles",
        },
      },
      {
        title: "Night sky",
        body: "Deep ink background, places glowing like stars over a dark map.",
        media: {
          label: "Poster style — night-sky",
          aspect: "2 / 3",
          src: "/showcase/feature-night-sky.png",
          alt: "Night sky poster centered on Reykjavik with places glowing like stars",
        },
      },
    ],
    layoutEngine: {
      title: "Labels that never collide",
      body: "Add forty places and the names still don't overlap. Our layout engine nudges every label into clear space, so a crowded map stays readable at any print size.",
      media: { label: "Before / after — overlapping pins vs. Pinprint's resolved labels", aspect: "16 / 10" },
    },
    exportCard: {
      title: "Export ready to print",
      body: "Download a crisp SVG for any size, or a print-quality PNG at full resolution. No watermarks on paid plans.",
      media: {
        label: "Export formats — SVG + print-quality PNG",
        aspect: "2 / 3",
        src: "/showcase/exportcard-export-formats.png",
        alt: "Bold modern poster centered on Amsterdam",
      },
    },
  },

  howItWorks: {
    eyebrow: "How it works",
    headline: "Three steps to a finished poster.",
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

  showcase: {
    eyebrow: "Made with Pinprint",
    headline: "A few we'd hang ourselves.",
    items: [
      {
        label: "Example poster — a transatlantic family",
        aspect: "2 / 3",
        src: "/showcase/showcase-transatlantic-family.png",
        alt: "Sea-atlas poster of a transatlantic family, centered on London",
      },
      {
        label: "Example poster — a decade of moves",
        aspect: "2 / 3",
        src: "/showcase/showcase-decade-of-moves.png",
        alt: "Topographic poster of a decade of moves, centered on Denver",
      },
      {
        label: "Example poster — student years abroad",
        aspect: "2 / 3",
        src: "/showcase/showcase-student-years-abroad.png",
        alt: "Blueprint poster of student years abroad, centered on Manchester",
      },
      {
        label: "Example poster — coastal hometowns",
        aspect: "2 / 3",
        src: "/showcase/showcase-coastal-hometowns.png",
        alt: "Minimal compass poster of coastal hometowns, centered on Brighton",
      },
      {
        label: "Example poster — three continents",
        aspect: "2 / 3",
        src: "/showcase/lady_holding_poster.png",
        alt: "A person holding a framed night-sky poster centered on Singapore, spanning three continents",
      },
      {
        label: "Example poster — one long road trip",
        aspect: "2 / 3",
        src: "/showcase/showcase-one-long-road-trip.png",
        alt: "Art deco poster of one long road trip, centered on Chicago",
      },
    ],
  },

  testimonials: {
    eyebrow: "What people say",
    headline: "The wall gift people actually keep.",
    items: [
      {
        quote:
          "I made one for my mum with every house we'd lived in. She cried, then asked me to make one for my aunt.",
        name: "Reviewer name",
        role: "Role / city placeholder",
      },
      {
        quote:
          "Forty-one places and not a single label overlapping. I don't know how it does it, but it looks printed by hand.",
        name: "Reviewer name",
        role: "Role / city placeholder",
      },
      {
        quote:
          "Took five minutes. It's been on my wall for a year and people still ask about it.",
        name: "Reviewer name",
        role: "Role / city placeholder",
      },
    ],
  },

  pricing: {
    eyebrow: "Pricing",
    headline: "Start free. Pay when you print.",
    note: "Placeholder pricing — replace amounts and limits before launch.",
    tiers: [
      {
        name: "Free",
        price: "$0",
        cadence: "forever",
        summary: "Design and preview as much as you want.",
        features: [
          "Every poster style",
          "Unlimited places",
          "Watermarked PNG preview",
          "Save up to 3 posters",
        ],
        cta: "Start free",
        featured: false,
      },
      {
        name: "Maker",
        price: "$12",
        cadence: "one-off, per poster",
        summary: "One poster, print-ready, no watermark.",
        features: [
          "Everything in Free",
          "Print-quality PNG + SVG",
          "No watermark",
          "Custom title and legend",
        ],
        cta: PRIMARY_CTA,
        featured: true,
      },
      {
        name: "Studio",
        price: "$29",
        cadence: "per year",
        summary: "For makers and gift-givers who do this often.",
        features: [
          "Everything in Maker",
          "Unlimited print-ready exports",
          "Early access to new styles",
          "Priority support",
        ],
        cta: "Go Studio",
        featured: false,
      },
    ],
  },

  faq: {
    eyebrow: "Questions",
    headline: "Good to know.",
    items: [
      {
        q: "How are the arrows and distances worked out?",
        a: "Each arrow points along the true compass bearing from your home to the place, and the distance is the great-circle distance — the real shortest path across the globe.",
      },
      {
        q: "How many places can I add?",
        a: "As many as you like. The layout engine keeps labels from overlapping, even on a crowded map.",
      },
      {
        q: "Can I change the design after I've added places?",
        a: "Yes. Switch between all four designs at any time — your home and places stay exactly where they are.",
      },
      {
        q: "What sizes can I order?",
        a: "Three portrait sizes: 12×18, 16×24, and 24×36 inches. The artwork is drawn as vector graphics, so every size prints razor-sharp.",
      },
      {
        q: "How are the posters made?",
        a: "Each poster is printed to order on heavyweight matte poster paper and checked by hand before it ships. Nothing is mass-produced — your print is made the moment you order it.",
      },
      {
        q: "Can I get it framed?",
        a: "Yes. Add a ready-to-hang frame at checkout: solid wood with a glass front, delivered already wired so it goes straight on the wall.",
      },
      {
        q: "Can I just buy the digital file?",
        a: "Yes. Choose the digital download for a print-ready PNG and a scalable SVG you can print yourself, at any size. Every printed order includes the digital files too.",
      },
      {
        q: "When will my poster arrive?",
        a: "Most orders arrive within 5–10 business days. Your poster is printed and shipped within 2–3 business days, and you'll get a tracking link by email the moment it's on its way.",
      },
      {
        q: "Where do you ship, and how much does it cost?",
        a: "We currently ship anywhere in the United States, and shipping is free — the price you see is the price you pay, with nothing added at checkout.",
      },
      {
        q: "What if my poster arrives damaged or there's a printing problem?",
        a: "We'll make it right. If your poster turns up damaged, or there's a fault with the print, email us a quick photo and we'll send a free replacement or refund you — no need to post the original back.",
      },
      {
        q: "Can I return it if I change my mind?",
        a: "Because every poster is made to order from your own design, we can't take change-of-mind returns. Preview your poster as much as you like before you buy — and if anything's wrong with what arrives, we'll always sort it out.",
      },
      {
        q: "Can I change my order or shipping address after I've paid?",
        a: "Get in touch as soon as you can. We can update or cancel an order while it's still in the queue, but once it's gone into production it's locked in and on its way.",
      },
      {
        q: "Do I need an account to try it?",
        a: "No. Build and preview your poster straight away. An account only matters when you want to save your work or export without a watermark.",
      },
      {
        q: "Is my location data private?",
        a: "Your places are only ever used to render your poster — we don't sell them or share them with anyone.",
      },
    ],
  },

  finalCta: {
    headline: "Put your places on the wall.",
    subhead: "Build your first poster in a few minutes. Free to start.",
    cta: PRIMARY_CTA,
  },

  footer: {
    tagline: "Poster maps of the places that matter.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "Features", href: "#features" },
          { label: "How it works", href: "#how-it-works" },
          { label: "Pricing", href: "#pricing" },
          { label: "Create a poster", href: STUDIO_HREF },
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "FAQ", href: "#faq" },
          { label: "Print guide", href: "#" },
          { label: "Gift ideas", href: "#" },
          { label: "Contact", href: "#" },
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
