import { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export default function Label({
  className,
  children,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-stone-700",
        className
      )}
      {...rest}
    >
      {children}
    </label>
  );
}
