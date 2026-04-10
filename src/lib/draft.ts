/**
 * Snake draft logic for golf pick-em.
 *
 * Round 1: picks go 1 -> N in order
 * Round 2: picks go N -> 1 (snake back)
 *
 * Each player makes exactly 2 picks total.
 */

export function generateDraftOrder(userIds: string[]): string[] {
  // Fisher-Yates shuffle for random draft order
  const shuffled = [...userIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getPickSequence(draftOrder: string[]): {
  userId: string;
  round: number;
  overallPick: number;
}[] {
  const n = draftOrder.length;
  const sequence: { userId: string; round: number; overallPick: number }[] = [];

  // Round 1: 0, 1, 2, ..., N-1
  for (let i = 0; i < n; i++) {
    sequence.push({
      userId: draftOrder[i],
      round: 1,
      overallPick: i + 1,
    });
  }

  // Round 2 (snake): N-1, N-2, ..., 0
  for (let i = n - 1; i >= 0; i--) {
    sequence.push({
      userId: draftOrder[i],
      round: 2,
      overallPick: n + (n - i),
    });
  }

  return sequence;
}

export function getCurrentPick(
  draftOrder: string[],
  currentPickIndex: number
): { userId: string; round: number; overallPick: number } | null {
  const sequence = getPickSequence(draftOrder);
  if (currentPickIndex >= sequence.length) return null;
  return sequence[currentPickIndex];
}

export function isDraftComplete(
  draftOrder: string[],
  currentPickIndex: number
): boolean {
  return currentPickIndex >= draftOrder.length * 2;
}

export function getPickDeadline(
  pickTimeLimit: number
): Date {
  return new Date(Date.now() + pickTimeLimit * 1000);
}
