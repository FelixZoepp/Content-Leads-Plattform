import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Observes sections with `data-section` attributes inside a scrollable container
 * and returns the id of the most visible section.
 */
export function useScrollSpy(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] || "");
  const containerRef = useRef<HTMLElement | null>(null);

  const attach = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || sectionIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with the largest intersection ratio
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          const id = visible[0].target.getAttribute("data-section");
          if (id) setActiveId(id);
        }
      },
      {
        root: container,
        rootMargin: "-10% 0px -60% 0px", // bias toward top of viewport
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    sectionIds.forEach((id) => {
      const el = container.querySelector(`[data-section="${id}"]`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return { activeId, setActiveId, containerRef: attach };
}
