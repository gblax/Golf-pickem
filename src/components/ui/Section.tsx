"use client";

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionProps {
  title: ReactNode;
  description?: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Section({
  title,
  description,
  defaultOpen = true,
  collapsible = true,
  actions,
  children,
  className,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className={cn(
        "rounded-xl border border-stone-200 bg-white shadow-sm",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
        <button
          type="button"
          onClick={() => collapsible && setOpen((o) => !o)}
          className={cn(
            "flex flex-1 items-center gap-2 text-left",
            collapsible && "cursor-pointer"
          )}
          aria-expanded={open}
        >
          {collapsible && (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-stone-500 transition-transform",
                !open && "-rotate-90"
              )}
            />
          )}
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-stone-900">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-stone-500">{description}</p>
            )}
          </div>
        </button>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      {open && <div className="px-5 py-4">{children}</div>}
    </section>
  );
}
