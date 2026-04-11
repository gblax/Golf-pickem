import { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "info" | "success" | "warning" | "error";

export interface AlertProps {
  variant?: Variant;
  title?: string;
  children?: ReactNode;
  className?: string;
  onDismiss?: () => void;
}

const config: Record<
  Variant,
  { classes: string; iconClass: string; Icon: typeof Info }
> = {
  info: {
    classes: "bg-sky-50 border-sky-200 text-sky-900",
    iconClass: "text-sky-600",
    Icon: Info,
  },
  success: {
    classes: "bg-emerald-50 border-emerald-200 text-emerald-900",
    iconClass: "text-emerald-600",
    Icon: CheckCircle2,
  },
  warning: {
    classes: "bg-amber-50 border-amber-200 text-amber-900",
    iconClass: "text-amber-600",
    Icon: AlertTriangle,
  },
  error: {
    classes: "bg-rose-50 border-rose-200 text-rose-900",
    iconClass: "text-rose-600",
    Icon: XCircle,
  },
};

export default function Alert({
  variant = "info",
  title,
  children,
  className,
  onDismiss,
}: AlertProps) {
  const { classes, iconClass, Icon } = config[variant];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        classes,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", iconClass)} />
      <div className="flex-1 text-sm">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="rounded-md p-1 hover:bg-white/50"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
