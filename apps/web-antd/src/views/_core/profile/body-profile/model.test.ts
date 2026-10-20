import { describe, expect, it } from 'vitest';

import {
  calculateBmi,
  emptyProfile,
  parseMeasurement,
  profilePayload,
  shoeText,
} from './model';

describe('当前身体档案契约', () => {
  it('bMI使用厘米转米，缺少或无效数据不产生假数值', () => {
    expect(calculateBmi(178, 72)).toBe(22.7);
    expect(calculateBmi(180, 80)).toBe(24.7);
    for (const value of [null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(calculateBmi(value, 72)).toBeNull();
      expect(calculateBmi(178, value)).toBeNull();
    }
  });
  it('只提交业务白名单，数值和尺码允许清空，保持版本数值', () => {
    const profile = {
      ...emptyProfile(),
      heightCm: 178,
      weightKg: 72,
      topSize: ' L ',
      shoeSize: '42',
      id: '9223372036854775807',
      bmi: 22.7,
      version: 8,
    };
    const payload = profilePayload(profile);
    expect(payload).toMatchObject({
      heightCm: 178,
      topSize: 'L',
      shoeSize: '42',
      shoeSystem: 'EU',
      upperArmCm: null,
      version: 8,
    });
    for (const key of ['id', 'bmi', 'updateTime', 'userId'])
      expect(payload).not.toHaveProperty(key);
    expect(
      profilePayload({
        ...profile,
        heightCm: null,
        shoeSize: '',
        topSize: ' ',
      }),
    ).toMatchObject({
      heightCm: null,
      shoeSize: null,
      shoeSystem: null,
      topSize: null,
    });
  });
  it('围度不接受零、负值、指数或多位小数，空白表示未填', () => {
    expect(parseMeasurement(' 32.5 ', 'upperArmCm')).toBe(32.5);
    expect(parseMeasurement('', 'upperArmCm')).toBeNull();
    for (const value of ['0', '-1', '1e2', '32.55', 'Infinity', 'abc'])
      expect(() => parseMeasurement(value, 'upperArmCm')).toThrow();
    expect(() => parseMeasurement('100', 'bodyFatPercent')).toThrow();
  });
  it('常用鞋码可读，其他制式保留区别且不自动换算', () => {
    const profile = { ...emptyProfile(), shoeSize: '42' };
    expect(shoeText(profile)).toBe('42 码');
    expect(shoeText({ ...profile, shoeSystem: 'CN', shoeSize: '265' })).toBe(
      '265 毫米',
    );
    expect(shoeText({ ...profile, shoeSystem: 'US', shoeSize: '9' })).toBe(
      '美码 9',
    );
    expect(shoeText(emptyProfile())).toBe('—');
  });
});
