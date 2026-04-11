export function formatScore(scoreToPar: number | null): string {
  if (scoreToPar === null) return "-";
  if (scoreToPar === 0) return "E";
  if (scoreToPar > 0) return `+${scoreToPar}`;
  return String(scoreToPar);
}

export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const TOURNAMENT_STATUS_PRIORITY: Record<string, number> = {
  IN_PROGRESS: 0,
  DRAFT_OPEN: 1,
  UPCOMING: 2,
  COMPLETE: 3,
};

/**
 * Sort tournaments so active and upcoming appear first (soonest first),
 * then completed tournaments (most recent first).
 */
export function sortTournamentsByRelevance<
  T extends { status: string; startDate: Date | string },
>(tournaments: T[]): T[] {
  return [...tournaments].sort((a, b) => {
    const pa = TOURNAMENT_STATUS_PRIORITY[a.status] ?? 99;
    const pb = TOURNAMENT_STATUS_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;

    const ta = new Date(a.startDate).getTime();
    const tb = new Date(b.startDate).getTime();
    // Completed: most recent first (DESC). Everything else: soonest first (ASC).
    if (pa === TOURNAMENT_STATUS_PRIORITY.COMPLETE) return tb - ta;
    return ta - tb;
  });
}
