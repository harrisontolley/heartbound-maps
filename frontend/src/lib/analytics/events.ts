/**
 * Canonical PostHog event names + property shapes for the whole app. Single
 * source of truth so event names never drift between call sites — see
 * docs/integrations/posthog.md for the full taxonomy table and rationale.
 * Server-side events (checkout_completed, order_fulfilled) are defined in
 * backend/src/posthog.ts instead, since they're captured there.
 */

export const ANALYTICS_EVENTS = {
  landingCtaClick: "landing_cta_click",
  faqItemExpand: "faq_item_expand",
  studioStepAdvance: "studio_step_advance",
  lookSelected: "look_selected",
  placeAdded: "place_added",
  sizeSelected: "size_selected",
  frameSelected: "frame_selected",
  addToCart: "add_to_cart",
  mailingListSignup: "mailing_list_signup",
  checkoutStarted: "checkout_started",
  checkoutFailed: "checkout_failed",
  checkoutSuccessViewed: "checkout_success_viewed",
  removeFromCart: "remove_from_cart",
  placeSearchFailed: "place_search_failed",
  orderTrackLookup: "order_track_lookup",
  signedIn: "signed_in",
  freeDesignFormViewed: "free_design_form_viewed",
  freeDesignSubmitted: "free_design_submitted",
  freeDesignSent: "free_design_sent",
  freeDesignFailed: "free_design_failed",
} as const;

export type StudioStepDirection = "next" | "back" | "jump";

export type AnalyticsEventProps = {
  [ANALYTICS_EVENTS.landingCtaClick]: {
    cta_id: string;
    location: string;
    href: string;
  };
  [ANALYTICS_EVENTS.faqItemExpand]: {
    question: string;
    group?: string;
  };
  [ANALYTICS_EVENTS.studioStepAdvance]: {
    from_step: string;
    to_step: string;
    direction: StudioStepDirection;
  };
  [ANALYTICS_EVENTS.lookSelected]: {
    look_id: string;
    template_id: string;
    source: "studio_grid" | "landing_gallery";
  };
  [ANALYTICS_EVENTS.placeAdded]: {
    affiliation_type?: string;
    places_count: number;
    outcome: "home" | "added" | "duplicate";
  };
  [ANALYTICS_EVENTS.sizeSelected]: {
    product_id: string;
    price_cents: number;
  };
  [ANALYTICS_EVENTS.frameSelected]: {
    frame_material: string;
    frame_color: string;
    upcharge_cents: number;
  };
  [ANALYTICS_EVENTS.addToCart]: {
    product_id: string;
    format: string;
    framed: boolean;
    frame_material?: string;
    frame_color?: string;
  };
  [ANALYTICS_EVENTS.mailingListSignup]: {
    reasons: string[];
    has_other_text: boolean;
  };
  [ANALYTICS_EVENTS.checkoutStarted]: {
    cart_item_count: number;
    subtotal_cents: number;
  };
  [ANALYTICS_EVENTS.checkoutFailed]: {
    error_code: string;
  };
  [ANALYTICS_EVENTS.checkoutSuccessViewed]: {
    order_number: string;
    status: string;
  };
  [ANALYTICS_EVENTS.removeFromCart]: {
    product_id: string;
    format: string;
    framed: boolean;
  };
  // Never the raw query text (could be a home address) — only its length.
  [ANALYTICS_EVENTS.placeSearchFailed]: {
    query_length: number;
    reason: "no_results" | "error";
  };
  [ANALYTICS_EVENTS.orderTrackLookup]: {
    outcome: "found" | "not_found" | "rate_limited" | "error";
  };
  [ANALYTICS_EVENTS.signedIn]: Record<string, never>;
  [ANALYTICS_EVENTS.freeDesignFormViewed]: {
    template_id: string;
    places_count: number;
  };
  [ANALYTICS_EVENTS.freeDesignSubmitted]: Record<string, never>;
  [ANALYTICS_EVENTS.freeDesignSent]: Record<string, never>;
  [ANALYTICS_EVENTS.freeDesignFailed]: {
    error: string;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventProps;
