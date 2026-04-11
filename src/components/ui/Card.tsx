import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type CardAccent = "none" | "gold" | "emerald" | "rose" | "stone";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: CardAccent;
  interactive?: boolean;
}

const accentClasses: Record<CardAccent, string> = {
  none: "",
  gold: "border-l-4 border-l-gold-400",
  emerald: "border-l-4 border-l-emerald-600",
  rose: "border-l-4 border-l-rose-500",
  stone: "border-l-4 border-l-stone-400",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, accent = "none", interactive, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-stone-200 bg-white shadow-sm",
        interactive && "transition-shadow hover:shadow-md",
        accentClasses[accent],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export function CardHeader({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-stone-100 px-5 py-4",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "font-display text-xl font-semibold text-stone-900",
        className
      )}
      {...rest}
    >
      {children}
    </h2>
  );
}

export function CardDescription({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-stone-500", className)} {...rest}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 py-4", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-stone-100 px-5 py-3",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
