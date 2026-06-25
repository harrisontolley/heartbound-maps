import type { ReactNode } from "react";
import { GradientOrbs } from "@/components/ui/GradientOrbs";

/**
 * Band wrapper enforcing the editorial rhythm from DESIGN.md: 96px vertical
 * padding, 1200px max content width, consistent gutters. Optionally alternates
 * to the soft canvas tone and drops atmospheric gradient orbs behind the band.
 */

type OrbPreset = "preview" | "header" | "sidebar" | "card";

type Props = {
  id?: string;
  tone?: "canvas" | "soft";
  orbs?: OrbPreset;
  /** Remove the max-width container (for full-bleed bands that center their own content). */
  bleed?: boolean;
  className?: string;
  children: ReactNode;
};

export function Section({
  id,
  tone = "canvas",
  orbs,
  bleed = false,
  className = "",
  children,
}: Props) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden py-24 md:py-[96px] ${
        tone === "soft" ? "bg-canvas-soft" : "bg-canvas"
      } ${className}`}
    >
      {orbs && <GradientOrbs preset={orbs} />}
      <div
        className={
          bleed
            ? "relative"
            : "relative mx-auto w-full max-w-[1200px] px-6"
        }
      >
        {children}
      </div>
    </section>
  );
}
