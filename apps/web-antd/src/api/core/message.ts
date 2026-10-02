import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
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
  avatar?: string;
}

export async function getMessageListApi(params?: { isRead?: boolean }) {
  return requestClient.get<Message[]>('/message/list', { params });
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

export async function createMessageApi(data: ApiRequests['MessageCreateReq']) {
  return requestClient.post<Message>(
    '/message',
    pickPayload('MessageCreateReq', data),
  );
}

export interface SendMessageParams {
  receiverId: string;
  title: string;
  content: string;
  type?: number;
  avatar?: string;
}

export interface MessagePageResult {
  items: Message[];
  total: number;
}

export async function adminGetMessageListApi(params: {
  current?: number;
  size?: number;
  userId?: string;
}) {
  return requestClient.get<MessagePageResult>('/message/admin/list', {
    params,
  });
}

export async function adminSendMessageApi(
  data: ApiRequests['MessageCreateReq'],
) {
  return requestClient.post(
    '/message/admin/send',
    pickPayload('MessageCreateReq', data),
  );
}

export async function adminDeleteMessageApi(id: string) {
  return requestClient.delete(`/message/admin/${id}`);
}
