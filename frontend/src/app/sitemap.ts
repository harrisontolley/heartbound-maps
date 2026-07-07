import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import { COMPARE_SLUGS } from "@/lib/compare/competitors";

/**
 * XML sitemap (served at /sitemap.xml). Lists the public, indexable surfaces:
 * the landing page, the studio, pricing, FAQ, the guarantee page, the legal
 * pages, the comparison hub, and one URL per comparison page (auto-derived
 * from COMPARE_SLUGS). Private and transactional routes (account, checkout,
 * admin, auth, track, api) are intentionally excluded — see robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "monthly", priority: 1 },
    {
      url: absoluteUrl("/studio"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/pricing"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    { url: absoluteUrl("/faq"), lastModified, changeFrequency: "monthly", priority: 0.6 },
    {
      url: absoluteUrl("/guarantee"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/compare"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const comparePages: MetadataRoute.Sitemap = COMPARE_SLUGS.map((slug) => ({
    url: absoluteUrl(`/compare/${slug}`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticPages, ...comparePages];
}
