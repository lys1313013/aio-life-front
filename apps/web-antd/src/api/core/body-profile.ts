import { requestClient } from '#/api/request';

export type MeasurementKey =
  | 'bodyFatPercent'
  | 'calfCm'
  | 'chestCm'
  | 'forearmCm'
  | 'heightCm'
  | 'hipCm'
  | 'inseamCm'
  | 'shoulderWidthCm'
  | 'thighCm'
  | 'upperArmCm'
  | 'waistCm'
  | 'weightKg';
export type BodyProfileRequest = Record<MeasurementKey, null | number> & {
  armState: 'flexed' | 'relaxed' | null;
  gender: 'female' | 'male' | null;
  measurementSide: 'left' | 'right' | null;
  shoeSize: null | string;
  shoeSystem: 'CN' | 'EU' | 'UK' | 'US' | null;
  topSize: null | string;
  trousersSize: null | string;
  version: number;
};
export type BodyProfile = BodyProfileRequest & {
  bmi: null | number;
  id: null | string;
  updateTime: null | string;
};

export async function getBodyProfile() {
  return await requestClient.get<BodyProfile>('/body-profile');
}

export async function saveBodyProfile(data: BodyProfileRequest) {
  return await requestClient.put<BodyProfile>('/body-profile', data);
}
