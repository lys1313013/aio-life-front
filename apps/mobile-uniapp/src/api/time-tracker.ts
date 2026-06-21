import { get, post } from "../utils/request";

export interface TimeRecordEntity {
  id?: string;
  userId?: number;
  categoryId: string;
  date: string;
  startTime: number;
  endTime: number;
  title: string;
  description?: string;
  duration: number;
  isManual?: number;
}

export async function queryTimeTrackerByDate(date: string) {
  return await post<any>("/timeRecord/query", { condition: { date } });
}

export async function saveTimeRecord(data: Partial<TimeRecordEntity>) {
  return await post<boolean>("/timeRecord/save", data);
}

export async function updateTimeRecord(data: Partial<TimeRecordEntity>) {
  return await post<void>("/timeRecord/update", data);
}

export async function deleteTimeRecord(id: string) {
  return await post<void>("/timeRecord/delete", { id });
}
