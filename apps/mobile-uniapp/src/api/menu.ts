import { get, post, put, del } from '@/utils/request';

export async function getAllMenusApi() {
  return get('/menu/all');
}

export async function getMenuAdminTreeApi() {
  return get('/menu/admin/tree');
}
