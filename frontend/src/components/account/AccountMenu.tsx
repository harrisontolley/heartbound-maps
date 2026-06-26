"use client";

import type { ReactNode } from "react";
import { UserButton } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";
import { AccountAvatar } from "./AccountAvatar";
import { ACCOUNT_LINKS } from "./links";

// Signed-in header control: a bare Garamond-monogram avatar that opens the account
// menu. We reuse Neon Auth's UserButton (so sign-out, settings and multi-session
// keep working) but replace its default trigger and theme its dropdown to the
// editorial stone palette. Used in every navbar via AccountNav, and in the account
// dashboard header.

// Hairline link icons, sized and weighted to sit beside the library's own lucide
// icons (Settings / Sign out). No color class, so they inherit the menu item's
// muted tone exactly like those defaults.
const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "size-4",
  "aria-hidden": true,
} as const;

function OverviewIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21 3 16.5z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

// The orphan "Account" link that used to sit next to the avatar now lives in the
// menu, grouped with the rest. `signedIn` keeps them hidden if the session lapses;
// `separator` on the last one divides this group from Settings / Sign out. The
// href/label pairs come from the shared ACCOUNT_LINKS so the mobile hamburger
// menu (MobileNav) can't drift; the icons and flags are layered on here.
const ICONS: Record<string, ReactNode> = {
  "/account": <OverviewIcon />,
  "/account/orders": <OrdersIcon />,
  "/account/profile": <ProfileIcon />,
};
const LINKS = ACCOUNT_LINKS.map((link, i) => ({
  href: link.href,
  label: link.label,
  icon: ICONS[link.href],
  signedIn: true,
  // Divide this group from the library's Settings / Sign out on the last item.
  separator: i === ACCOUNT_LINKS.length - 1,
}));

// twMerge inside the library's cn() lets these override the shadcn defaults
// cleanly (last class wins) — no !important or specificity juggling.
const CLASS_NAMES = {
  content: {
    base: "min-w-[15rem] rounded-xl border-hairline bg-surface-card p-1.5 text-ink shadow-[0_16px_48px_-16px_rgba(12,10,9,0.22)]",
    user: {
      base: "rounded-lg px-2 py-2",
      avatar: {
        base: "size-9 bg-surface-strong",
        fallback: "font-display text-[14px] text-ink uppercase",
      },
      title: "font-display text-[15px] font-normal text-ink",
      subtitle: "text-xs font-normal text-muted opacity-100",
    },
    menuItem:
      "gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-body transition-colors focus:bg-surface-strong focus:text-ink",
    separator: "bg-hairline",
  },
} as const;

export function AccountMenu() {
  const session = authClient.useSession();
  const user = session.data?.user as
    | { name?: string; email?: string; image?: string }
    | undefined;

  const trigger = (
    <button
      type="button"
      aria-label="Account menu"
      className="group flex items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      <AccountAvatar
        user={user}
        className="size-9 text-[14px] ring-1 ring-hairline transition-[box-shadow] group-hover:ring-hairline-strong group-data-[state=open]:ring-hairline-strong"
      />
    </button>
  );

  return (
    <UserButton
      // Suppress the library's "pass size" warning; rendering uses our trigger.
      size="default"
      trigger={trigger}
      align="end"
      sideOffset={10}
      additionalLinks={LINKS}
      classNames={CLASS_NAMES}
    />
  );
}
