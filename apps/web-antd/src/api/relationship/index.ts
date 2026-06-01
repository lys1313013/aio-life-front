import { requestClient } from '#/api/request';

/**
 * 图谱节点
 */
export interface GraphNode {
  id: string;
  name: string;
  avatar?: string;
  category?: string;
}

/**
 * 图谱边
 */
export interface GraphEdge {
  source: string;
  target: string;
  relationType: string;
  direction?: string;
  description?: string;
}

/**
 * 图谱数据
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * 人物请求 DTO
 */
export interface PersonReq {
  id?: string;
  name: string;
  avatar?: string;
  category?: string;
  description?: string;
  tags?: string;
  birthday?: string;
  phone?: string;
  email?: string;
  socialLinks?: string;
  notes?: string;
}

/**
 * 人物基础信息
 */
export interface PersonBasicVO {
  id: string;
  name: string;
  avatar?: string;
  category?: string;
}

/**
 * 关系详情
 */
export interface RelationshipDetailVO {
  id: number;
  relationType: string;
  direction?: string;
  description?: string;
  tags?: string;
  createdAt?: string;
  target: PersonBasicVO;
}

/**
 * 人物详情 VO（包含关系）
 */
export interface PersonDetailVO {
  id: string;
  userId: number;
  name: string;
  avatar?: string;
  category?: string;
  description?: string;
  tags?: string;
  birthday?: string;
  phone?: string;
  email?: string;
  socialLinks?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  relationships: RelationshipDetailVO[];
}

/**
 * 关系请求 DTO
 */
export interface RelationshipReq {
  id?: number;
  sourcePersonId: string;
  targetPersonId: string;
  relationType: string;
  direction?: string;
  description?: string;
  tags?: string;
}

// ==================== 接口 ====================

/**
 * 获取图谱数据
 */
export async function getGraphData() {
  return requestClient.get<GraphData>('/relationships/graph');
}

/**
 * 获取人物列表（图谱格式）
 */
export async function getPersons() {
  return requestClient.get<GraphData>('/relationships/persons');
}

/**
 * 获取人物详情
 */
export async function getPerson(id: string) {
  return requestClient.get<PersonDetailVO>(`/relationships/persons/${id}`);
}

/**
 * 搜索人物
 */
export async function searchPersons(keyword: string) {
  return requestClient.get<PersonDetailVO[]>('/relationships/persons/search', {
    params: { keyword },
  });
}

/**
 * 创建人物
 */
export async function createPerson(data: PersonReq) {
  return requestClient.post('/relationships/persons', data);
}

/**
 * 更新人物
 */
export async function updatePerson(id: string, data: PersonReq) {
  return requestClient.put(`/relationships/persons/${id}`, data);
}

/**
 * 删除人物
 */
export async function deletePerson(id: string) {
  return requestClient.delete(`/relationships/persons/${id}`);
}

/**
 * 创建关系
 */
export async function createRelationship(data: RelationshipReq) {
  return requestClient.post('/relationships', data);
}

/**
 * 更新关系
 */
export async function updateRelationship(id: number, data: RelationshipReq) {
  return requestClient.put(`/relationships/${id}`, data);
}

/**
 * 删除关系
 */
export async function deleteRelationship(data: RelationshipReq) {
  return requestClient.delete('/relationships', { data });
}
