import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "neutral"
  | "emerald"
  | "gold"
  | "sky"
  | "rose"
  | "amber"
  | "stone";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

const variantClasses: Record<Variant, string> = {
  neutral: "bg-stone-100 text-stone-700 ring-stone-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  gold: "bg-gold-50 text-gold-700 ring-gold-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  stone: "bg-stone-200 text-stone-800 ring-stone-300",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-0.5 text-xs",
};

export default function Badge({
  variant = "neutral",
  size = "md",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium uppercase tracking-wide ring-1 ring-inset",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

const STATUS_MAP: Record<string, { variant: Variant; label: string }> = {
  UPCOMING: { variant: "stone", label: "Upcoming" },
  DRAFT_OPEN: { variant: "sky", label: "Draft Open" },
  IN_PROGRESS: { variant: "emerald", label: "Live" },
  COMPLETE: { variant: "gold", label: "Final" },
};

export function StatusBadge({
  status,
  size = "md",
  className,
}: {
  status: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const info = STATUS_MAP[status] ?? { variant: "neutral" as Variant, label: status.replace(/_/g, " ") };
  return (
    <Badge variant={info.variant} size={size} className={className}>
      {info.label}
    </Badge>
  );
}
