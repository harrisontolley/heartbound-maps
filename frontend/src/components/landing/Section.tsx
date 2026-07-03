import type { ReactNode } from "react";

/**
 * Band wrapper enforcing the editorial rhythm from DESIGN.md: 96px vertical
 * padding on desktop (64px on mobile for denser scroll), 1200px max content
 * width, consistent gutters. Optionally alternates to the soft canvas tone.
 */

type Props = {
  id?: string;
  tone?: "canvas" | "soft";
  /** Remove the max-width container (for full-bleed bands that center their own content). */
  bleed?: boolean;
  className?: string;
  children: ReactNode;
};

export function Section({
  id,
  tone = "canvas",
  bleed = false,
  className = "",
  children,
}: Props) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden py-16 md:py-24 ${
        tone === "soft" ? "bg-canvas-soft" : "bg-canvas"
      } ${className}`}
    >
      <div className={bleed ? "relative" : "container-page relative"}>
        {children}
      </div>
    </section>
  );
}
