"use client";

import { useEffect, useState } from "react";
import { LinkButton } from "./LinkButton";
import { copy, STUDIO_HREF } from "./copy";

/**
 * Thumb-reach primary CTA for phones: a fixed bottom bar that slides in once
 * the hero (with its own CTA) scrolls out, and slides away again when the
 * FinalCTA band or footer is on screen — it never doubles an already-visible
 * "Create your poster". Fixed positioning keeps it out of layout (no CLS);
 * while hidden it's inert and aria-hidden so it never traps focus or reads
 * aloud. z-40 sits beneath the site header and mobile menu (z-50).
 */
const SENTINEL_IDS = ["top", "final-cta", "site-footer"];

export function MobileCtaBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const targets = SENTINEL_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;

    // Show the bar only while NONE of the sentinels intersect the viewport.
    const intersecting = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        intersecting.set(entry.target, entry.isIntersecting);
      }
      setVisible(![...intersecting.values()].some(Boolean));
    });
    for (const el of targets) io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-canvas/95 backdrop-blur transition-transform duration-300 motion-reduce:transition-none md:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <LinkButton
          href={STUDIO_HREF}
          variant="primary"
          size="md"
          trackId="mobile_cta_bar"
          trackLocation="mobile_cta_bar"
          className="w-full"
        >
          {copy.hero.primaryCta}
        </LinkButton>
      </div>
    </div>
  );
}
