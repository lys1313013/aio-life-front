import { get } from "../utils/request";

export interface TimeTrackerCategoryEntity {
  id?: string;
  name: string;
  color: string;
  icon?: string;
}

export async function listCategories() {
  return await get<TimeTrackerCategoryEntity[]>("/timeTrackerCategory/list");
}
