import { afterEach, describe, expect, it, vi } from "vitest";

// site.ts computes IS_LAUNCHED/SITE_URL at module load, so each state needs a
// fresh module graph: stub the env, reset modules, and dynamically import.
async function loadRobots(siteUrl?: string) {
  vi.resetModules();
  if (siteUrl === undefined) {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
  }
  const [{ default: robots }, site] = await Promise.all([
    import("./robots"),
    import("@/lib/seo/site"),
  ]);
  return { robots, site };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("robots (launched: NEXT_PUBLIC_SITE_URL set)", () => {
  const SITE = "https://example.com";

  it("points crawlers at the sitemap and host", async () => {
    const { robots, site } = await loadRobots(SITE);
    const result = robots();
    expect(result.sitemap).toBe(site.absoluteUrl("/sitemap.xml"));
    expect(result.host).toBe(SITE);
  });

  it("allows the site root", async () => {
    const { robots } = await loadRobots(SITE);
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.allow).toBe("/");
  });

  it("disallows private and transactional areas", async () => {
    const { robots } = await loadRobots(SITE);
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rules.disallow ?? [];
    for (const path of [
      "/api/",
      "/account/",
      "/checkout/",
      "/admin/",
      "/auth/",
      "/track/",
      "/lab/",
      "/monitoring",
    ]) {
      expect(disallow).toContain(path);
    }
  });

  it("leaves /cart and /render crawlable so their noindex meta is seen", async () => {
    const { robots } = await loadRobots(SITE);
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rules.disallow ?? [];
    expect(disallow).not.toContain("/cart");
    expect(disallow).not.toContain("/cart/");
    expect(disallow).not.toContain("/render/");
  });
});

describe("robots (pre-launch: NEXT_PUBLIC_SITE_URL unset)", () => {
  it("closes the whole site to crawlers", async () => {
    const { robots, site } = await loadRobots(undefined);
    expect(site.IS_LAUNCHED).toBe(false);
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.disallow).toBe("/");
    expect(result.sitemap).toBeUndefined();
  });
});
