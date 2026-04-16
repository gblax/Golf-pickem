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

    const statusName = String(statusType?.name || "");
    const isWithdrawn = statusName === "WD" || statusName === "DQ";
    const missedCut = statusName === "CUT";

    let madeTheCut: boolean | null = null;
    if (missedCut) madeTheCut = false;
    else if (statusName === "active" || statusName === "complete")
      madeTheCut = true;

    const linescores = c.linescores as { value?: number }[] | undefined;
    const currentRound = linescores?.length ?? null;

    // Only trust score and position data if the golfer has actually teed
    // off (at least one round in linescores). Before the tournament starts,
    // ESPN returns "0" for score and field-seed order for position — both
    // are meaningless and confuse the leaderboard.
    const hasPlayed = currentRound !== null && currentRound > 0;
    const scoreStr = (c.score as string) || "";
    let scoreToPar: number | null = null;
    if (hasPlayed && scoreStr) {
      scoreToPar = scoreStr === "E" ? 0 : parseInt(scoreStr, 10);
      if (isNaN(scoreToPar)) scoreToPar = null;
    }

    return {
      id: String(athlete?.id || c.id),
      name: String(athlete?.displayName || athlete?.shortName || "Unknown"),
      position: hasPlayed ? String(c.order || "") : "",
      scoreToPar,
      currentRound,
      thru: hasPlayed ? String(status?.displayValue || "") : "",
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

const ESPN_CORE_BASE = "https://sports.core.api.espn.com/v2/sports/golf/leagues/pga";

export type ESPNOddsEntry = {
  athleteId: string; // numeric ESPN athlete id (matches ESPNGolfer.id)
  value: string; // American odds string: "+1200", "-110", "EVEN"
};

export type ESPNOddsResult = {
  provider: string | null;
  entries: ESPNOddsEntry[];
};

/**
 * Normalize a futures market name ("2026 RBC Heritage Winner") or a tournament
 * display name ("RBC Heritage") to a comparable form by stripping year prefixes,
 * trailing "winner", and collapsing whitespace.
 */
function normalizeEventName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^\s*20\d{2}\s+/, "")
    .replace(/\s+winner\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch outright winner odds for a PGA tournament from ESPN's core v2 futures
 * feed. Matches the tournament by fuzzy name comparison — the feed has no
 * event id FK. Picks the provider with the most athlete entries for best
 * coverage. Returns an empty result (not an error) if no matching market is
 * found, since new tournaments may not have a futures market posted yet.
 */
export async function fetchOutrightOdds(
  eventName: string
): Promise<ESPNOddsResult> {
  const res = await fetch(`${ESPN_CORE_BASE}/futures`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`ESPN futures API error: ${res.status}`);

  const data = await res.json();
  const items = (data.items as Record<string, unknown>[] | undefined) ?? [];

  const target = normalizeEventName(eventName);
  if (!target) return { provider: null, entries: [] };

  // Find the best-matching Winner market for this tournament.
  const match = items.find((item) => {
    const name = normalizeEventName(String(item.name ?? ""));
    return (
      name === target ||
      name === `${target}` ||
      name.includes(target) ||
      target.includes(name)
    );
  });

  if (!match) return { provider: null, entries: [] };

  const providers =
    (match.futures as Record<string, unknown>[] | undefined) ??
    (match.books as Record<string, unknown>[] | undefined) ??
    [];

  type ProviderPick = {
    name: string | null;
    priority: number;
    entries: ESPNOddsEntry[];
  };

  let best: ProviderPick | null = null;

  for (const p of providers) {
    // Per-provider price list can be under `books` or `futures` depending on
    // which ESPN surface is serving the payload.
    const prices =
      (p.books as Record<string, unknown>[] | undefined) ??
      (p.futures as Record<string, unknown>[] | undefined) ??
      [];

    const entries: ESPNOddsEntry[] = [];
    for (const price of prices) {
      const athleteRef = (price.athlete as { $ref?: string } | undefined)?.$ref;
      const value = price.value;
      if (!athleteRef || typeof value !== "string") continue;
      const idMatch = athleteRef.match(/\/athletes\/(\d+)/);
      if (!idMatch) continue;
      entries.push({ athleteId: idMatch[1], value });
    }

    if (entries.length === 0) continue;

    const provider = p.provider as
      | { name?: string; priority?: number }
      | undefined;
    const pick: ProviderPick = {
      name: provider?.name ?? null,
      priority: provider?.priority ?? Number.MAX_SAFE_INTEGER,
      entries,
    };

    if (
      !best ||
      pick.entries.length > best.entries.length ||
      (pick.entries.length === best.entries.length &&
        pick.priority < best.priority)
    ) {
      best = pick;
    }
  }

  if (!best) return { provider: null, entries: [] };
  return { provider: best.name, entries: best.entries };
}
