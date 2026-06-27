"use client";

import Link from "next/link";
import { GradientOrbs } from "@/components/ui/GradientOrbs";
import { Button } from "@/components/ui/Button";
import { AccountNav } from "@/components/account/AccountNav";
import { CartNav } from "@/components/cart/CartNav";

/**
 * The studio's top bar: wordmark + tagline, with export demoted to outline
 * actions on the right. The single ink-pill primary is reserved for "Add to
 * cart" in the buy bar (DESIGN.md: one primary action).
 */
export function StudioHeader({
  onDownload,
  exporting,
  canDownload,
  className = "",
}: {
  onDownload: (kind: "svg" | "png") => void;
  exporting: null | "svg" | "png";
  canDownload: boolean;
  className?: string;
}) {
  return (
    <header
      className={`relative z-20 shrink-0 overflow-hidden border-b border-hairline bg-canvas ${className}`}
    >
      <GradientOrbs preset="header" />
      <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-baseline gap-3">
          <Link
            href="/"
            title="Back to home"
            className="rounded-sm transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <h1 className="font-display text-2xl leading-none text-ink">Pinprint</h1>
          </Link>
          <span className="hidden text-sm text-muted sm:inline">
            poster maps of the places that matter
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload("svg")}
            disabled={exporting !== null || !canDownload}
            title="Download a vector SVG"
          >
            {exporting === "svg" ? "…" : "SVG"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload("png")}
            disabled={exporting !== null || !canDownload}
            title="Download a high-resolution PNG"
          >
            {exporting === "png" ? "Rendering…" : "Download PNG"}
          </Button>
          <CartNav />
          <AccountNav />
        </div>
      </div>
    </header>
  );
}
