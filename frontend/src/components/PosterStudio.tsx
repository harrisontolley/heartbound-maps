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
import { exportPngBlob, rasterizePng, serializePoster, slugify } from "@/lib/export";
import { uploadPosterPng, uploadPosterSvg } from "@/lib/upload/uploadPosterPng";
import { STEPS, STEP_INDEX } from "@/lib/studio/steps";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent } from "@/lib/analytics/useTrackEvent";
import type { StudioStepDirection } from "@/lib/analytics/events";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { PosterStage } from "@/components/studio/PosterStage";
import { WallpaperCapture } from "@/components/studio/WallpaperCapture";
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
 * Rasterize a hidden wallpaper `<svg>` (phone or desktop, from
 * WallpaperCapture) and upload it under the same slug, best-effort. Rejects
 * when the svg isn't ready (never should be, since WallpaperCapture is always
 * mounted) so the caller's Promise.allSettled logs it exactly like a real
 * upload failure rather than silently proceeding.
 */
function captureWallpaper(svg: SVGSVGElement | null, slug: string): Promise<string> {
  if (!svg) return Promise.reject(new Error("wallpaper svg not ready"));
  return rasterizePng(svg, 2).then((blob) => uploadPosterPng(blob, slug));
}

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
  const frame = usePosterStore((s) => s.frame);
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

  const track = useTrackEvent();
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const phoneWallpaperRef = useRef<HTMLDivElement>(null);
  const desktopWallpaperRef = useRef<HTMLDivElement>(null);

  // Step cursor. `furthest` is the highest step reached — it bounds which steps
  // the progress bar lets you jump back to.
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstFocus = useRef(true);

  const goTo = (i: number, direction: StudioStepDirection = "jump") => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    if (clamped !== step) {
      track(ANALYTICS_EVENTS.studioStepAdvance, {
        from_step: STEPS[step].id,
        to_step: STEPS[clamped].id,
        direction,
      });
    }
    setStep(clamped);
    setFurthest((f) => Math.max(f, clamped));
  };
  const next = () => goTo(step + 1, "next");
  const back = () => goTo(step - 1, "back");

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
  function getPhoneWallpaperSvg(): SVGSVGElement | null {
    return phoneWallpaperRef.current?.querySelector("svg") ?? null;
  }
  function getDesktopWallpaperSvg(): SVGSVGElement | null {
    return desktopWallpaperRef.current?.querySelector("svg") ?? null;
  }

  async function addToCart(selection: StudioSelection) {
    if (addingToCart) return;
    const posterConfig = snapshotPosterConfig();
    // Capture both deliverables so Phase B's post-payment digital-delivery email
    // always has a full-res PNG and the vector SVG to link to, whatever format
    // was bought. Prints rasterize at print DPI (for Artelo); digital rasterizes
    // at a fixed 3x (screen-res is a different, lead-magnet-only path). Both run
    // in parallel and are each best-effort: a failed upload (e.g. blob storage
    // unconfigured) never blocks add-to-cart — the item just lacks that URL, and
    // fulfilment/delivery can be retried server-side. The two bonus wallpaper
    // renders (WallpaperCapture, always mounted off-screen) join the same
    // best-effort batch — a failed wallpaper upload never blocks add-to-cart
    // either, the order just carries fewer bonus links.
    let assetUrl: string | undefined;
    let svgAssetUrl: string | undefined;
    let phoneWallpaperAssetUrl: string | undefined;
    let desktopWallpaperAssetUrl: string | undefined;
    const svg = getSvg();
    if (svg) {
      setAddingToCart(true);
      const slug = slugify(home?.label ?? "poster");
      const [pngResult, svgResult, phoneResult, desktopResult] = await Promise.allSettled([
        selection.format === "print"
          ? exportPngBlob(svg, { widthIn: product.widthIn }).then((blob) =>
              uploadPosterPng(blob, slug),
            )
          : rasterizePng(svg, 3).then((blob) => uploadPosterPng(blob, slug)),
        serializePoster(svg).then((svgText) => uploadPosterSvg(svgText, slug)),
        captureWallpaper(getPhoneWallpaperSvg(), `${slug}-phone`),
        captureWallpaper(getDesktopWallpaperSvg(), `${slug}-desktop`),
      ]);
      if (pngResult.status === "fulfilled") {
        assetUrl = pngResult.value;
      } else {
        console.error("[studio] poster asset upload failed", pngResult.reason);
      }
      if (svgResult.status === "fulfilled") {
        svgAssetUrl = svgResult.value.url;
      } else {
        console.error("[studio] poster svg upload failed", svgResult.reason);
      }
      if (phoneResult.status === "fulfilled") {
        phoneWallpaperAssetUrl = phoneResult.value;
      } else {
        console.error("[studio] phone wallpaper upload failed", phoneResult.reason);
      }
      if (desktopResult.status === "fulfilled") {
        desktopWallpaperAssetUrl = desktopResult.value;
      } else {
        console.error("[studio] desktop wallpaper upload failed", desktopResult.reason);
      }
      setAddingToCart(false);
    }
    addItem({
      selection,
      posterConfig,
      assetUrl,
      svgAssetUrl,
      phoneWallpaperAssetUrl,
      desktopWallpaperAssetUrl,
    });
    track(ANALYTICS_EVENTS.addToCart, {
      product_id: selection.productId,
      format: selection.format,
      framed: selection.frame !== null,
      ...(selection.frame
        ? { frame_material: selection.frame.material, frame_color: selection.frame.color }
        : {}),
    });
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
        return <StepReview getSvg={getSvg} canSubmit={!!home} />;
    }
  }

  function renderBottom() {
    if (isReview) {
      return (
        <BuyBar
          product={product}
          format={format}
          frame={frame}
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
        <WallpaperCapture
          home={previewHome}
          places={previewPlaces}
          units={units}
          template={template}
          bearingMode={bearingMode}
          scaleByDistance={customization.scaleArrowsByDistance}
          showDistances={display.distances}
          fontsReady={fontsReady}
          title={text.title}
          subtitle={text.subtitle}
          footer={text.footer}
          display={display}
          phoneRef={phoneWallpaperRef}
          desktopRef={desktopWallpaperRef}
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
            {current.id === "style" && (
              <p className="-mt-2 mb-4 text-[13px] leading-[1.5] text-muted">
                Free to design. See your finished design free by email before you
                pay a cent; every printed order includes the full 300 DPI files too.
              </p>
            )}
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
