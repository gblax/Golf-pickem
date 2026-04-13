const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/golf/pga";

export type ESPNTournament = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type ESPNGolfer = {
  id: string;
  name: string;
  position: string;
  scoreToPar: number | null;
  currentRound: number | null;
  thru: string | null;
  madeTheCut: boolean | null;
  isWithdrawn: boolean;
};

export async function fetchTournaments(): Promise<ESPNTournament[]> {
  const res = await fetch(`${ESPN_BASE}/scoreboard`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);

  const data = await res.json();
  const events = data.events || [];

  return events.map((event: Record<string, unknown>) => ({
    id: String(event.id),
    name: String(event.name),
    startDate: String(event.date),
    endDate: String(
      (event as Record<string, unknown>).endDate || event.date
    ),
  }));
}

function formatEspnDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Fetch all PGA events from today through end of the current year.
 * ESPN's /scoreboard endpoint accepts `?dates=YYYYMMDD-YYYYMMDD`.
 * If a full-year range returns nothing or errors, fall back to month-by-month.
 */
export async function fetchSchedule(): Promise<ESPNTournament[]> {
  const now = new Date();
  const endOfYear = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));

  // First attempt: full range in one request.
  try {
    const events = await fetchEventsInRange(now, endOfYear);
    if (events.length > 0) return dedupeById(events);
  } catch (err) {
    console.warn("Full-year ESPN schedule fetch failed, falling back:", err);
  }

  // Fallback: iterate month-by-month and concatenate.
  const all: ESPNTournament[] = [];
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  while (cursor <= endOfYear) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)
    );
    try {
      const monthEvents = await fetchEventsInRange(
        monthStart < now ? now : monthStart,
        monthEnd
      );
      all.push(...monthEvents);
    } catch (err) {
      console.warn(`ESPN month fetch failed for ${formatEspnDate(monthStart)}:`, err);
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return dedupeById(all);
}

async function fetchEventsInRange(
  start: Date,
  end: Date
): Promise<ESPNTournament[]> {
  const dates = `${formatEspnDate(start)}-${formatEspnDate(end)}`;
  const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${dates}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);

  const data = await res.json();
  const events = data.events || [];

  return events.map((event: Record<string, unknown>) => ({
    id: String(event.id),
    name: String(event.name),
    startDate: String(event.date),
    endDate: String(
      (event as Record<string, unknown>).endDate || event.date
    ),
  }));
}

function dedupeById(events: ESPNTournament[]): ESPNTournament[] {
  const seen = new Map<string, ESPNTournament>();
  for (const ev of events) {
    if (!seen.has(ev.id)) seen.set(ev.id, ev);
  }
  return Array.from(seen.values());
}

export async function fetchTournamentField(
  eventId: string
): Promise<ESPNGolfer[]> {
  const res = await fetch(`${ESPN_BASE}/scoreboard?event=${eventId}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);

  const data = await res.json();
  const event = data.events?.[0];
  if (!event) throw new Error("Event not found");

  // ESPN silently returns the current event when the requested one has no data yet
  if (String(event.id) !== String(eventId)) {
    return [];
  }

  const competitors =
    event.competitions?.[0]?.competitors || [];

  return competitors.map((c: Record<string, unknown>) => {
    const athlete = c.athlete as Record<string, unknown> | undefined;
    const status = c.status as Record<string, unknown> | undefined;
    const statusType = status?.type as Record<string, unknown> | undefined;

    const scoreStr = (c.score as string) || "0";
    const scoreToPar = scoreStr === "E" ? 0 : parseInt(scoreStr, 10);

    const statusName = String(statusType?.name || "");
    const isWithdrawn = statusName === "WD" || statusName === "DQ";
    const missedCut = statusName === "CUT";

    let madeTheCut: boolean | null = null;
    if (missedCut) madeTheCut = false;
    else if (statusName === "active" || statusName === "complete")
      madeTheCut = true;

    const linescores = c.linescores as { value?: number }[] | undefined;
    const currentRound = linescores?.length ?? null;

    return {
      id: String(athlete?.id || c.id),
      name: String(athlete?.displayName || athlete?.shortName || "Unknown"),
      position: String(c.order || ""),
      scoreToPar: isNaN(scoreToPar) ? null : scoreToPar,
      currentRound,
      thru: String(status?.displayValue || ""),
      madeTheCut,
      isWithdrawn,
    };
  });
}

export async function fetchLiveScores(
  eventId: string
): Promise<ESPNGolfer[]> {
  // Same endpoint, same parsing — just called during tournament
  return fetchTournamentField(eventId);
}
