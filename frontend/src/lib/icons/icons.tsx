import { LineIconFrame, type LineIconProps } from "./base";

/**
 * Generic marketing/UI glyphs, same thin-stroke line-art language as
 * affiliations/icons.tsx's poster glyphs — used on the landing page (TrustLine,
 * GiftSection) and in MobileNav, replacing plain dots / one-off inline `<svg>`.
 */

export function ShippingIcon(props: LineIconProps) {
  return (
    <LineIconFrame {...props}>
      <path d="M2 7h11v9H2z" />
      <path d="M13 10h4l3 3v3h-7z" />
      <circle cx="6.5" cy="18" r="1.8" />
      <circle cx="16.5" cy="18" r="1.8" />
    </LineIconFrame>
  );
}

export function DownloadIcon(props: LineIconProps) {
  return (
    <LineIconFrame {...props}>
      <path d="M12 3v11" />
      <path d="M8 10.5l4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </LineIconFrame>
  );
}

export function PaperIcon(props: LineIconProps) {
  return (
    <LineIconFrame {...props}>
      <rect x="6" y="4" width="12" height="16" rx="1" />
      <path d="M9 8.5h6M9 12h6M9 15.5h4" />
    </LineIconFrame>
  );
}

export function InkIcon(props: LineIconProps) {
  return (
    <LineIconFrame {...props}>
      <path d="M12 3.5c3 4 5.5 7.3 5.5 10.3a5.5 5.5 0 0 1-11 0C6.5 10.8 9 7.5 12 3.5z" />
    </LineIconFrame>
  );
}

export function FrameIcon(props: LineIconProps) {
  return (
    <LineIconFrame {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <rect x="7.5" y="7.5" width="9" height="9" rx="0.5" />
    </LineIconFrame>
  );
}

export function GuaranteeIcon(props: LineIconProps) {
  return (
    <LineIconFrame {...props}>
      <path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6z" />
      <path d="M9 12.2l2 2 4-4.4" />
    </LineIconFrame>
  );
}

export function GiftIcon(props: LineIconProps) {
  return (
    <LineIconFrame {...props}>
      <rect x="4" y="9.5" width="16" height="10" rx="1" />
      <path d="M4 13h16" />
      <path d="M12 9.5v10" />
      <path d="M12 9.5c-1.2-3-3-4-4.4-3-1.3.9-.7 3 4.4 3z" />
      <path d="M12 9.5c1.2-3 3-4 4.4-3 1.3.9.7 3-4.4 3z" />
    </LineIconFrame>
  );
}

export function MenuIcon(props: LineIconProps) {
  return (
    <LineIconFrame {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </LineIconFrame>
  );
}

export function CloseIcon(props: LineIconProps) {
  return (
    <LineIconFrame {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </LineIconFrame>
  );
}
