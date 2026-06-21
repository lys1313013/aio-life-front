import { get, post, put, del } from "../utils/request";

export interface GraphNode {
  id: string;
  name: string;
  avatar?: string;
  category?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationType: string;
  direction?: string;
  description?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

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

export interface PersonBasicVO {
  id: string;
  name: string;
  avatar?: string;
  category?: string;
}

export interface RelationshipDetailVO {
  id: number;
  relationType: string;
  direction?: string;
  description?: string;
  tags?: string;
  createdAt?: string;
  target: PersonBasicVO;
}

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

export interface RelationshipReq {
  id?: number;
  sourcePersonId: string;
  targetPersonId: string;
  relationType: string;
  direction?: string;
  description?: string;
  tags?: string;
}

export async function getGraphData() {
  return get<GraphData>('/relationships/graph');
}

export async function getPersons() {
  return get<GraphData>('/relationships/persons');
}

export async function getPerson(id: string) {
  return get<PersonDetailVO>(`/relationships/persons/${id}`);
}

export async function searchPersons(keyword: string) {
  return get<PersonDetailVO[]>('/relationships/persons/search', { keyword });
}

export async function createPerson(data: PersonReq) {
  return post('/relationships/persons', data);
}

export async function updatePerson(id: string, data: PersonReq) {
  return put(`/relationships/persons/${id}`, data);
}

export async function deletePerson(id: string) {
  return del(`/relationships/persons/${id}`);
}

export async function createRelationship(data: RelationshipReq) {
  return post('/relationships', data);
}

export async function updateRelationship(id: number, data: RelationshipReq) {
  return put(`/relationships/${id}`, data);
}

export async function deleteRelationship(data: Partial<RelationshipReq> & { sourcePersonId: string; targetPersonId: string }) {
  return del('/relationships', data);
}
