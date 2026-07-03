/**
 * WebGL capability probe for the landing globe. Called client-side (in an
 * effect) before the three.js chunk is fetched, so devices without WebGL —
 * old GPUs, blocklisted drivers, `--disable-webgl`, some privacy browsers —
 * get the poster-only fallback instead of a broken canvas.
 */
export function isWebGLAvailable(): boolean {
  try {
    if (typeof window === "undefined" || !window.WebGLRenderingContext) {
      return false;
    }
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
