import type { ProgressStatus } from '#/api/core/progress-status';

import { PROGRESS_STATUS } from '#/api/core/progress-status';

const VALID_STATUS_VALUES = new Set<ProgressStatus>(
  Object.values(PROGRESS_STATUS),
);

export function loadStatusFilter(storageKey: string): ProgressStatus[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
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
