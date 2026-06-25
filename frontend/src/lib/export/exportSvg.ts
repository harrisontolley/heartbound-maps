import { buildEmbeddedFontStyle } from "./embedFonts";
import { triggerDownload } from "./download";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Clone the live poster SVG into a self-contained string: explicit pixel size,
 * embedded fonts, and namespaces — ready to open standalone or rasterize.
 */
export async function serializePoster(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const vb = (clone.getAttribute("viewBox") ?? "0 0 1000 1500")
    .split(/\s+/)
    .map(Number);
  clone.setAttribute("width", String(vb[2]));
  clone.setAttribute("height", String(vb[3]));

  const css = await buildEmbeddedFontStyle();
  const style = document.createElementNS(SVG_NS, "style");
  style.textContent = css;
  clone.insertBefore(style, clone.firstChild);

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

export async function exportSvg(
  svg: SVGSVGElement,
  filename: string,
): Promise<void> {
  const str = await serializePoster(svg);
  triggerDownload(
    new Blob([str], { type: "image/svg+xml;charset=utf-8" }),
    filename,
  );
}
