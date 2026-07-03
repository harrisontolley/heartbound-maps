import Image from "next/image";
import { SectionLabel } from "./SectionLabel";
import { LinkButton } from "./LinkButton";
import { copy, STUDIO_HREF } from "./copy";

/**
 * Above-the-fold hero, layered so the poster centers against the copy on
 * EVERY viewport: the room (frameless wall + sideboard) is a full-bleed
 * background, and the framed print is a separate DOM element sharing a grid
 * row with the copy (`items-center` makes the two centers equal by
 * construction). The framed print is the native-resolution engine render
 * inside a photoreal oak frame (scripts/compose-scenes.ts `cropToFrame`), so
 * it stays pixel-crisp at any DPR; its wall shadow is a CSS drop-shadow.
 * Below lg the layers stack: framed print centered over the wall, copy below.
 */
function HeroCopy() {
  const { hero } = copy;
  return (
    <div className="flex flex-col items-start gap-6">
      <SectionLabel>{hero.eyebrow}</SectionLabel>
      <h1 className="font-display text-[clamp(2.375rem,5.5vw,64px)] font-normal leading-[1.04] tracking-[-0.02em] text-ink">
        {hero.headline}
      </h1>
      <p className="max-w-[52ch] text-[16px] leading-[1.55] tracking-[0.16px] text-body">
        {hero.subhead}
      </p>
      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:gap-6">
        <LinkButton href={STUDIO_HREF} variant="primary" size="md">
          {hero.primaryCta}
        </LinkButton>
        <a
          href="#how-it-works"
          className="text-[15px] font-medium text-ink underline-offset-4 hover:underline"
        >
          {hero.secondaryCta}
        </a>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.96px] text-muted">
          {hero.specLine}
        </p>
        <p className="text-[14px] leading-[1.5] text-muted">{hero.reassurance}</p>
      </div>
    </div>
  );
}

function FramedPrint({ className = "" }: { className?: string }) {
  const { framed } = copy.hero;
  return (
    <Image
      src={framed.src}
      alt={framed.alt}
      width={1319}
      height={1933}
      priority
      sizes="(min-width: 1024px) 30vw, 70vw"
      className={`h-auto [filter:drop-shadow(0_30px_40px_rgba(31,27,22,0.32))] ${className}`}
      data-hero-poster
    />
  );
}

export function Hero() {
  const { hero } = copy;
  return (
    <div id="top" className="relative">
      {/* Background room: frameless wall + sideboard; any crop is fine. */}
      <div className="absolute inset-0">
        <Image
          src={hero.media.src}
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Soft ivory wash keeps overlaid copy readable at every crop. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(250,248,243,0.9)_0%,rgba(250,248,243,0.6)_38%,rgba(250,248,243,0.12)_62%)]"
        />
      </div>

      {/* Desktop: copy and framed print share one centered grid row. */}
      <div className="relative mx-auto hidden min-h-[560px] w-full max-w-[1200px] items-center px-6 py-20 md:h-[78vh] md:max-h-[820px] lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div data-hero-copy className="max-w-[560px]">
          <HeroCopy />
        </div>
        <div className="flex items-center justify-center">
          <FramedPrint className="w-[clamp(300px,30vw,440px)]" />
        </div>
      </div>

      {/* Stacked (below lg): framed print centered over the wall, copy below. */}
      <div className="relative lg:hidden">
        <div className="flex items-center justify-center px-6 py-16">
          <FramedPrint className="w-[min(70vw,360px)]" />
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-6 pb-14">
          <HeroCopy />
        </div>
      </div>
    </div>
  );
}
