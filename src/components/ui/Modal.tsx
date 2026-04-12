"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size = "md",
}: ModalProps) {
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

  if (!open) return null;
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="animate-fade-in absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "animate-dropdown-enter relative w-full rounded-xl border border-stone-200 bg-white shadow-xl",
          sizeClasses[size],
          className
        )}
      >
        <div className="flex items-start justify-between border-b border-stone-100 px-5 py-4">
          <div>
            {title && (
              <h2 className="font-display text-lg font-semibold text-stone-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-stone-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-stone-500 hover:bg-cream-100 hover:text-stone-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children && <div className="px-5 py-4 text-sm text-stone-700">{children}</div>}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-stone-100 bg-cream-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
