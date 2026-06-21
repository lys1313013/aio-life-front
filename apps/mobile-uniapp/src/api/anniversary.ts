import { get, post, put } from "../utils/request";

export interface AnniversaryRecord {
  id?: string;
  title: string;
  targetDate: string;
  type: 'anniversary' | 'countdown';
  note?: string;
  color?: string;
  icon?: string;
}

export async function getAnniversaryRecords() {
  return get<AnniversaryRecord[]>('/anniversaryRecords');
}

export async function createAnniversaryRecord(data: Partial<AnniversaryRecord>) {
  return post<AnniversaryRecord>('/anniversaryRecords', data);
}

export async function updateAnniversaryRecord(data: Partial<AnniversaryRecord>) {
  return put<AnniversaryRecord>('/anniversaryRecords', data);
}

export async function deleteAnniversaryRecords(idList: string[]) {
  return post<void>(`/anniversaryRecords/batchDelete`, { idList });
}
