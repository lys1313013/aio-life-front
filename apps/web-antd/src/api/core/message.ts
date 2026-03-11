import { requestClient } from '#/api/request';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  title: string;
  content: string;
  type: number;
  isRead: boolean;
  createTime: string;
  updateTime: string;
  avatar?: string;
}

export async function getMessageListApi() {
  return requestClient.get<Message[]>('/message/list');
}

export async function getUnreadCountApi() {
  return requestClient.get<{ count: number }>('/message/unread-count');
}

export async function markAsReadApi(id: string) {
  return requestClient.put(`/message/read/${id}`);
}

export async function markAllAsReadApi() {
  return requestClient.put('/message/read-all');
}

export async function deleteMessageApi(id: string) {
  return requestClient.delete(`/message/${id}`);
}

export async function createMessageApi(data: Partial<Message>) {
  return requestClient.post<Message[]>('/message', data);
}

export interface SendMessageParams {
  receiverId: string;
  senderId?: string;
  title: string;
  content: string;
  type?: number;
  avatar?: string;
}

export interface MessagePageResult {
  records: Message[];
  total: number;
  current: number;
  size: number;
}

export async function adminGetMessageListApi(params: { userId?: string; current?: number; size?: number }) {
  return requestClient.get<MessagePageResult>('/message/admin/list', { params });
}

export async function adminSendMessageApi(data: SendMessageParams) {
  return requestClient.post('/message/admin/send', data);
}

export async function adminDeleteMessageApi(id: string) {
  return requestClient.delete(`/message/admin/${id}`);
}
