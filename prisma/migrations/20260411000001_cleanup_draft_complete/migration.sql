-- Transition any tournaments still marked DRAFT_COMPLETE to IN_PROGRESS.
-- DRAFT_COMPLETE is no longer a valid status.
UPDATE "Tournament" SET "status" = 'IN_PROGRESS' WHERE "status" = 'DRAFT_COMPLETE';
