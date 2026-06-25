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
      label: "Hero — a finished poster: home in the center, labeled arrows fanning out to each place with distances",
      caption: "Replace with a high-res render of a real poster (vintage-cartography style).",
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
        media: { label: "Poster style — vintage-cartography", aspect: "4 / 5" },
      },
      {
        title: "Minimal compass",
        body: "Clean lines, generous space, one accent. For modern rooms.",
        media: { label: "Poster style — minimal-compass", aspect: "4 / 5" },
      },
      {
        title: "Bold modern",
        body: "Heavy geometric type and high contrast. A statement piece.",
        media: { label: "Poster style — bold-modern", aspect: "4 / 5" },
      },
      {
        title: "Night sky",
        body: "Deep ink background, places glowing like stars over a dark map.",
        media: { label: "Poster style — night-sky", aspect: "4 / 5" },
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
      media: { label: "Export formats — SVG + print-quality PNG", aspect: "16 / 10" },
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
      { label: "Example poster — a transatlantic family", aspect: "4 / 5" },
      { label: "Example poster — a decade of moves", aspect: "4 / 5" },
      { label: "Example poster — student years abroad", aspect: "4 / 5" },
      { label: "Example poster — coastal hometowns", aspect: "4 / 5" },
      { label: "Example poster — three continents", aspect: "4 / 5" },
      { label: "Example poster — one long road trip", aspect: "4 / 5" },
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
        price: "£0",
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
        price: "£12",
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
        price: "£29",
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
        q: "What sizes can I print?",
        a: "The SVG export scales to any size without losing sharpness, from A4 to large-format. The PNG export is rendered at full print resolution.",
      },
      {
        q: "How many places can I add?",
        a: "As many as you want. The layout engine keeps labels from overlapping even on dense maps.",
      },
      {
        q: "Do I need an account to try it?",
        a: "No. You can build and preview a poster straight away. An account is only needed to save your work and export without a watermark.",
      },
      {
        q: "Can I change the style after I've added places?",
        a: "Yes. Switch between all four styles at any time — your places and home stay put.",
      },
      {
        q: "Is my location data private?",
        a: "Your places are used to render your poster and nothing else. Placeholder — confirm against the real privacy policy before launch.",
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
