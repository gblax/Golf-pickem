import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "default" | "emerald" | "gold";
  className?: string;
}

const accentClasses = {
  default: "text-stone-900",
  emerald: "text-emerald-700",
  gold: "text-gold-600",
};

export default function StatTile({
  label,
  value,
  icon,
  accent = "default",
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
          {label}
        </p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-100 text-emerald-600">
            {icon}
          </div>
        )}
      </div>
      <p
        className={cn(
          "mt-2 font-display text-3xl font-semibold tracking-tight",
          accentClasses[accent]
        )}
      >
        {value}
      </p>
    </div>
  );
}
