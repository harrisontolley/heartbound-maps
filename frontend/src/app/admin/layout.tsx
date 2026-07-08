import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminLayoutClient from "./AdminLayoutClient";

// Thin server wrapper so this client-gated area can carry route metadata:
// admin pages are private and must never appear in search results.
export const metadata: Metadata = {
  title: "Admin | Heartbound Maps",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
