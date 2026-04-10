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
