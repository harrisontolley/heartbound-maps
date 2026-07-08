import type { Metadata } from "next";
import type { ReactNode } from "react";

// Transactional pages (checkout success): never indexed.
export const metadata: Metadata = {
  title: "Checkout | Pinprint",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children;
}
