import { describe, expect, it } from 'vitest';

import { pickQuery } from '#/api/payload';

import {
  draftPayload,
  emptyDraft,
  groupLocations,
  PRESENT_DATE,
  sortFootprints,
  timeLabel,
  validDate,
  validateDraft,
} from './model';

const draft = () => ({
  ...emptyDraft(),
  startDate: '2016-12-30',
  endDate: '2016-12-31',
  placeName: ' 住所 ',
  longitude: 120.127_128,
  latitude: 30.273_297,
  confirmed: true,
});

describe('生活足迹契约', () => {
  it('按字段提示必填，补选或勾选至今后不再保留旧错误', () => {
    expect(validateDraft(emptyDraft())).toMatchObject({
      startDate: '请选择开始日期',
      endDate: '请选择结束日期',
      placeName: '请选择或填写地点',
      position: '请选择地图位置',
    });
    expect(validateDraft(draft())).toEqual({});
    expect(validateDraft({ ...draft(), endDate: PRESENT_DATE })).toEqual({});
    expect(validateDraft({ ...draft(), endDate: '' }).endDate).toBe(
      '请选择结束日期',
    );
    expect(validateDraft({ ...draft(), endDate: '2016-12-29' }).endDate).toBe(
      '结束日期不能早于开始日期',
    );
    expect(validateDraft({ ...draft(), endDate: '2099-01-01' }).endDate).toBe(
      '结束日期不能晚于今天',
    );
  });
  it('只接受完整日期，并检查闰年、未来和起止顺序', () => {
    expect(draftPayload(draft()).endDate).toBe('2016-12-31');
    expect(validDate('2024-02-29')).toBe(true);
    expect(() =>
      draftPayload({ ...draft(), endDate: '2016-12-30' }),
    ).not.toThrow();
    for (const value of [
      '2016',
      '2024-02',
      '2023-02-29',
      '2020-13-01',
      '2020-00-01',
      '0000-01-01',
      '0999-01-01',
      '2020-1-1',
    ]) {
      expect(validDate(value)).toBe(false);
      expect(() => draftPayload({ ...draft(), startDate: value })).toThrow();
      expect(() => draftPayload({ ...draft(), endDate: value })).toThrow();
    }
    expect(() =>
      draftPayload({ ...draft(), startDate: '2099-01-01' }),
    ).toThrow();
    expect(() => draftPayload({ ...draft(), endDate: '2016-12-29' })).toThrow();
  });
  it('新记录必须确认位置，清空字段和至今能完整提交', () => {
    expect(() => draftPayload({ ...draft(), confirmed: false })).toThrow(
      '确认',
    );
    expect(() => draftPayload({ ...draft(), longitude: null })).toThrow();
    const payload = draftPayload({
      ...draft(),
      endDate: PRESENT_DATE,
      address: '',
      note: '',
      id: '9223372036854775807',
    });
    expect(payload).toMatchObject({
      placeName: '住所',
      endDate: PRESENT_DATE,
      address: null,
      note: null,
      coordinateSystem: 'GCJ02',
    });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('confirmed');
    expect(payload).not.toHaveProperty('ongoing');
    expect(payload).not.toHaveProperty('requestKey');
    expect(payload).not.toHaveProperty('version');
    expect(timeLabel(payload)).toBe('2016.12.30 — 至今');
    expect(draftPayload({ ...draft(), endDate: PRESENT_DATE }).endDate).toBe(
      PRESENT_DATE,
    );
    expect(() => draftPayload({ ...draft(), endDate: '' })).toThrow();
    expect(() => draftPayload({ ...draft(), endDate: '9999-12-30' })).toThrow();
    expect(() =>
      draftPayload({
        ...draft(),
        startDate: PRESENT_DATE,
        endDate: PRESENT_DATE,
      }),
    ).toThrow();
    expect(timeLabel(draft())).toBe('2016.12.30 — 2016.12.31');
  });
  it('聚合不丢记录、不转换ID，缩放后能展开，完全重合仍可选全部记录', () => {
    const a = { ...draftPayload(draft()), id: '9223372036854775807' };
    const b = {
      ...a,
      id: '9223372036854775806',
      longitude: a.longitude + 0.01,
    };
    expect(groupLocations([a, b], 4)).toHaveLength(1);
    expect(groupLocations([a, b], 18)).toHaveLength(2);
    expect(
      groupLocations([a, { ...a, id: b.id }], 22)[0]?.records.map((r) => r.id),
    ).toEqual([a.id, b.id]);
    expect(sortFootprints([a, { ...b, startDate: '2015-01-01' }])[0]?.id).toBe(
      b.id,
    );
  });
  it('生成的GET过滤契约保留经纬度，排除客户端身份', () => {
    expect(
      pickQuery('/life-footprints/map/reverse', {
        longitude: 120,
        latitude: 30,
        userId: 'other',
      }),
    ).toEqual({ longitude: 120, latitude: 30 });
  });
});
