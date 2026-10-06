import type { ApiRequests } from '#/api/payload';

import { pickPayload, pickPayloadList } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

export interface TaskColumnQuery {
  page?: number;
  pageSize?: number;
}

export interface TaskQuery {
  get?: number;
  pageSize?: number;
  taskId?: string;
}

export interface TaskColumn {
  id: string;
  title: string;
  sortOrder?: number;
  bgColor?: string;
}

export interface TaskColumnListResult {
  items: TaskColumn[];
  total: null | number;
}

export async function getTaskColumnList(params: TaskColumnQuery = {}) {
  return await getQuery<TaskColumnListResult>('/taskColumn/query', params);
}

export async function saveColumn(data: ApiRequests['TaskColumnCreateReq']) {
  return await requestClient.post<TaskColumn>(
    '/taskColumn',
    pickPayload('TaskColumnCreateReq', data),
  );
}

export async function updateColumn(
  data: ApiRequests['TaskColumnUpdateReq'] & { id: string },
) {
  return await requestClient.put<boolean>(
    `/taskColumn/${data.id}`,
    pickPayload('TaskColumnUpdateReq', data),
  );
}

export async function deleteColumn(id: string) {
  return await requestClient.delete<void>(`/taskColumn/${id}`);
}

export async function reSortColumn(data: ApiRequests['TaskColumnSortReq'][]) {
  return await requestClient.post<void>(
    '/taskColumn/reSort',
    pickPayloadList('TaskColumnSortReq', data),
  );
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
  total: null | number;
}

export async function getTaskList(params: TaskQuery = {}) {
  return await requestClient.get<TaskListResult>('/tasks', { params });
}

export async function getTaskDetail(taskId: string) {
  return await requestClient.get<Detail[]>('/taskDetails', {
    params: { taskId },
  });
}

export async function addTaskDetail(data: ApiRequests['TaskDetailCreateReq']) {
  return await requestClient.post<Detail>(
    '/taskDetails',
    pickPayload('TaskDetailCreateReq', data),
  );
}

export async function updateTaskDetail(
  data: ApiRequests['TaskDetailUpdateReq'],
) {
  return await requestClient.put<boolean>(
    '/taskDetails',
    pickPayload('TaskDetailUpdateReq', data),
  );
}

export async function deleteTaskDetail(id: string) {
  return await requestClient.delete<void>(`/taskDetails/${id}`);
}

export async function reSortTaskDetail(
  data: ApiRequests['TaskDetailSortReq'][],
) {
  return await requestClient.post<void>(
    '/taskDetails/reSort',
    pickPayloadList('TaskDetailSortReq', data),
  );
}

export async function starTaskDetail(id: string) {
  return await requestClient.post<boolean>(`/taskDetails/star/${id}`);
}

export async function unstarTaskDetail(id: string) {
  return await requestClient.post<boolean>(`/taskDetails/unstar/${id}`);
}

export async function saveTask(data: ApiRequests['TaskCreateReq']) {
  return await requestClient.post<Task>(
    '/tasks',
    pickPayload('TaskCreateReq', data),
  );
}

export async function updateTask(
  data: ApiRequests['TaskUpdateReq'] & { id: string },
) {
  return await requestClient.put<boolean>(
    `/tasks/${data.id}`,
    pickPayload('TaskUpdateReq', data),
  );
}

export async function deleteTask(id: string) {
  return await requestClient.delete<void>(`/tasks/${id}`);
}

export async function reSortTask(data: ApiRequests['TaskSortReq'][]) {
  return await requestClient.post<void>(
    '/tasks/reSort',
    pickPayloadList('TaskSortReq', data),
  );
}
