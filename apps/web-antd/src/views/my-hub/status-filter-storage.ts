const VALID_STATUS_VALUES = new Set([0, 1, 2, 3]);

export function loadStatusFilter(storageKey: string): number[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (status): status is number =>
        typeof status === 'number' && VALID_STATUS_VALUES.has(status),
    );
  } catch {
    return [];
  }
}

export function saveStatusFilter(storageKey: string, statuses: number[]) {
  localStorage.setItem(storageKey, JSON.stringify(statuses));
}
