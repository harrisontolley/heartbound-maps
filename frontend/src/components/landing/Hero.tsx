import Image from "next/image";
import { SectionLabel } from "./SectionLabel";
import { LinkButton } from "./LinkButton";
import { TextLink } from "../ui/TextLink";
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
      <h1 className="font-display text-display font-normal text-ink">
        {hero.headline}
      </h1>
      <p className="max-w-[52ch] text-copy text-body">{hero.subhead}</p>
      <div className="flex w-full flex-col gap-4 pt-2 sm:w-auto sm:flex-row sm:items-center sm:gap-6">
        <LinkButton
          href={STUDIO_HREF}
          variant="primary"
          size="md"
          trackId="hero_primary"
          trackLocation="hero"
          className="w-full sm:w-auto"
        >
          {hero.primaryCta}
        </LinkButton>
        <TextLink href="#how-it-works" className="self-start sm:self-auto">
          {hero.secondaryCta}
        </TextLink>
      </div>
      <div className="flex flex-col gap-2">
        <SectionLabel>{hero.specLine}</SectionLabel>
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
      width={2639}
      height={3867}
      priority
      sizes="(min-width: 1024px) 30vw, 70vw"
      className={`h-auto drop-shadow-print ${className}`}
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
          className="object-cover object-[72%_center] lg:object-[85%_top]"
        />
        {/* Soft ivory wash keeps overlaid copy readable at every crop. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(250,248,243,0.9)_0%,rgba(250,248,243,0.6)_38%,rgba(250,248,243,0.12)_62%)]"
        />
        {/* On the stacked layout the copy sits low over an un-washed region;
            fade the bottom into canvas so it stays readable on tall phones. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-canvas via-canvas/80 to-transparent lg:hidden"
        />
      </div>

      {/* Desktop: copy and framed print share one centered grid row. */}
      <div className="container-page relative hidden min-h-[560px] items-center py-20 md:h-[78vh] md:max-h-[820px] lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div data-hero-copy className="max-w-[560px]">
          <HeroCopy />
        </div>
        <div className="flex items-center justify-center">
          {/* Nudged up so the frame hangs fully on the wall, clear of the
              sideboard along the bottom of the background scene. */}
          <FramedPrint className="w-[clamp(270px,26vw,385px)] -translate-y-10" />
        </div>
      </div>

      {/* Stacked (below lg): framed print centered over the wall, copy below.
          Tight vertical padding keeps poster + headline + CTA near one phone
          viewport. */}
      <div className="relative lg:hidden">
        <div className="flex items-center justify-center px-6 pb-8 pt-10">
          <FramedPrint className="w-[min(72vw,380px)]" />
        </div>
        <div className="container-page pb-14">
          <HeroCopy />
        </div>
      </div>
    </div>
  );
}
