import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";

/**
 * robots.txt (served at /robots.txt). Allows crawling of public marketing/content
 * surfaces, disallows private and transactional areas, and points crawlers at the
 * sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account/", "/checkout/", "/admin/", "/auth/", "/track/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
