"use client";

import type { RefObject } from "react";
import { Poster } from "@/components/poster/Poster";
import { GradientOrbs } from "@/components/ui/GradientOrbs";
import type { LaidOut } from "@/lib/layout/types";
import type { TemplateSpec } from "@/lib/templates/types";
import type { DisplayOptions } from "@/lib/templates/customize";
import type { Place, Units } from "@/lib/types";

/**
 * The hero: the live poster floating on an orb-lit stage. The atmospheric
 * gradient orbs bloom only here (DESIGN.md) so nothing competes with the poster.
 * posterRef wraps the card so export can read the live <svg>.
 */
export function PosterStage({
  home,
  items,
  template,
  units,
  width,
  height,
  title,
  subtitle,
  footer,
  display,
  posterRef,
  className = "",
}: {
  home: Place | null;
  items: LaidOut[];
  template: TemplateSpec;
  units: Units;
  width: number;
  height: number;
  title: string | null;
  subtitle: string | null;
  footer: string | null;
  display: DisplayOptions;
  posterRef: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center p-4 sm:p-6 lg:p-10 ${className}`}
    >
      <GradientOrbs preset="preview" />
      <div
        ref={posterRef}
        className="relative z-10 h-full max-h-full max-w-full overflow-hidden rounded-sm bg-surface-card shadow-2xl"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <Poster
          home={home}
          items={items}
          template={template}
          units={units}
          width={width}
          height={height}
          title={title}
          subtitle={subtitle}
          footer={footer}
          display={display}
        />
      </div>
    </div>
  );
}
