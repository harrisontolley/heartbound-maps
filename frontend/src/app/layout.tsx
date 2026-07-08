import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo/jsonLd";
import { IS_LAUNCHED, SITE_URL, OG_IMAGE } from "@/lib/seo/site";
import { fontVariables } from "@/lib/fonts";
import { Providers } from "./providers";
import "./globals.css";

const TITLE = "Custom Map Prints of the Places That Matter | Heartbound Maps";
const DESCRIPTION =
  "Personalized map wall art, made to order as a custom fine art print. An arrow points to each place that made you, in its true compass direction from home, with the real distance beside it.";

// metadataBase lets every page use relative canonical/OG URLs that resolve to
// absolute against the site origin. `title` is a plain string (no template) so
// page-level titles fully replace it — matching the /faq and comparison pages.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  // Pre-launch (no NEXT_PUBLIC_SITE_URL, so no owned domain) every page is
  // noindexed so the temporary deployment origin never becomes the canonical
  // home of this content in search results. Inherited by all routes.
  robots: IS_LAUNCHED ? undefined : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Heartbound Maps",
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

// Browser chrome color matching the warm-gallery canvas (globals.css
// --color-canvas). Width/initial-scale come from Next's defaults.
export const viewport: Viewport = {
  themeColor: "#faf8f3",
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
        <JsonLd data={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]} />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
