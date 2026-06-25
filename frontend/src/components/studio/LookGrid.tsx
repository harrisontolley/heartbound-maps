"use client";

import { usePosterStore } from "@/lib/store/posterStore";
import { LOOKS, activeLookId } from "@/lib/looks/looks";
import { LookCard } from "./LookCard";

/**
 * The six featured looks. Selecting one applies its template + variant and
 * resets customization (store.applyLook). When the user picks a non-featured
 * style under Advanced (art-deco, constellation, a non-classic vintage variant),
 * activeLookId is null and no card shows active — which is correct.
 */
export function LookGrid() {
  const templateId = usePosterStore((s) => s.templateId);
  const vintageVariant = usePosterStore((s) => s.vintageVariant);
  const applyLook = usePosterStore((s) => s.applyLook);

  const active = activeLookId(templateId, vintageVariant);

  return (
    <div className="grid grid-cols-2 gap-3">
      {LOOKS.map((look) => (
        <LookCard
          key={look.id}
          look={look}
          active={look.id === active}
          onSelect={() => applyLook(look.id)}
        />
      ))}
    </div>
  );
}
