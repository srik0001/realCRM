"use client";

import { useEffect, useState } from "react";

/**
 * Keeps an element mounted long enough to play its exit transition.
 * `mounted` controls rendering, `shown` drives the CSS transition state.
 */
export function usePresence(open: boolean, durationMs = 260) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  // Adjust state during render when `open` flips (avoids an extra effect pass).
  if (open && !mounted) setMounted(true);
  if (!open && shown) setShown(false);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(() => setMounted(false), durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs]);

  return { mounted, shown };
}

/** Close on Escape and lock body scroll while an overlay is open. */
export function useOverlayBehaviour(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}
