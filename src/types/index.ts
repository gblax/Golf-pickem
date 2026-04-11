export const TOURNAMENT_STATUS = {
  UPCOMING: "UPCOMING",
  DRAFT_OPEN: "DRAFT_OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETE: "COMPLETE",
} as const;

export type TournamentStatus =
  (typeof TOURNAMENT_STATUS)[keyof typeof TOURNAMENT_STATUS];

export const DRAFT_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETE: "COMPLETE",
} as const;

export type DraftStatus = (typeof DRAFT_STATUS)[keyof typeof DRAFT_STATUS];

export const DRAFT_MODE = {
  LIVE: "LIVE",
  ASYNC: "ASYNC",
} as const;

export type DraftMode = (typeof DRAFT_MODE)[keyof typeof DRAFT_MODE];
