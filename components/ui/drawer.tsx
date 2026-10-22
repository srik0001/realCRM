"use client";

import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useOverlayBehaviour, usePresence } from "@/hooks/use-presence";

/** Right-hand slide-in panel. Closes on overlay click, the X button, or Escape. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  widthClass = "sm:max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  widthClass?: string;
}) {
  const { mounted, shown } = usePresence(open);
  const titleId = useId();
  useOverlayBehaviour(open, onClose);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className={cn("absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-300", shown ? "opacity-100" : "opacity-0")}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          widthClass,
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
