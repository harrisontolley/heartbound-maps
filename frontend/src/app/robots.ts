import type { MetadataRoute } from "next";
import { IS_LAUNCHED, SITE_URL, absoluteUrl } from "@/lib/seo/site";

/**
 * robots.txt (served at /robots.txt).
 *
 * Pre-launch (NEXT_PUBLIC_SITE_URL unset — no owned production domain yet) the
 * whole site is closed to crawlers so the temporary deployment origin never
 * gets indexed as the canonical home of this content. Setting the env var
 * flips the site open.
 *
 * Once launched: allow the public marketing/content surfaces, disallow private
 * and transactional areas, and point crawlers at the sitemap. /cart and
 * /render are deliberately NOT disallowed — they carry a noindex meta instead,
 * which crawlers can only honor if they are allowed to fetch the page.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_LAUNCHED) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/account/",
        "/checkout/",
        "/admin/",
        "/auth/",
        "/track/",
        "/lab/",
        "/monitoring",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
