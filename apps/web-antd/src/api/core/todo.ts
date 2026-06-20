import { requestClient } from '#/api/request';

export async function getTaskColumnList(data: any) {
  return await requestClient.post('/taskColumn/query', data);
}

export async function saveColumn(data: any) {
  return await requestClient.post('/taskColumn/save', data);
}

export async function updateColumn(data: any) {
  return await requestClient.post('/taskColumn/update', data);
}

export async function deleteColumn(data: any) {
  return await requestClient.post('/taskColumn/delete', data);
}

export async function reSortColumn(data: any) {
  return await requestClient.post('/taskColumn/reSort', data);
}

export interface Detail {
  id: string;
  taskId: string;
  content: string;
  isCompleted: number; // 0: uncompleted, 1: completed
  priority: number; // 1: very important, 10: important, 20: normal
  isStarred?: number; // 0: not starred, 1: starred
  startTime?: string;
  endTime?: string;
}

export interface Task {
  id: string;
  columnId: string;
  content: string;
  detail?: string;
  startTime?: string;
  endTime?: string;
  dueDate?: string;
  details?: Detail[];
  unCompletedCount?: number;
}

export interface TaskListResult {
  items: Task[];
}

export async function getTaskList(data: any) {
  return await requestClient.get<TaskListResult>('/tasks', { params: data });
}

export async function getTaskDetail(taskId: string) {
  return await requestClient.get<Detail[]>('/taskDetails', {
    params: { taskId },
  });
}

export async function addTaskDetail(data: Partial<Detail>) {
  return await requestClient.post<Detail>('/taskDetails', data);
}

export async function updateTaskDetail(data: Partial<Detail>) {
  return await requestClient.put<boolean>('/taskDetails', data);
}

export async function deleteTaskDetail(id: string) {
  return await requestClient.delete<void>(`/taskDetails/${id}`);
}

export async function reSortTaskDetail(data: any) {
  return await requestClient.post('/taskDetails/reSort', data);
}

export async function starTaskDetail(id: string) {
  return await requestClient.post<boolean>(`/taskDetails/star/${id}`);
}

export async function unstarTaskDetail(id: string) {
  return await requestClient.post<boolean>(`/taskDetails/unstar/${id}`);
}

export async function saveTask(data: any) {
  return await requestClient.post('/tasks/save', data);
}

export async function updateTask(data: any) {
  return await requestClient.post('/tasks/update', data);
}

export async function deleteTask(data: any) {
  return await requestClient.post('/tasks/delete', data);
}

export async function reSortTask(data: any) {
  return await requestClient.post('/tasks/reSort', data);
}
