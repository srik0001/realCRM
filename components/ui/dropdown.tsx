"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

/**
 * Popover menu rendered in a portal (so it is never clipped by scrolling tables)
 * that closes on outside click, Escape, scroll, and resize.
 */
export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const below = rect.bottom + 8;
    const top = menuHeight && below + menuHeight > window.innerHeight - 8 ? Math.max(8, rect.top - menuHeight - 8) : below;
    setStyle(
      align === "right"
        ? { top, right: Math.max(8, window.innerWidth - rect.right) }
        : { top, left: Math.max(8, rect.left) },
    );
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className="relative inline-block">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={style}
            className={cn(
              "animate-pop-in fixed z-[60] min-w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg",
              className,
            )}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function MenuItem({
  onClick,
  icon,
  children,
  danger,
}: {
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50",
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700",
      )}
    >
      {icon && <span className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      {children}
    </button>
  );
}
