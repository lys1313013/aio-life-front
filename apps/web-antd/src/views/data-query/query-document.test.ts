import type { QueryDataset } from '#/api/core/data-query';

import { describe, expect, it } from 'vitest';

import {
  initialDocument,
  queryVariables,
  resultTable,
  selectedDocumentFields,
  toggleDocumentField,
} from './query-document';

const model = {
  root: 'timeRecords',
  rangeFields: ['date'],
  fields: {
    id: { aggregateFunctions: [] },
    date: { aggregateFunctions: [] },
    title: { aggregateFunctions: [] },
    durationMinutes: { aggregateFunctions: ['sum'] },
  },
  relations: { category: { fields: { id: {}, name: {} } } },
  queryExample:
    'query Recent($start: String!, $end: String!) { timeRecords(where: { date: {_gte:$start, _lt:$end} }, limit:100) { id } }',
} as unknown as QueryDataset;

describe('查询文档与精度安全展示', () => {
  it('默认查询从模型生成，保留变量、范围与分页参数', () => {
    const initial = initialDocument(model);
    expect(selectedDocumentFields(initial.query, model)).toEqual([
      'date',
      'title',
      'durationMinutes',
      'category.name',
    ]);
    expect(initial.query).toContain('limit: 100');
    expect(initial.query).toContain('_gte: $start');
    expect(queryVariables(initial.variables)).toHaveProperty('end');
  });
  it('字段勾选保留根别名与输入参数；关联最后一项删除时移除关联', () => {
    const query = initialDocument(model).query.replace(
      'timeRecords(',
      'rows: timeRecords(',
    );
    const next = toggleDocumentField(query, model, 'category.id', true);
    expect(next).toContain('rows: timeRecords(');
    expect(selectedDocumentFields(next, model)).toContain('category.id');
    const removed = toggleDocumentField(
      toggleDocumentField(next, model, 'category.name', false),
      model,
      'category.id',
      false,
    );
    expect(removed).not.toContain('category');
    expect(() =>
      toggleDocumentField(
        'query { timeRecords(where: {}) { id } }',
        model,
        'id',
        false,
      ),
    ).toThrow('至少保留一个字段');
  });
  it('拒绝用勾选覆盖不匹配的模型、别名或片段，不破坏手写查询', () => {
    for (const query of [
      'query { other { id } }',
      'query { timeRecords { alias: id } }',
      'query { timeRecords { ...Fields } } fragment Fields on TimeRecord { id }',
    ]) {
      expect(() => toggleDocumentField(query, model, 'title', true)).toThrow();
    }
    expect(() =>
      toggleDocumentField(
        initialDocument(model).query,
        model,
        'category.userId',
        true,
      ),
    ).toThrow('字段不在当前模型中');
    expect(() =>
      toggleDocumentField(
        initialDocument(model).query,
        model,
        'internalSql',
        true,
      ),
    ).toThrow();
  });
  it('保留大整数、金额、null、零与嵌套结果，汇总和空结果可以展示', () => {
    const data = resultTable({
      rows: [
        {
          id: '9007199254740993',
          amount: '123456789012345678.99',
          count: 0,
          category: null,
        },
        {
          id: '9007199254740994',
          category: { name: '学习' },
          pagesInfo: [{ cid: '1' }],
        },
      ],
    });
    expect(data.rows[0]).toMatchObject({
      id: '9007199254740993',
      amount: '123456789012345678.99',
      count: 0,
      category: null,
    });
    expect(data.rows[1]?.['category.name']).toBe('学习');
    expect(data.rows[1]?.pagesInfo).toEqual([{ cid: '1' }]);
    expect(resultTable({ rows: [] })).toEqual({ rows: [], columns: [] });
    expect(
      resultTable({ stats: { count: '0', durationMinutes: { sum: null } } })
        .rows[0],
    ).toEqual({ count: '0', 'durationMinutes.sum': null });
    expect(queryVariables('{"id":"9007199254740993","count":0}')).toEqual({
      id: '9007199254740993',
      count: 0,
    });
    for (const value of ['[]', 'null', '1', '{'])
      expect(() => queryVariables(value)).toThrow();
  });
});
