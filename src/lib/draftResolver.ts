/**
 * Resolves expired draft picks by disqualifying users who missed their window.
 *
 * When a user is on the clock and their pick deadline passes, they are
 * removed from the draft entirely: their WeekEntry is deleted (pulling
 * their buy-in out of the pool) and any picks they had already made are
 * released back to the available pool.
 *
 * This runs lazily on every draft read/write. There is no scheduler —
 * the next request to the draft is what advances things.
 */

import { prisma } from "./prisma";
import { isDraftComplete } from "./draft";

const MAX_CASCADE_ITERATIONS = 50;

export async function resolveExpiredPicks(tournamentId: string): Promise<{
  disqualified: string[];
  draftCompleted: boolean;
}> {
  const disqualified: string[] = [];
  let draftCompleted = false;

  for (let i = 0; i < MAX_CASCADE_ITERATIONS; i++) {
    const draft = await prisma.draft.findUnique({ where: { tournamentId } });
    if (!draft) return { disqualified, draftCompleted };
    if (draft.status !== "IN_PROGRESS") return { disqualified, draftCompleted };
    if (!draft.currentPickDeadline) return { disqualified, draftCompleted };
    if (draft.currentPickDeadline.getTime() > Date.now()) {
      return { disqualified, draftCompleted };
    }

    const draftOrder = JSON.parse(draft.draftOrder) as string[];
    if (draftOrder.length === 0) return { disqualified, draftCompleted };

    // Figure out who's on the clock right now (same math as getCurrentPick
    // but we need it inline so we can cross-reference the array).
    const n = draftOrder.length;
    const idx = draft.currentPickIndex;
    let expiredUserId: string | null = null;
    if (idx < n) {
      // Round 1: 0..n-1 in order
      expiredUserId = draftOrder[idx];
    } else if (idx < 2 * n) {
      // Round 2: snake, n-1..0
      expiredUserId = draftOrder[2 * n - 1 - idx];
    }
    if (!expiredUserId) return { disqualified, draftCompleted };

    const expiredDeadline = draft.currentPickDeadline;
    const pickTimeLimit = draft.pickTimeLimit;

    const newDraftOrder = draftOrder.filter((id) => id !== expiredUserId);

    await prisma.$transaction(async (tx) => {
      // Remove any DraftPicks the user already made in this draft. Their
      // paired Pick rows hang off WeekEntry and will cascade when we
      // delete the WeekEntry.
      await tx.draftPick.deleteMany({
        where: { draftId: draft.id, userId: expiredUserId! },
      });

      // Remove their WeekEntry (cascades Pick rows). Ignore if it's
      // already gone — the admin may have cleared it manually.
      await tx.weekEntry
        .delete({
          where: {
            userId_tournamentId: {
              userId: expiredUserId!,
              tournamentId,
            },
          },
        })
        .catch(() => undefined);

      // After removing their picks, the next pickIndex is simply the
      // count of remaining DraftPicks — picks are always made in
      // sequence, so count == index of next pick.
      const newPickCount = await tx.draftPick.count({
        where: { draftId: draft.id },
      });

      const isComplete =
        newDraftOrder.length === 0 ||
        isDraftComplete(newDraftOrder, newPickCount);

      // Extend the next picker's deadline from the expired deadline,
      // not from "now". This way if the resolver runs late (e.g. an
      // async draft that nobody loaded for hours), cascading DQs can
      // still fire on this same call.
      const nextDeadline = isComplete
        ? null
        : new Date(expiredDeadline.getTime() + pickTimeLimit * 1000);

      // Determine new currentRound for display
      let newRound = draft.currentRound;
      if (!isComplete && newDraftOrder.length > 0) {
        newRound = newPickCount < newDraftOrder.length ? 1 : 2;
      }

      await tx.draft.update({
        where: { id: draft.id },
        data: {
          draftOrder: JSON.stringify(newDraftOrder),
          currentPickIndex: newPickCount,
          currentRound: newRound,
          currentPickDeadline: nextDeadline,
          ...(isComplete
            ? { status: "COMPLETE", completedAt: new Date() }
            : {}),
        },
      });

      if (isComplete) {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: "IN_PROGRESS" },
        });
      }
    });

    disqualified.push(expiredUserId);

    // Check whether the draft just finished — if so, stop looping.
    const refreshed = await prisma.draft.findUnique({ where: { tournamentId } });
    if (!refreshed || refreshed.status !== "IN_PROGRESS") {
      draftCompleted = true;
      return { disqualified, draftCompleted };
    }
    // Otherwise continue — the next picker's deadline may also already
    // be in the past, in which case we'll DQ them next iteration.
  }

  return { disqualified, draftCompleted };
}
