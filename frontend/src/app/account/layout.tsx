import type { Metadata } from "next";
import type { ReactNode } from "react";
import AccountLayoutClient from "./AccountLayoutClient";

// Thin server wrapper so this client-gated area can carry route metadata:
// account pages are private and must never appear in search results.
export const metadata: Metadata = {
  title: "Account | Heartbound Maps",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
