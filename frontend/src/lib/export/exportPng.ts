import { serializePoster } from "./exportSvg";
import { triggerDownload } from "./download";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function viewBoxOf(svg: SVGSVGElement): { w: number; h: number } {
  const vb = (svg.getAttribute("viewBox") ?? "0 0 1000 1500").split(/\s+/).map(Number);
  return { w: vb[2] || 1000, h: vb[3] || 1500 };
}

/**
 * Rasterize the poster SVG to a PNG Blob. The SVG is vector + self-contained
 * (fonts embedded, no external images), so the backing store stays crisp and the
 * canvas is never tainted → toBlob succeeds. The backing size follows the
 * poster's own viewBox × scale, so non-portrait sizes export at the right ratio.
 */
export async function rasterizePng(svg: SVGSVGElement, scale = 3): Promise<Blob> {
  const str = await serializePoster(svg);
  const url = URL.createObjectURL(
    new Blob([str], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const img = await loadImage(url);
    const { w: vbW, h: vbH } = viewBoxOf(svg);
    const w = Math.round(vbW * scale);
    const h = Math.round(vbH * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error("toBlob failed");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Rasterize the poster and trigger a browser download. */
export async function exportPng(
  svg: SVGSVGElement,
  filename: string,
  scale = 3,
): Promise<void> {
  const blob = await rasterizePng(svg, scale);
  triggerDownload(blob, filename);
}

/** Target print resolution and a hard pixel cap on the longest side. */
const PRINT_DPI = 300;
const MAX_LONG_EDGE_PX = 7000; // ~194 DPI at 24×36 — keeps canvas memory sane

/**
 * Rasterize the poster as a print-ready PNG for fulfilment. Scale is derived from
 * the product's physical width so the export lands near {@link PRINT_DPI}, capped
 * so the largest size doesn't blow up browser canvas memory.
 */
export async function exportPngBlob(
  svg: SVGSVGElement,
  opts: { widthIn: number },
): Promise<Blob> {
  const { w: vbW, h: vbH } = viewBoxOf(svg);
  const targetScale = (opts.widthIn * PRINT_DPI) / vbW;
  const capScale = MAX_LONG_EDGE_PX / Math.max(vbW, vbH);
  const scale = Math.max(1, Math.min(targetScale, capScale));
  return rasterizePng(svg, scale);
}
