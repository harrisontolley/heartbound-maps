import type { Metadata } from "next";
import type { ReactNode } from "react";

// Transactional page: crawlable (so the noindex below is actually seen) but
// never indexed.
export const metadata: Metadata = {
  title: "Cart | Pinprint",
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: ReactNode }) {
  return children;
}
