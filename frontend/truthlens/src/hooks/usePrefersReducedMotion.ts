"use client";

/**
 * Reads the user's `prefers-reduced-motion` setting.
 *
 * `matchMedia` is a browser API — something outside React that changes on
 * its own — so this uses `useSyncExternalStore`, which is React's dedicated
 * hook for exactly that. It gives us three things a `useState` + `useEffect`
 * pair does not:
 *
 *   • no `setState` inside an effect, so no extra render on mount
 *   • a separate server snapshot, so server rendering and hydration agree
 *   • automatic re-render when the OS setting changes mid-session
 */
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;

/** On the server there is no media query — assume motion is fine. */
const getServerSnapshot = () => false;

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
