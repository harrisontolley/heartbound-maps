import { SectionLabel } from "./SectionLabel";
import { copy } from "./copy";

/**
 * Thin hairline-bounded strip of verifiable quality signals in micro-label
 * type. This is the brand's social-proof register: material and policy facts
 * instead of star widgets and press logos (DESIGN.md).
 */
export function TrustLine() {
  return (
    <div className="border-y border-hairline bg-canvas-soft">
      <ul className="container-page flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-5">
        {copy.trustLine.items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
            <SectionLabel>{item}</SectionLabel>
          </li>
        ))}
      </ul>
    </div>
  );
}
