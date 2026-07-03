import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { fontVariables } from "@/lib/fonts";
import { SITE_URL, OG_IMAGE } from "@/lib/seo/site";
import { Providers } from "./providers";
import "./globals.css";

const TITLE = "Pinprint | Fine art maps of the places that matter";
const DESCRIPTION =
  "Turn the places that made you into a custom fine art print. An arrow points to each one in its true compass direction from home, with the real distance beside it. Designed by you, made to order.";

// metadataBase lets every page use relative canonical/OG URLs that resolve to
// absolute against the site origin. `title` is a plain string (no template) so
// page-level titles fully replace it — matching the /faq and comparison pages.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Pinprint",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Neon Auth's UI provider (auth-provider.tsx) injects a next-themes-style
    // blocking script that sets `documentElement.style.colorScheme` before
    // hydration to avoid a flash of the wrong theme. React's hydration diff
    // has no way to know that mutation is intentional, so this element (only
    // this element, not its children) opts out of the mismatch warning —
    // the standard fix for this exact pattern.
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-canvas text-body">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
