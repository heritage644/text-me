import { useEffect } from "react";

/**
 * Mirrors the visual viewport height into `--app-height` (consumed by the
 * `h-app` utility). On iOS the layout viewport doesn't shrink when the keyboard
 * opens, so without this the composer would slide under the keyboard.
 */
export function useAppHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--app-height", `${vv.height}px`);
      // iOS pans the page when focusing an input; pin it back to the top.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    update();
    vv.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      root.style.removeProperty("--app-height");
    };
  }, []);
}
