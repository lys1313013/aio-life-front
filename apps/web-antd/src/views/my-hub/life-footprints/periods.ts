import type { Draft, Footprint } from './model';

import type { LifeFootprintBatchSaveReq } from '#/api/payload';

import { draftPayload, sortFootprints } from './model';

export interface FootprintPeriod {
  key: string;
  startDate: string;
  endDate: string;
  records: Footprint[];
}

export interface DetailDraft {
  key: string;
  value: Draft;
}

export function periodKey(record: { endDate: string; startDate: string }) {
  return `${record.startDate}/${record.endDate}`;
}

/** 时间仅在展示层分组；重叠日期和相同地点都不合并业务记录。 */
export function groupPeriods(records: Footprint[]): FootprintPeriod[] {
  const periods = new Map<string, FootprintPeriod>();
  for (const record of sortFootprints(records)) {
    const key = periodKey(record);
    const group = periods.get(key);
    if (group) group.records.push(record);
    else
      periods.set(key, {
        key,
        startDate: record.startDate,
        endDate: record.endDate,
        records: [record],
      });
  }
  return [...periods.values()];
}

export function batchPayload(
  period: Pick<FootprintPeriod, 'endDate' | 'startDate'>,
  details: DetailDraft[],
  deletedIds: string[],
): LifeFootprintBatchSaveReq {
  if (details.length > 200 || deletedIds.length > 200)
    throw new Error('一次最多保存或删除200条明细');
  if (details.length === 0 && deletedIds.length === 0)
    throw new Error('请添加至少一条明细');
  return {
    items: details.map(({ value }) => ({
      ...draftPayload({ ...value, ...period }),
      ...(value.id ? { id: value.id } : {}),
    })),
    deletedIds: [...deletedIds],
  };
}

/** 返回值只替换本次提交的明细；不覆盖请求期间新出现的其他记录。 */
export function mergeBatchResult(
  records: Footprint[],
  saved: Footprint[],
  deletedIds: string[],
) {
  const replaced = new Set([...deletedIds, ...saved.map((r) => r.id)]);
  return sortFootprints([
    ...records.filter((r) => !replaced.has(r.id)),
    ...saved,
  ]);
}
