// Build a <style> payload that makes an exported SVG self-contained: every web
// font used on the page is inlined as a base64 @font-face, and the next/font CSS
// variables are redefined on the svg so `font-family: var(--font-x)` resolves
// standalone (outside the page's :root). The poster has no external images, so
// fonts are the only thing that needs embedding.

const FONT_VARS = [
  "--font-playfair",
  "--font-garamond",
  "--font-inter",
  "--font-archivo",
  "--font-jetbrains-mono",
];

const dataUriCache = new Map<string, string | null>();

function base64FromBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function urlToDataUri(url: string): Promise<string | null> {
  if (dataUriCache.has(url)) return dataUriCache.get(url)!;
  let result: string | null = null;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      const mime = url.endsWith(".woff") ? "font/woff" : "font/woff2";
      result = `data:${mime};base64,${base64FromBuffer(buf)}`;
    }
  } catch {
    result = null;
  }
  dataUriCache.set(url, result);
  return result;
}

type FaceRule = { rule: CSSFontFaceRule; base: string };

function collectFontFaceRules(): FaceRule[] {
  const out: FaceRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet — skip
    }
    if (!rules) continue;
    // Font src urls are relative to the stylesheet, not the document.
    const base = sheet.href ?? location.href;
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSFontFaceRule) out.push({ rule, base });
    }
  }
  return out;
}

export async function buildEmbeddedFontStyle(): Promise<string> {
  const rules = collectFontFaceRules();
  const seen = new Set<string>();
  const faces: string[] = [];

  for (const { rule, base } of rules) {
    const style = rule.style;
    const family = style.getPropertyValue("font-family");
    const src = style.getPropertyValue("src");
    const match = src.match(/url\(["']?([^"')]+\.woff2?)["']?\)/);
    if (!family || !match) continue;
    let url: string;
    try {
      url = new URL(match[1], base).toString();
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);

    const dataUri = await urlToDataUri(url);
    if (!dataUri) continue;
    const weight = style.getPropertyValue("font-weight") || "400";
    const fontStyle = style.getPropertyValue("font-style") || "normal";
    faces.push(
      `@font-face{font-family:${family};font-style:${fontStyle};font-weight:${weight};font-display:block;src:url(${dataUri}) format("woff2")}`,
    );
  }

  const cs = getComputedStyle(document.documentElement);
  const vars = FONT_VARS.map((v) => `${v}:${cs.getPropertyValue(v).trim()}`).join(";");

  return `${faces.join("")}svg{${vars}}`;
}
