import type { ComponentType } from "react";
import { SectionLabel } from "./SectionLabel";
import { copy } from "./copy";
import {
  DownloadIcon,
  FrameIcon,
  GuaranteeIcon,
  InkIcon,
  PaperIcon,
  ShippingIcon,
} from "@/lib/icons/icons";
import type { LineIconProps } from "@/lib/icons/base";

/**
 * One icon per trust-line claim, in copy.trustLine.items' order (free
 * shipping, free design, paper stock, ink, frame, guarantee) — paired by
 * index since the copy stays plain text (see copy.ts's own "single source of
 * truth for copy" convention) rather than carrying a component reference.
 */
const TRUST_LINE_ICONS: ComponentType<LineIconProps>[] = [
  ShippingIcon,
  DownloadIcon,
  PaperIcon,
  InkIcon,
  FrameIcon,
  GuaranteeIcon,
];

/**
 * Thin hairline-bounded strip of verifiable quality signals in micro-label
 * type. This is the brand's social-proof register: material and policy facts
 * instead of star widgets and press logos (DESIGN.md).
 */
export function TrustLine() {
  return (
    <div className="border-y border-hairline bg-canvas-soft">
      <ul className="container-page flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-5">
        {copy.trustLine.items.map((item, i) => {
          const Icon = TRUST_LINE_ICONS[i] ?? ShippingIcon;
          return (
            <li key={item} className="flex items-center gap-2">
              <Icon size={14} className="text-accent" />
              <SectionLabel>{item}</SectionLabel>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
