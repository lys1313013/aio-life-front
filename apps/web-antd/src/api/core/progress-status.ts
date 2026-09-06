export const PROGRESS_STATUS = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  NOT_STARTED: 'not_started',
  ON_HOLD: 'on_hold',
} as const;

export type ProgressStatus =
  (typeof PROGRESS_STATUS)[keyof typeof PROGRESS_STATUS];
