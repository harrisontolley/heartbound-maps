import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparePageLayout } from "@/components/compare/ComparePageLayout";
import { COMPETITORS, getCompetitor } from "@/lib/compare/competitors";
import { OG_IMAGE } from "@/lib/seo/site";

// Fixed competitor set: only the known slugs are built, anything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return COMPETITORS.map((c) => ({ competitor: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const c = getCompetitor(competitor);
  if (!c) return {};
  const path = `/compare/${c.slug}`;
  return {
    title: c.meta.title,
    description: c.meta.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title: c.meta.title,
      description: c.meta.description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: c.meta.title,
      description: c.meta.description,
      images: [OG_IMAGE],
    },
  };
}

export default async function CompetitorComparePage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const c = getCompetitor(competitor);
  // Belt-and-braces: dynamicParams=false already 404s unknown slugs at the route
  // level; this also narrows the type and guards direct invocation.
  if (!c) notFound();
  return <ComparePageLayout competitor={c} />;
}
