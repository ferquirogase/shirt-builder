import { useEffect, useState } from "react";

// Tells whether an element is on screen. Returns a callback ref to put on the
// element and the current answer. `rootMargin` shrinks (negative) or grows the
// area that counts as "on screen"; for example, a bottom margin of -80px treats
// a bar fixed to the bottom of the screen as covering that part.
// Without IntersectionObserver the answer stays false.
export function useInView<T extends Element>(rootMargin = "0px"): [(node: T | null) => void, boolean] {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, rootMargin]);

  return [setNode, inView];
}
