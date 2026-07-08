import type { Metadata } from "next";
import type { ReactNode } from "react";

// Internal print-render surface (consumed by the server renderer): crawlable
// so the noindex is seen, never indexed.
export const metadata: Metadata = {
  title: "Print render | Heartbound Maps",
  robots: { index: false, follow: false },
};

export default function RenderLayout({ children }: { children: ReactNode }) {
  return children;
}
