"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePosterStore } from "@/lib/store/posterStore";
import { useFontsReady } from "@/hooks/useFontsReady";
import { useHydrated } from "@/hooks/useHydrated";
import { useMeasuredLayout } from "@/hooks/useMeasuredLayout";
import { getActiveTemplate, TEMPLATE_ORDER } from "@/lib/templates/registry";
import { VINTAGE_VARIANT_ORDER } from "@/lib/templates/vintageVariants";
import { resolveCustomized } from "@/lib/templates/customize";
import {
  PRODUCTS_BY_ID,
  type PrintProduct,
} from "@/lib/commerce/printProducts";
import type { TemplateId, VintageVariant } from "@/lib/templates/types";
import { exportSvg, exportPng, slugify } from "@/lib/export";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { ConfigRail } from "@/components/studio/ConfigRail";
import { PosterStage } from "@/components/studio/PosterStage";
import { BuyBar } from "@/components/studio/BuyBar";

/**
 * Studio shell: header (export) + config rail + live poster stage + sticky buy
 * bar. The rail and stage own their internals; this component only resolves the
 * active template/size, derives the measured geometry, and wires export + the
 * ?template/?variant deep links. Desktop is a fixed two-pane viewport; mobile
 * stacks (poster first) and scrolls the page under a sticky buy bar.
 */
export function PosterStudio() {
  const home = usePosterStore((s) => s.home);
  const places = usePosterStore((s) => s.places);
  const units = usePosterStore((s) => s.units);
  const templateId = usePosterStore((s) => s.templateId);
  const setTemplate = usePosterStore((s) => s.setTemplate);
  const vintageVariant = usePosterStore((s) => s.vintageVariant);
  const setVintageVariant = usePosterStore((s) => s.setVintageVariant);
  const bearingMode = usePosterStore((s) => s.bearingMode);
  const productId = usePosterStore((s) => s.productId);
  const customization = usePosterStore((s) => s.customization);

  const base = getActiveTemplate(templateId, vintageVariant);
  const { template, display, text } = useMemo(
    () => resolveCustomized(base, customization),
    [base, customization],
  );
  const product = PRODUCTS_BY_ID[productId];
  const { w: width, h: height } = product.viewBox;
  const fontsReady = useFontsReady();
  const mounted = useHydrated();

  const [exporting, setExporting] = useState<null | "svg" | "png">(null);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tpl = params.get("template");
    if (tpl && (TEMPLATE_ORDER as string[]).includes(tpl)) {
      setTemplate(tpl as TemplateId);
    }
    const variant = params.get("variant");
    if (variant && (VINTAGE_VARIANT_ORDER as string[]).includes(variant)) {
      setVintageVariant(variant as VintageVariant);
    }
  }, [setTemplate, setVintageVariant]);

  function getSvg(): SVGSVGElement | null {
    return posterRef.current?.querySelector("svg") ?? null;
  }

  async function handleDownload(kind: "svg" | "png") {
    const svg = getSvg();
    if (!svg) return;
    const name = `pinprint-${slugify(home?.label ?? "poster")}.${kind}`;
    setExporting(kind);
    try {
      if (kind === "svg") await exportSvg(svg, name);
      else await exportPng(svg, name);
    } catch {
      // Export rarely fails; leave the buttons re-enabled for a retry.
    } finally {
      setExporting(null);
    }
  }

  function addToCart(product: PrintProduct) {
    // SEAM: replace with real cart store + Stripe checkout when commerce ships.
    void product;
  }

  const measured = useMeasuredLayout({
    home,
    places,
    units,
    template,
    width,
    height,
    fontsReady,
    bearingMode,
  });
  const items = mounted ? measured : [];

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0">
      <StudioHeader
        onDownload={handleDownload}
        exporting={exporting}
        canDownload={!!home}
        className="sticky top-0 lg:static"
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ConfigRail className="order-2 lg:order-1 lg:overflow-y-auto" />
        <PosterStage
          className="order-1 min-h-[55vh] lg:order-2 lg:min-h-0 lg:overflow-auto"
          home={home}
          items={items}
          template={template}
          units={units}
          width={width}
          height={height}
          title={text.title}
          subtitle={text.subtitle}
          footer={text.footer}
          display={display}
          posterRef={posterRef}
        />
      </div>

      <BuyBar product={product} canBuy={!!home} onAddToCart={addToCart} />
    </div>
  );
}
