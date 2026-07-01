import { describe, expect, it, vi } from "vitest";
import { COMPARE_SLUGS } from "@/lib/compare/competitors";

// Stub the heavy page layout (pulls in SiteHeader/auth/store) — this suite tests the
// route's params/metadata/404 logic, not the rendered chrome. The stub still receives
// the resolved competitor as a prop so we can assert what the route hands down.
vi.mock("@/components/compare/ComparePageLayout", () => ({
  ComparePageLayout: ({ competitor }: { competitor: { slug: string } }) => (
    <div data-testid="layout" data-slug={competitor.slug} />
  ),
}));

// notFound() throws a sentinel so we can assert the 404 path is taken.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import Page, { generateMetadata, generateStaticParams } from "./page";

describe("compare/[competitor] route", () => {
  it("prerenders exactly the known comparison slugs", () => {
    const params = generateStaticParams();
    expect(params).toEqual(COMPARE_SLUGS.map((competitor) => ({ competitor })));
  });

  it("renders the matching competitor for a known slug", async () => {
    const element = await Page({
      params: Promise.resolve({ competitor: "pinprint-vs-mapiful" }),
    });
    expect(element.props.competitor.slug).toBe("pinprint-vs-mapiful");
    expect(element.props.competitor.name).toBe("Mapiful");
  });

  it("404s for an unknown slug", async () => {
    await expect(
      Page({ params: Promise.resolve({ competitor: "pinprint-vs-nope" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("builds canonical, title and description metadata for a known slug", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ competitor: "pinprint-vs-grafomap" }),
    });
    expect(meta.title).toContain("Grafomap");
    expect(meta.description).toBeTruthy();
    expect(meta.alternates?.canonical).toBe("/compare/pinprint-vs-grafomap");
    expect(meta.openGraph?.url).toBe("/compare/pinprint-vs-grafomap");
  });

  it("returns empty metadata for an unknown slug", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ competitor: "pinprint-vs-nope" }),
    });
    expect(meta).toEqual({});
  });
});
