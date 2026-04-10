export type PayoutTier = {
  position: number;
  amount: number; // in cents
};

export function calculatePayouts(
  numEntrants: number,
  buyIn: number // in cents
): PayoutTier[] {
  const pool = numEntrants * buyIn;

  if (numEntrants <= 0) return [];

  if (numEntrants <= 4) {
    // Winner takes all
    return [{ position: 1, amount: pool }];
  }

  let percentages: number[];

  if (numEntrants <= 9) {
    // Top 2: 70% / 30%
    percentages = [0.7, 0.3];
  } else if (numEntrants <= 15) {
    // Top 3: 60% / 27% / 13%
    percentages = [0.6, 0.27, 0.13];
  } else {
    // Top 4: 50% / 25% / 15% / 10%
    percentages = [0.5, 0.25, 0.15, 0.1];
  }

  const tiers = percentages.map((pct, i) => ({
    position: i + 1,
    amount: Math.floor(pool * pct),
  }));

  // Give any remainder from rounding to 1st place
  const totalPaid = tiers.reduce((sum, t) => sum + t.amount, 0);
  const remainder = pool - totalPaid;
  if (remainder > 0) {
    tiers[0].amount += remainder;
  }

  return tiers;
}

export function resolvePayoutsWithTies(
  payoutTiers: PayoutTier[],
  ranks: { userId: string; rank: number }[]
): { userId: string; amount: number }[] {
  const results: { userId: string; amount: number }[] = [];
  const maxPaidPosition = payoutTiers[payoutTiers.length - 1]?.position ?? 0;

  // Group users by rank
  const rankGroups = new Map<number, string[]>();
  for (const { userId, rank } of ranks) {
    if (rank > maxPaidPosition) continue;
    const group = rankGroups.get(rank) || [];
    group.push(userId);
    rankGroups.set(rank, group);
  }

  for (const [rank, userIds] of rankGroups) {
    // Find which payout positions this tied rank spans
    // E.g., 2 players tied for 1st span positions 1 and 2
    const positionsSpanned: number[] = [];
    for (let p = rank; p < rank + userIds.length && p <= maxPaidPosition; p++) {
      positionsSpanned.push(p);
    }

    // Sum the payouts for those positions and split evenly
    const totalForGroup = positionsSpanned.reduce((sum, pos) => {
      const tier = payoutTiers.find((t) => t.position === pos);
      return sum + (tier?.amount ?? 0);
    }, 0);

    const perPlayer = Math.floor(totalForGroup / userIds.length);
    for (const userId of userIds) {
      if (perPlayer > 0) {
        results.push({ userId, amount: perPlayer });
      }
    }
  }

  return results;
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
