import { describe, expect, it } from 'vitest';

import {
  queryVariables,
  readVariableValues,
  writeVariableValues,
} from './query-variables';

const query =
  'query Progress($start:String!,$end:String!,$categoryName:String!){progress:timeRecordStats(where:{date:{_gte:$start,_lt:$end},category:{name:{_eq:$categoryName}}}){date{countDistinct}}}';
const bindings = '{"start":"goal.startDate","end":"goal.endDateExclusive"}';

describe('目标查询通用变量表单', () => {
  it('只读取声明，不从业务字段猜测控件、标签或日期来源', () => {
    expect(queryVariables(query)).toEqual([
      { name: 'start', type: 'String!', required: true },
      { name: 'end', type: 'String!', required: true },
      { name: 'categoryName', type: 'String!', required: true },
    ]);
    expect(
      queryVariables(
        query.replace('category:{name:', 'unknownRelation:{unknownField:'),
      ),
    ).toEqual(queryVariables(query));
    expect(
      Object.values(readVariableValues(query, '{}', '{}')).map(
        (row) => row.source,
      ),
    ).toEqual(['fixed', 'fixed', 'fixed']);
  });

  it('分类名称原样提交，日期只使用明确选择的来源，字符串 ID 仍保留精度', () => {
    const values = '{"categoryName":"休息"}';
    const rows = readVariableValues(query, values, bindings);
    expect(writeVariableValues(query, rows)).toEqual({
      progressVariables: values,
      progressVariableBindings: bindings,
    });
    rows.categoryName!.value = '午休';
    expect(
      JSON.parse(writeVariableValues(query, rows).progressVariables),
    ).toEqual({ categoryName: '午休' });
    rows.categoryName!.value = '9223372036854775806';
    expect(
      JSON.parse(writeVariableValues(query, rows).progressVariables)
        .categoryName,
    ).toBe('9223372036854775806');
    rows.categoryName!.value = '';
    expect(() => writeVariableValues(query, rows)).toThrow(
      '请填写categoryName',
    );
    rows.categoryName!.value = undefined as unknown as string;
    expect(() => writeVariableValues(query, rows)).toThrow(
      '请填写categoryName',
    );
  });

  it('不读取注释和字符串中的假变量，保留零、false、对象、列表和默认值', () => {
    const complex =
      '# $fake\nquery P($count:Int!,$flag:Boolean!,$where:Filter!,$order:Direction,$ids:[String!]!,$text:String = "($fake:String!)") { rows(where:$where){id} }';
    const values = {
      count: 0,
      flag: false,
      where: { name: { _eq: '休息' } },
      order: 'Desc',
      ids: ['9007199254740993'],
    };
    const rows = readVariableValues(complex, JSON.stringify(values), '{}');
    expect(queryVariables(complex).map((variable) => variable.name)).toEqual([
      'count',
      'flag',
      'where',
      'order',
      'ids',
      'text',
    ]);
    expect(
      JSON.parse(writeVariableValues(complex, rows).progressVariables),
    ).toEqual(values);
    rows.count!.value = '1.5';
    expect(() => writeVariableValues(complex, rows)).toThrow('有效数字');
    rows.count!.value = '2147483648';
    expect(() => writeVariableValues(complex, rows)).toThrow('有效数字');
    expect(() => queryVariables('query P($start:')).toThrow('变量类型');
    expect(() => queryVariables('query P($start:String!')).toThrow('变量声明');
  });
});
