"use client";

import { SignedIn, SignedOut } from "@neondatabase/auth/react/ui";
import { LinkButton } from "@/components/landing/LinkButton";
import { AccountMenu } from "./AccountMenu";

// Header entry point for auth. Signed out → a "Sign in" CTA; signed in → the
// account menu (a monogram avatar that opens account links + sign out). A small
// client island so the surrounding header can stay a server component.
export function AccountNav() {
  return (
    <div className="flex items-center">
      <SignedOut>
        {/* On mobile, "Sign in" lives inside the hamburger menu so the primary
            CTA stands alone; shown inline only from md: up. Wrapped so the
            display toggle doesn't fight LinkButton's own inline-flex. */}
        <span className="hidden md:inline-flex">
          <LinkButton href="/auth/sign-in" variant="outline" size="sm">
            Sign in
          </LinkButton>
        </span>
      </SignedOut>
      <SignedIn>
        {/* On mobile the avatar would crowd the wordmark + primary CTA, so the
            account links + sign out move into the hamburger menu (see MobileNav)
            and the avatar dropdown shows inline only from md: up. */}
        <span className="hidden md:inline-flex">
          <AccountMenu />
        </span>
      </SignedIn>
    </div>
  );
}
