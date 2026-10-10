import { useEffect, useRef, type RefObject } from "react";

/** Calls `onIntersect` whenever `target` scrolls into view (used for "load more" sentinels). */
export function useIntersection(
  target: RefObject<Element | null>,
  onIntersect: () => void,
  { enabled = true, rootMargin = "200px" }: { enabled?: boolean; rootMargin?: string } = {},
) {
  const callback = useRef(onIntersect);
  useEffect(() => {
    callback.current = onIntersect;
  });

  useEffect(() => {
    const el = target.current;
    if (!el || !enabled) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) callback.current();
    }, { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, enabled, rootMargin]);
}
