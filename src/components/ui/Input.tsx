import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, type = "text", ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "block w-full rounded-md border bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-stone-50 disabled:text-stone-500",
        error
          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
          : "border-stone-300 focus:border-emerald-600 focus:ring-emerald-100",
        className
      )}
      {...rest}
    />
  );
});

export default Input;
