import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number counting up from 0 to `value` over `duration` ms.
 * No dependencies. Skips animation entirely if the user prefers reduced
 * motion, or if the value is 0 (nothing to animate).
 */
export function useCountUp(value: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || value === 0) {
      setDisplay(value);
      return;
    }

    startRef.current = null;

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return display;
}