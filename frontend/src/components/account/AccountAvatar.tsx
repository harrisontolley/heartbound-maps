"use client";

import { useState } from "react";

type AvatarUser =
  | { name?: string | null; email?: string | null; image?: string | null }
  | undefined;

/**
 * Initials for the monogram: first letter of the first and last word, else the
 * first two letters of a single name, else the email's first two characters.
 * Falls back to an en dash so the mark is never empty.
 */
function initialsFor(user: AvatarUser): string {
  const name = user?.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = user?.email?.trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return "–";
}

/**
 * The signed-in user's mark. A real photo when we have one; otherwise the user's
 * initials set in the same display face as the Pinprint wordmark, so the avatar
 * reads as a small piece of the masthead rather than a generic account widget.
 *
 * Decorative by default (`aria-hidden`) — the surrounding control names itself.
 * The caller sizes both the circle and the monogram via `className`
 * (e.g. `size-8 text-[13px]`); the initials inherit that font-size.
 */
export function AccountAvatar({
  user,
  className = "",
}: {
  user: AvatarUser;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = user?.image ?? undefined;
  const showImage = Boolean(src) && !broken;

  return (
    <span
      aria-hidden
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-strong text-ink ${className}`}
    >
      {showImage ? (
        // Avatar URLs come from external identity providers (e.g. Google), so a
        // plain <img> with an error fallback is simpler than configuring
        // next/image remote patterns for every possible host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-display font-normal leading-none tracking-[-0.01em]">
          {initialsFor(user)}
        </span>
      )}
    </span>
  );
}
