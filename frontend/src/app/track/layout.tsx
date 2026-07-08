import type { Metadata } from "next";
import type { ReactNode } from "react";

// Order tracking is per-customer: never indexed.
export const metadata: Metadata = {
  title: "Track your order | Heartbound Maps",
  robots: { index: false, follow: false },
};

export default function TrackLayout({ children }: { children: ReactNode }) {
  return children;
}
