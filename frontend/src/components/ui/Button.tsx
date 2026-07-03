import type { ButtonHTMLAttributes } from "react";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "./buttonStyles";

/**
 * Editorial CTA button (DESIGN.md). Pill geometry; ink fill is the only primary
 * action color. `primary` = near-black ink pill, `outline` = transparent + hairline,
 * `tertiary` = bare ink text link. Forwards all native button props (onClick,
 * disabled, title, type, …). Styling lives in `buttonStyles.ts`, shared with
 * `landing/LinkButton.tsx`.
 */

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={`${buttonClasses(variant, size)} ${className}`}
      {...props}
    />
  );
}
