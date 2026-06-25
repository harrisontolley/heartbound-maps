"use client";

import { useEffect, useState } from "react";

/**
 * Resolves true once web fonts have finished loading, so the layout engine
 * measures labels against the real font metrics rather than the swap fallback.
 *
 * Pass concrete font shorthands (e.g. `'30px "Playfair Display"'`) to force
 * specific faces to load; otherwise we just await all pending faces.
 */
export function useFontsReady(probeFonts: string[] = []): boolean {
  const [ready, setReady] = useState(false);
  const key = probeFonts.join("|");

  useEffect(() => {
    let cancelled = false;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;

    async function settle() {
      try {
        if (fonts) {
          await Promise.all(probeFonts.map((f) => fonts.load(f).catch(() => {})));
          await fonts.ready;
        }
      } catch {
        // best effort — fall through to ready
      }
      if (!cancelled) setReady(true);
    }

    void settle();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return ready;
}
