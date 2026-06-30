import { get, put, del } from '../utils/request';

export interface MessageEntity {
  id: number;
  senderId?: number;
  receiverId?: number;
  title: string;
  content: string;
  type: number;
  isRead: boolean;
  createTime: string;
  updateTime: string;
}

export function getMessageList() {
  return get<MessageEntity[]>('/message/list');
}

export function getUnreadCount() {
  return get<{ count: number }>('/message/unread-count');
}

export function markAsRead(id: number) {
  return put<void>(`/message/read/${id}`);
}

export function markAllAsRead() {
  return put<void>('/message/read-all');
}

export function deleteMessage(id: number) {
  return del<void>(`/message/${id}`);
}
