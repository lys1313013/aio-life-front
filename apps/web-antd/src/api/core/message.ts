import type { ApiRequests, MessageConversationVO } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface Message {
  id: string;
  senderId?: string;
  receiverId: string;
  title: string;
  content: string;
  type: number;
  isRead: boolean;
  createTime: string;
  avatar?: string;
}

export const SYSTEM_CONVERSATION_ID = 'system';

export function isSystemMessage(message: Pick<Message, 'type'>): boolean {
  return message.type === 0;
}

export async function getConversationsApi(page: number, pageSize: number) {
  return requestClient.get<{
    items: MessageConversationVO[];
    total: null | number;
  }>('/message/conversations', { params: { page, pageSize } });
}

const conversationPath = (peer: string) =>
  `/message/conversations/${encodeURIComponent(peer)}`;

export async function getConversationMessagesApi(
  peer: string,
  pageSize: number,
  beforeId?: string,
) {
  return requestClient.get<Message[]>(`${conversationPath(peer)}/messages`, {
    params: { beforeId, pageSize },
  });
}

export async function markConversationReadApi(peer: string) {
  return requestClient.put(`${conversationPath(peer)}/read`);
}

export async function deleteConversationApi(peer: string) {
  return requestClient.delete(conversationPath(peer));
}

export async function getMessagePageApi(params: {
  isRead?: boolean;
  page: number;
  pageSize: number;
}) {
  return requestClient.get<MessagePageResult>('/message/page', { params });
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
  page?: number;
  pageSize?: number;
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
