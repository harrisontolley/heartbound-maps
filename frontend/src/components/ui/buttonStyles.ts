/**
 * Shared CTA styling for `ui/Button.tsx` (native <button>) and
 * `landing/LinkButton.tsx` (Next.js <Link>) — one source of truth so the two
 * stay visually identical (DESIGN.md). Pill geometry; ink fill is the only
 * primary action color.
 *
 * Touch sizing: `md` is 44px everywhere (minimum touch target); `sm` keeps its
 * 36px desktop height and grows to 44px only on coarse-pointer devices via the
 * `pointer-coarse:` variant, so dense desktop chrome is unaffected.
 */

export type ButtonVariant = "primary" | "outline" | "tertiary";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 rounded-pill px-4 text-sm pointer-coarse:h-11 pointer-coarse:px-5",
  md: "h-11 rounded-pill px-6 text-[15px]",
};

// Tertiary renders as a bare text link, so it uses a padding-free size map
// rather than overriding the pill padding with conflicting px utilities.
const TERTIARY_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 text-sm pointer-coarse:h-11",
  md: "h-11 text-[15px]",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-active",
  outline: "border border-hairline-strong text-ink hover:bg-surface-strong",
  tertiary: "text-ink hover:text-muted",
};

export function buttonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
): string {
  const sizeClasses =
    variant === "tertiary" ? TERTIARY_SIZES[size] : SIZES[size];
  return `${BASE} ${sizeClasses} ${VARIANTS[variant]}`;
}
