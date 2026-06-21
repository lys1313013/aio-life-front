import { get, post } from "../utils/request";

export interface ExerciseDetail {
  exerciseTypeId: string;
  exerciseCount?: number;
}

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
  exercises?: ExerciseDetail[];
  relateId?: string;
  relateType?: number;
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

export async function getRelateTypes() {
  return await get<Array<{ label: string; value: number }>>('/timeRecord/relateTypes');
}
