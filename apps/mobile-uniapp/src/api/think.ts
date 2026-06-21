import { get, post } from "../utils/request";

export function queryThoughts(data: any) {
  return post<any>('/thought/query', data);
}

export function saveThought(data: any) {
  return post<any>('/thought/save', data);
}

export function updateThought(data: any) {
  return post<any>('/thought/update', data);
}

export function getPinnedThoughts() {
  return get<any>('/thought/dashboard');
}

export function deleteThought(data: any) {
  return post<any>('/thought/batchDelete', data);
}
