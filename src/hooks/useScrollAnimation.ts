import { useEffect, useRef } from "react";

export const useScrollAnimation = () => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("scroll-visible");
            entry.target.classList.remove("scroll-hidden");
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
      }
    );

    const elements = document.querySelectorAll(".scroll-animate");
    elements.forEach((el, index) => {
      // Add stagger delay based on index within parent
      const staggerDelay = (index % 6) * 0.1;
      (el as HTMLElement).style.transitionDelay = `${staggerDelay}s`;
      el.classList.add("scroll-hidden");
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);
};
