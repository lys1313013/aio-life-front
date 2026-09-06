import type { ProgressStatus } from '#/api/core/progress-status';

import { PROGRESS_STATUS } from '#/api/core/progress-status';

const VALID_STATUS_VALUES = new Set<ProgressStatus>(
  Object.values(PROGRESS_STATUS),
);

const LEGACY_STATUS_VALUES: Record<number, ProgressStatus> = {
  0: PROGRESS_STATUS.NOT_STARTED,
  1: PROGRESS_STATUS.IN_PROGRESS,
  2: PROGRESS_STATUS.COMPLETED,
  3: PROGRESS_STATUS.ON_HOLD,
};

export function loadStatusFilter(storageKey: string): ProgressStatus[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((status) =>
        typeof status === 'number' ? LEGACY_STATUS_VALUES[status] : status,
      )
      .filter(
        (status): status is ProgressStatus =>
          typeof status === 'string' &&
          VALID_STATUS_VALUES.has(status as ProgressStatus),
      );
  } catch {
    return [];
  }
}

export function saveStatusFilter(
  storageKey: string,
  statuses: ProgressStatus[],
) {
  localStorage.setItem(storageKey, JSON.stringify(statuses));
}
