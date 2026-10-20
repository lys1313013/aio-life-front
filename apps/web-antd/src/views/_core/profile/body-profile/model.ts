import type {
  BodyProfile,
  BodyProfileRequest,
  MeasurementKey,
} from '#/api/core/body-profile';

export type {
  BodyProfile,
  BodyProfileRequest,
  MeasurementKey,
} from '#/api/core/body-profile';

/** 两端遵循同一份身体档案契约；所有数值单位见字段名，仅保存当前状态。 */
export const measurements = [
  { key: 'heightCm', label: '身高', unit: 'cm' },
  { key: 'weightKg', label: '体重', unit: 'kg' },
  { key: 'bodyFatPercent', label: '体脂率', unit: '%' },
  { key: 'shoulderWidthCm', label: '肩宽', unit: 'cm', side: 'left', top: 9 },
  { key: 'chestCm', label: '胸围', unit: 'cm', side: 'right', top: 17 },
  { key: 'upperArmCm', label: '上臂围', unit: 'cm', side: 'left', top: 25 },
  { key: 'forearmCm', label: '前臂围', unit: 'cm', side: 'right', top: 34 },
  { key: 'waistCm', label: '腰围', unit: 'cm', side: 'left', top: 43 },
  { key: 'hipCm', label: '臀围', unit: 'cm', side: 'right', top: 52 },
  { key: 'thighCm', label: '大腿围', unit: 'cm', side: 'left', top: 62 },
  { key: 'calfCm', label: '小腿围', unit: 'cm', side: 'right', top: 78 },
  { key: 'inseamCm', label: '腿内侧长', unit: 'cm' },
] as const;

export function emptyProfile(): BodyProfile {
  return {
    armState: null,
    bmi: null,
    bodyFatPercent: null,
    calfCm: null,
    chestCm: null,
    forearmCm: null,
    gender: null,
    heightCm: null,
    hipCm: null,
    id: null,
    inseamCm: null,
    measurementSide: null,
    shoeSize: null,
    shoeSystem: null,
    shoulderWidthCm: null,
    thighCm: null,
    topSize: null,
    trousersSize: null,
    updateTime: null,
    upperArmCm: null,
    version: 0,
    waistCm: null,
    weightKg: null,
  };
}

export function calculateBmi(
  height: null | number,
  weight: null | number,
): null | number {
  if (
    height === null ||
    weight === null ||
    !Number.isFinite(height) ||
    !Number.isFinite(weight) ||
    height <= 0 ||
    weight <= 0
  )
    return null;
  const result = weight / (height / 100) ** 2;
  return Number.isFinite(result)
    ? Math.round((result + Number.EPSILON) * 10) / 10
    : null;
}

export function measurementText(value: null | number | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}

export function parseMeasurement(
  value: string,
  key: MeasurementKey,
): null | number {
  const text = value.trim();
  if (!text) return null;
  const label = measurements.find((item) => item.key === key)!.label;
  const number = Number(text);
  if (
    !/^\d{1,3}(?:\.\d)?$/.test(text) ||
    !Number.isFinite(number) ||
    number <= 0 ||
    (key === 'bodyFatPercent' && number >= 100)
  ) {
    throw new Error(`${label}请填写大于0、最多一位小数的有效数值`);
  }
  return number;
}

/** 白名单提交，保留显式 null 清空；不发送 ID、BMI、审计或用户身份字段。 */
export function profilePayload(profile: BodyProfile): BodyProfileRequest {
  const request: BodyProfileRequest = {
    ...emptyProfile(),
    armState: profile.armState,
    gender: profile.gender,
    measurementSide: profile.measurementSide,
    shoeSize: profile.shoeSize?.trim() || null,
    shoeSystem: profile.shoeSize?.trim() ? profile.shoeSystem || 'EU' : null,
    topSize: profile.topSize?.trim() || null,
    trousersSize: profile.trousersSize?.trim() || null,
    version: profile.version,
  };
  // 显式拷贝，避免将响应附属字段通过展开运算发回服务端。
  const {
    bmi: _bmi,
    id: _id,
    updateTime: _updateTime,
    ...payload
  } = request as BodyProfile;
  for (const field of measurements) {
    payload[field.key] = parseMeasurement(
      profile[field.key] === null ? '' : String(profile[field.key]),
      field.key,
    );
  }
  if (
    [payload.topSize, payload.trousersSize].some(
      (value) => value !== null && value.length > 32,
    )
  )
    throw new Error('尺码最多32个字符');
  if (
    payload.shoeSize !== null &&
    (!/^\d{1,3}(?:\.\d)?$/.test(payload.shoeSize) ||
      Number(payload.shoeSize) <= 0)
  )
    throw new Error('请填写有效鞋码');
  return payload;
}

export function shoeText(profile: BodyProfile): string {
  if (profile.shoeSize === null || profile.shoeSize === '') return '—';
  if (profile.shoeSystem === 'CN') return `${profile.shoeSize} 毫米`;
  if (profile.shoeSystem === 'US') return `美码 ${profile.shoeSize}`;
  if (profile.shoeSystem === 'UK') return `英码 ${profile.shoeSize}`;
  return `${profile.shoeSize} 码`;
}
