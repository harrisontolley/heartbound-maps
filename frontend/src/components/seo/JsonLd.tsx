import type { JsonLdObject } from "@/lib/seo/jsonLd";

/**
 * Serialize a JSON-LD object, escaping `<` so a stray "</script>" in any string
 * can never break out of the <script> tag (the standard safe JSON-LD pattern).
 * Content here is controlled schema.org data, but this makes breakout impossible
 * regardless of content.
 */
function serialize(item: JsonLdObject): string {
  return JSON.stringify(item).replace(/</g, "\\u003c");
}

/**
 * Injects one or more JSON-LD blocks as <script type="application/ld+json">.
 * Server component; serialization is build-time. Keyed by @type so a Breadcrumb +
 * FAQPage pair render as two stable, distinct tags.
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item) => (
        <script
          key={String(item["@type"] ?? serialize(item).slice(0, 24))}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serialize(item) }}
        />
      ))}
    </>
  );
}
