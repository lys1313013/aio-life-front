import { get, post, request } from '../utils/request';

export interface TaskColumn {
  id: string;
  name: string;
  color?: string;
  sort?: number;
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

export function getTaskColumnList(data: any = {}) {
  return post('/taskColumn/query', data);
}

export function getTaskList(data: any = {}) {
  return get<TaskListResult>('/tasks', data);
}

export function saveTask(data: any) {
  return post('/tasks/save', data);
}

export function updateTask(data: any) {
  return post('/tasks/update', data);
}

export function deleteTask(data: any) {
  return post('/tasks/delete', data);
}

export function getTaskDetail(taskId: string) {
  return get<Detail[]>('/taskDetails', { taskId });
}

export function addTaskDetail(data: Partial<Detail>) {
  return post<Detail>('/taskDetails', data);
}

export function updateTaskDetail(data: Partial<Detail>) {
  return request<boolean>({ url: '/taskDetails', method: 'PUT', data });
}

export function deleteTaskDetail(id: string) {
  return request<void>({ url: `/taskDetails/${id}`, method: 'DELETE' });
}
