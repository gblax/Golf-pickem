import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Place = 1 | 2 | 3;

const styles: Record<Place, string> = {
  1: "bg-gradient-to-br from-gold-300 to-gold-500 text-stone-900 ring-gold-500/40",
  2: "bg-gradient-to-br from-stone-200 to-stone-400 text-stone-900 ring-stone-400/40",
  3: "bg-gradient-to-br from-amber-300 to-amber-600 text-stone-900 ring-amber-600/40",
};

export default function MedalBadge({
  place,
  className,
  showIcon = true,
}: {
  place: number;
  className?: string;
  showIcon?: boolean;
}) {
  if (place < 1 || place > 3) {
    return (
      <span
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700",
          className
        )}
      >
        {place}
      </span>
    );
  }
  const p = place as Place;
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-sm ring-2",
        styles[p],
        className
      )}
      aria-label={`Rank ${place}`}
    >
      {showIcon ? <Trophy className="h-4 w-4" /> : place}
    </span>
  );
}
