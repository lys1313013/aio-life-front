import type { BankCard } from '#/api/bank-card';

import { describe, expect, it } from 'vitest';

import { filterCards, money } from './model';

const base = {
  bankName: '招商银行',
  bankId: '1',
  cardType: 'debit',
  status: 'normal',
  cardNoLast4: '1234',
  sortOrder: 0,
  tags: [{ id: 'a', name: '工资卡' }],
} as BankCard;
describe('银行卡筛选', () => {
  it('名称和尾号搜索，同时应用银行与标签条件', () => {
    const cards = [
      { ...base, id: '1', alias: '日常' },
      { ...base, id: '2', bankId: '2', cardNoLast4: '5678', tags: [] },
    ];
    expect(
      filterCards(cards, '1234', '1', 'debit', 'normal', ['a']).map(
        (c) => c.id,
      ),
    ).toEqual(['1']);
    expect(filterCards(cards, '  日常  ').length).toBe(1);
    expect(
      filterCards(cards, '', undefined, undefined, undefined, ['b']),
    ).toEqual([]);
  });
  it('多标签按任意匹配，排序不损失长ID精度', () => {
    const cards = [
      { ...base, id: '9007199254740992' },
      { ...base, id: '9007199254740993' },
    ];
    expect(
      filterCards(cards, '', undefined, undefined, undefined, ['b', 'a']).map(
        (c) => c.id,
      ),
    ).toEqual(['9007199254740993', '9007199254740992']);
  });
  it('自定义银行参与搜索和独立筛选', () => {
    const custom = {
      ...base,
      id: '3',
      bankId: null,
      customBankName: '地方银行',
      bankName: '地方银行',
    };
    expect(filterCards([base, custom], '地方')).toEqual([custom]);
    expect(filterCards([base, custom], '', 'custom:地方银行')).toEqual([
      custom,
    ]);
    expect(filterCards([base, custom], '', '1')).toEqual([base]);
  });
  it('未记录和零额度明确区分', () => {
    expect(money(null)).toBe('未记录');
    expect(money('0.00')).toBe('0');
  });
});
