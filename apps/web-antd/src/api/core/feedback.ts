import type { FileVO } from './common';

import { requestClient } from '#/api/request';

/**
 * 分页响应
 */
export interface PageResp<T> {
  items: T[];
  total: number;
}

/**
 * 反馈 VO
 */
export interface FeedbackVO {
  id: string;
  userId: number;
  userName: string;
  title: string;
  summary: string;
  feedbackType: string;
  status: string;
  priority: string;
  files: FileVO[];
  commentCount: number;
  createTime: string;
  updateTime: string;
}

/**
 * 反馈详情 VO
 */
export interface FeedbackDetailVO extends FeedbackVO {
  content: string;
  comments: FeedbackCommentVO[];
}

/**
 * 反馈评论 VO
 */
export interface FeedbackCommentVO {
  id: string;
  userId: number;
  userName: string;
  roleType: 'ADMIN' | 'USER';
  content: string;
  files: FileVO[];
  createTime: string;
}

/**
 * 创建反馈请求
 */
export interface FeedbackCreateReq {
  title: string;
  content: string;
  feedbackType: string;
  priority?: string;
  fileIds?: string[];
}

/**
 * 评论创建请求
 */
export interface FeedbackCommentCreateReq {
  content: string;
  fileIds?: string[];
}

/**
 * 管理员查询条件
 */
export interface FeedbackAdminQuery {
  status?: string;
  feedbackType?: string;
  userId?: number;
  keyword?: string;
  startTime?: string;
  endTime?: string;
}

// ==================== 用户侧 ====================

/**
 * 提交反馈
 */
export async function createFeedback(data: FeedbackCreateReq) {
  return await requestClient.post<FeedbackVO>('/feedback', data);
}

/**
 * 我的反馈列表
 */
export async function queryMyFeedbacks(params: {
  feedbackType?: string;
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  return await requestClient.get<PageResp<FeedbackVO>>('/feedback/my', {
    params,
  });
}

/**
 * 我的反馈详情
 */
export async function getMyFeedbackDetail(id: string) {
  return await requestClient.get<FeedbackDetailVO>(`/feedback/my/${id}`);
}

/**
 * 追加评论
 */
export async function addFeedbackComment(
  feedbackId: string,
  data: FeedbackCommentCreateReq,
) {
  return await requestClient.post<FeedbackCommentVO>(
    `/feedback/${feedbackId}/comment`,
    data,
  );
}

/**
 * 撤销反馈
 */
export async function cancelFeedback(id: string) {
  return await requestClient.delete<void>(`/feedback/${id}`);
}

/**
 * 上传反馈附件
 */
export async function uploadFeedbackAttachment(
  file: File,
  bizType = 'feedback',
) {
  return await requestClient.upload<FileVO>('/feedback/upload-attachment', {
    file,
    bizType,
  });
}

// ==================== 管理员侧 ====================

/**
 * 管理员：全部反馈列表
 */
export async function queryAllFeedbacks(params: {
  endTime?: string;
  feedbackType?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
  startTime?: string;
  status?: string;
  userId?: number;
}) {
  return await requestClient.get<PageResp<FeedbackVO>>('/feedback/admin/list', {
    params,
  });
}

/**
 * 管理员：反馈详情
 */
export async function getAdminFeedbackDetail(id: string) {
  return await requestClient.get<FeedbackDetailVO>(`/feedback/admin/${id}`);
}

/**
 * 管理员：回复反馈
 */
export async function adminReplyFeedback(
  feedbackId: string,
  data: FeedbackCommentCreateReq,
) {
  return await requestClient.post<FeedbackCommentVO>(
    `/feedback/admin/${feedbackId}/reply`,
    data,
  );
}

/**
 * 管理员：变更状态
 */
export async function adminUpdateFeedbackStatus(
  feedbackId: string,
  status: string,
) {
  return await requestClient.put<FeedbackVO>(
    `/feedback/admin/${feedbackId}/status`,
    { status },
  );
}

/**
 * 管理员：批量操作
 */
export async function adminBatchFeedback(idList: number[], action: string) {
  return await requestClient.post<void>('/feedback/admin/batch', {
    idList,
    action,
  });
}

/**
 * 管理员用户 VO（用于通知接收人下拉选择）
 */
export interface AdminUserVO {
  id: string;
  username: string;
  nickname: string;
}

/**
 * 管理员：查询管理员用户列表（用于配置通知接收人）
 */
export async function queryAdminUsers() {
  return await requestClient.get<AdminUserVO[]>('/feedback/admin/admin-users');
}
