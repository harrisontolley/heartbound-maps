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

/**
 * Rasterize the poster to a high-res PNG. The SVG is vector + self-contained
 * (fonts embedded, no external images), so a 3× backing store stays crisp and
 * the canvas is never tainted → toBlob succeeds. The backing size follows the
 * poster's own viewBox, so non-portrait sizes export at the right dimensions.
 */
export async function exportPng(
  svg: SVGSVGElement,
  filename: string,
  scale = 3,
): Promise<void> {
  const str = await serializePoster(svg);
  const url = URL.createObjectURL(
    new Blob([str], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const img = await loadImage(url);
    const vb = (svg.getAttribute("viewBox") ?? "0 0 1000 1500")
      .split(/\s+/)
      .map(Number);
    const w = (vb[2] || 1000) * scale;
    const h = (vb[3] || 1500) * scale;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/png"),
    );
    if (blob) triggerDownload(blob, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}

