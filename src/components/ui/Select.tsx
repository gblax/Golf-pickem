import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "block w-full rounded-md border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-stone-50 disabled:text-stone-500",
        error
          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
          : "border-stone-300 focus:border-emerald-600 focus:ring-emerald-100",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

export default Select;
