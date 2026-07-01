import { describe, expect, it } from "vitest";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";
import robots from "./robots";

describe("robots", () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

  it("points crawlers at the sitemap and host", () => {
    expect(result.sitemap).toBe(absoluteUrl("/sitemap.xml"));
    expect(result.host).toBe(SITE_URL);
  });

  it("allows the site root", () => {
    expect(rules.allow).toBe("/");
  });

  it("disallows private and transactional areas", () => {
    const disallow = rules.disallow ?? [];
    for (const path of [
      "/api/",
      "/account/",
      "/checkout/",
      "/admin/",
      "/auth/",
      "/track/",
    ]) {
      expect(disallow).toContain(path);
    }
  });
});
