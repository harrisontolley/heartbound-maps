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
        <LinkButton href="/auth/sign-in" variant="outline" size="sm">
          Sign in
        </LinkButton>
      </SignedOut>
      <SignedIn>
        <AccountMenu />
      </SignedIn>
    </div>
  );
}
