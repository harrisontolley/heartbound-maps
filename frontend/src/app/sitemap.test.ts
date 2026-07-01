import { describe, expect, it } from "vitest";
import { COMPARE_SLUGS } from "@/lib/compare/competitors";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("includes the public static pages", () => {
    expect(urls).toContain(absoluteUrl("/"));
    expect(urls).toContain(absoluteUrl("/faq"));
    expect(urls).toContain(absoluteUrl("/compare"));
  });

  it("includes every comparison page", () => {
    for (const slug of COMPARE_SLUGS) {
      expect(urls).toContain(absoluteUrl(`/compare/${slug}`));
    }
  });

  it("uses absolute URLs and no duplicates", () => {
    expect(urls.every((u) => u.startsWith(SITE_URL))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("does not list private or transactional routes", () => {
    const blob = urls.join(" ");
    for (const path of ["/account", "/checkout", "/admin", "/auth", "/track"]) {
      expect(blob).not.toContain(path);
    }
  });
});
