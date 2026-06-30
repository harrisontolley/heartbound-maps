"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePosterStore } from "@/lib/store/posterStore";
import { useFontsReady } from "@/hooks/useFontsReady";
import { useHydrated } from "@/hooks/useHydrated";
import { useMeasuredLayout } from "@/hooks/useMeasuredLayout";
import {
  getActiveTemplate,
  TEMPLATE_ORDER,
  DEFAULT_TEMPLATE_ID,
} from "@/lib/templates/registry";
import { VINTAGE_VARIANT_ORDER } from "@/lib/templates/vintageVariants";
import { resolveCustomized, isCustomized } from "@/lib/templates/customize";
import { PRODUCTS_BY_ID } from "@/lib/commerce/printProducts";
import type { StudioSelection } from "@/lib/commerce/price";
import { useCartStore } from "@/lib/store/cartStore";
import { snapshotPosterConfig } from "@/lib/commerce/posterConfig";
import { SEED_HOME, SEED_PLACES } from "@/lib/seed";
import type { TemplateId, VintageVariant } from "@/lib/templates/types";
import { exportSvg, exportPng, exportPngBlob, slugify } from "@/lib/export";
import { uploadPosterPng } from "@/lib/upload/uploadPosterPng";
import { STEPS, STEP_INDEX } from "@/lib/studio/steps";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { PosterStage } from "@/components/studio/PosterStage";
import { BuyBar } from "@/components/studio/BuyBar";
import { WizardProgress } from "@/components/studio/wizard/WizardProgress";
import { WizardNav, type NavAction } from "@/components/studio/wizard/WizardNav";
import { StepStyle } from "@/components/studio/wizard/steps/StepStyle";
import { StepHome } from "@/components/studio/wizard/steps/StepHome";
import { StepPlaces } from "@/components/studio/wizard/steps/StepPlaces";
import { StepSize } from "@/components/studio/wizard/steps/StepSize";
import { StepCustomize } from "@/components/studio/wizard/steps/StepCustomize";
import { StepReview } from "@/components/studio/wizard/steps/StepReview";

/**
 * Studio shell — a staged builder. A header + progress stepper sit above a fixed
 * two-region body: the live poster stage (always visible) and the current step's
 * panel, with a bottom bar (WizardNav, or BuyBar on Review). The flow is
 * Style → Places → Size → Review, with an optional Personalize (Customize) detour
 * off Size. This component owns the cross-step concerns — the active template/
 * size, measured geometry, export, add-to-cart, the ?template/?variant deep
 * links, and the step cursor — while each step panel composes the store-driven
 * controls. Desktop is a two-pane viewport (panel left, preview right); mobile
 * stacks preview-on-top over the step panel, both bounded so only the panel
 * scrolls and the bottom bar stays in reach.
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
  const format = usePosterStore((s) => s.format);
  const addFrame = usePosterStore((s) => s.addFrame);
  const customization = usePosterStore((s) => s.customization);
  const resetDesign = usePosterStore((s) => s.resetDesign);

  const base = getActiveTemplate(templateId, vintageVariant);
  const { template, display, text } = useMemo(
    () => resolveCustomized(base, customization),
    [base, customization],
  );
  const product = PRODUCTS_BY_ID[productId];
  const { w: width, h: height } = product.viewBox;
  const fontsReady = useFontsReady();
  const mounted = useHydrated();

  const addItem = useCartStore((s) => s.addItem);
  const [exporting, setExporting] = useState<null | "svg" | "png">(null);
  const [justAdded, setJustAdded] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // Step cursor. `furthest` is the highest step reached — it bounds which steps
  // the progress bar lets you jump back to.
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstFocus = useRef(true);

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    setStep(clamped);
    setFurthest((f) => Math.max(f, clamped));
  };
  const next = () => goTo(step + 1);
  const back = () => goTo(step - 1);

  // "Start over" wipes the design back to a fresh studio and returns to step 1.
  // Only offered once there's actually something to reset (mirrors the header's
  // leave guard), and confirmed first since it can't be undone.
  const hasWork =
    home != null ||
    places.length > 0 ||
    templateId !== DEFAULT_TEMPLATE_ID ||
    isCustomized(customization);
  const startOver = () => {
    resetDesign();
    setStep(0);
    setFurthest(0);
    setConfirmingReset(false);
  };

  useEffect(() => {
    // Restore the auto-saved draft first, then layer any ?template/?variant deep
    // link on top so an explicit link always wins over the restored design.
    // Rehydration runs here (not app-wide) so this ordering is guaranteed;
    // skipHydration kept it off the SSR path, so server step 0 and the first
    // client render agree and there's no hydration mismatch.
    let cancelled = false;
    void Promise.resolve(usePosterStore.persist.rehydrate()).then(() => {
      if (cancelled) return;
      const params = new URLSearchParams(window.location.search);
      const tpl = params.get("template");
      let preselected = false;
      if (tpl && (TEMPLATE_ORDER as string[]).includes(tpl)) {
        setTemplate(tpl as TemplateId);
        preselected = true;
      }
      const variant = params.get("variant");
      if (variant && (VINTAGE_VARIANT_ORDER as string[]).includes(variant)) {
        setVintageVariant(variant as VintageVariant);
      }
      // A deep link that pre-picks a style lands the user on Home — the look is
      // already chosen, so their next decision is their central location.
      if (preselected) {
        setStep(STEP_INDEX.home);
        setFurthest(STEP_INDEX.home);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [setTemplate, setVintageVariant]);

  // Move focus to the step heading on step change (skip the initial mount).
  useEffect(() => {
    if (firstFocus.current) {
      firstFocus.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

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

  async function addToCart(selection: StudioSelection) {
    if (addingToCart) return;
    const posterConfig = snapshotPosterConfig();
    // For prints, rasterize the live poster to a print-ready PNG and upload it so
    // Artelo can fetch the artwork. Best-effort: if it fails (e.g. blob storage
    // unconfigured) we still add the item so the sale completes — fulfilment can
    // be retried server-side. Digital downloads need no print asset.
    let assetUrl: string | undefined;
    if (selection.format === "print") {
      const svg = getSvg();
      if (svg) {
        setAddingToCart(true);
        try {
          const blob = await exportPngBlob(svg, { widthIn: product.widthIn });
          assetUrl = await uploadPosterPng(blob, slugify(home?.label ?? "poster"));
        } catch (err) {
          console.error("[studio] print asset upload failed", err);
        } finally {
          setAddingToCart(false);
        }
      }
    }
    addItem({ selection, posterConfig, assetUrl });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2500);
  }

  // Until the buyer sets their own home, the preview shows a labelled "Example"
  // sample so the chosen style is still visible. Export/add-to-cart stay gated on
  // the real `home`, so the sample never ships.
  const usingSample = !home;
  const previewHome = home ?? SEED_HOME;
  const previewPlaces = home ? places : SEED_PLACES;

  const measured = useMeasuredLayout({
    home: previewHome,
    places: previewPlaces,
    units,
    template,
    width,
    height,
    fontsReady,
    bearingMode,
    scaleByDistance: customization.scaleArrowsByDistance,
    showDistances: display.distances,
  });
  const items = mounted ? measured : [];

  const current = STEPS[step];
  const isReview = current.id === "review";

  function renderStep() {
    switch (current.id) {
      case "style":
        return <StepStyle />;
      case "home":
        return <StepHome />;
      case "places":
        return <StepPlaces />;
      case "size":
        return <StepSize />;
      case "customize":
        return <StepCustomize />;
      case "review":
        return (
          <StepReview
            onDownload={handleDownload}
            exporting={exporting}
            canDownload={!!home}
          />
        );
    }
  }

  function renderBottom() {
    if (isReview) {
      return (
        <BuyBar
          product={product}
          format={format}
          addFrame={addFrame}
          canBuy={!!home}
          justAdded={justAdded}
          busy={addingToCart}
          onAddToCart={addToCart}
        />
      );
    }
    // Linear flow: Style → Places → Customize → Size → Review.
    const primary: NavAction = { label: "Next →", onClick: next };
    return <WizardNav showBack={step > 0} onBack={back} primary={primary} />;
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <StudioHeader />

      <WizardProgress
        steps={STEPS}
        current={step}
        furthest={furthest}
        onJump={goTo}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <PosterStage
          className="order-1 h-[38dvh] shrink-0 lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1 lg:overflow-auto"
          sample={usingSample}
          home={previewHome}
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

        <section
          aria-label={`Step ${step + 1}: ${current.label}`}
          className="order-2 flex min-h-0 flex-1 flex-col lg:order-1 lg:w-[400px] lg:flex-none lg:border-r lg:border-hairline lg:bg-canvas-soft"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="mb-4 flex items-center gap-3">
              {isReview && (
                <button
                  type="button"
                  onClick={back}
                  className="text-sm text-muted transition-colors hover:text-ink"
                >
                  ← Back
                </button>
              )}
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-xl leading-none text-ink outline-none"
              >
                {current.title}
              </h2>
              {hasWork && (
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  className="ml-auto shrink-0 text-xs text-muted-soft transition-colors hover:text-error"
                >
                  Start over
                </button>
              )}
            </div>
            {renderStep()}
          </div>
          {renderBottom()}
        </section>
      </div>

      <ConfirmDialog
        open={confirmingReset}
        title="Start over?"
        body="This clears your home, places, and style so you can begin a fresh design. It can't be undone."
        confirmLabel="Start over"
        cancelLabel="Keep editing"
        emphasis="cancel"
        onConfirm={startOver}
        onCancel={() => setConfirmingReset(false)}
      />
    </div>
  );
}
