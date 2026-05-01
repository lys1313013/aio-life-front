import { requestClient } from '#/api/request';

export interface CbtiOption<T = number | string> {
  label: string;
  value: T;
}

export interface CbtiQuestion {
  dimension: string;
  id: number;
  options: Array<CbtiOption<number>>;
  text: string;
}

export interface CbtiHiddenQuestion {
  id: number;
  options: Array<CbtiOption<string>>;
  text: string;
  triggerPrev?: string;
}

export interface CbtiDimensionDef {
  code: string;
  levels: Record<'H' | 'L' | 'M', string>;
  model: string;
  modelName: string;
  name: string;
}

export interface CbtiQuestionsResp {
  dimensionDefs: CbtiDimensionDef[];
  hiddenQuestions: CbtiHiddenQuestion[];
  questions: CbtiQuestion[];
}

export interface CbtiPersonality {
  code: string;
  color?: string;
  description?: string;
  imageObject?: string;
  imageUrl?: string;
  isSpecial?: boolean;
  motto?: string;
  name: string;
  spirit?: string;
  strengths?: string[];
  techStack?: string;
  vector?: number[];
  weaknesses?: string[];
}

export interface CbtiDimensionScore {
  code: string;
  level: 'H' | 'L' | 'M';
  levelDesc?: string;
  levelNum: number;
  max: number;
  model: string;
  modelName: string;
  name: string;
  percentage: number;
  raw: number;
}

export interface CbtiMatchDetail {
  code: string;
  name: string;
  similarity: number;
}

export interface CbtiTestResult {
  dimensions: CbtiDimensionScore[];
  isSpecial: boolean;
  matchDetails: CbtiMatchDetail[];
  personality: CbtiPersonality;
  similarity: number;
}

export interface CbtiTestReq {
  answers: Record<number, number>;
  hiddenAnswers?: {
    drink?: string;
    drinkAttitude?: string;
  };
}

export interface CbtiHistoryItem {
  color?: string;
  createTime: string;
  id: string;
  imageObject?: string;
  imageUrl?: string;
  isSpecial?: boolean;
  motto?: string;
  name?: string;
  personalityCode: string;
  similarity: number;
}

export interface CbtiHistoryDetail {
  answers: Record<number, number>;
  createTime: string;
  dimensions: CbtiDimensionScore[];
  hiddenAnswers: Record<string, any>;
  id: string;
  personality: CbtiPersonality;
  personalityCode: string;
  similarity: number;
  userId: string;
}

export interface CbtiAdminPersonality extends CbtiPersonality {
  createTime?: string;
  id: number;
  updateTime?: string;
}

export interface CbtiPersonalitySaveReq {
  code: string;
  color?: string;
  description?: string;
  id?: number;
  imageObject?: string;
  isSpecial?: boolean;
  motto?: string;
  name: string;
  spirit?: string;
  strengths?: string[];
  techStack?: string;
  vector: number[];
  weaknesses?: string[];
}

export interface CbtiPersonalityImageResp {
  imageObject: string;
  imageUrl: string;
}

export async function getCbtiQuestionsApi() {
  return requestClient.get<CbtiQuestionsResp>('/cbti/questions');
}

export async function getCbtiPersonalitiesApi() {
  return requestClient.get<CbtiPersonality[]>('/cbti/personalities');
}

export async function getCbtiPersonalityApi(code: string) {
  return requestClient.get<CbtiPersonality>(`/cbti/personalities/${code}`);
}

export async function cbtiTestApi(data: CbtiTestReq) {
  return requestClient.post<CbtiTestResult>('/cbti/test', data);
}

export async function getCbtiHistoryApi() {
  return requestClient.get<CbtiHistoryItem[]>('/cbti/results');
}

export async function getCbtiHistoryDetailApi(id: string) {
  return requestClient.get<CbtiHistoryDetail>(`/cbti/result/${id}`);
}

export async function deleteCbtiHistoryApi(id: string) {
  return requestClient.delete<boolean>(`/cbti/result/${id}`);
}

export async function getCbtiAdminPersonalitiesApi() {
  return requestClient.get<CbtiAdminPersonality[]>('/cbti/admin/personalities');
}

export async function createCbtiPersonalityApi(data: CbtiPersonalitySaveReq) {
  return requestClient.post<CbtiAdminPersonality>(
    '/cbti/admin/personalities',
    data,
  );
}

export async function updateCbtiPersonalityApi(
  id: number,
  data: CbtiPersonalitySaveReq,
) {
  return requestClient.put<CbtiAdminPersonality>(
    `/cbti/admin/personalities/${id}`,
    data,
  );
}

export async function deleteCbtiPersonalityApi(id: number) {
  return requestClient.delete<boolean>(`/cbti/admin/personalities/${id}`);
}

export async function uploadCbtiPersonalityImageApi(
  code: string,
  formData: FormData,
) {
  return requestClient.post<CbtiPersonalityImageResp>(
    `/cbti/admin/personalities/${code}/image`,
    formData,
  );
}
