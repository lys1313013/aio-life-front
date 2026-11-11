export interface QueryVariable {
  name: string;
  type: string;
  required: boolean;
}

export interface VariableValue {
  source: string;
  value: string;
}

export const variableSources = [
  { value: 'fixed', label: '填写固定值' },
  { value: 'goal.startDate', label: '目标开始日期' },
  { value: 'goal.endDateExclusive', label: '目标结束日期（包含当天）' },
  { value: 'goal.startMonth', label: '目标开始月份' },
  { value: 'goal.endMonthExclusive', label: '目标结束月份（包含当月）' },
];

// 只读取变量声明和类型，不识别业务字段，也不解释 where；查询合法性由 Query 服务校验。
// 字符串和注释作为完整 token，避免其中的 $、括号或字段名被误识别。
function tokens(query: string): string[] {
  return (
    query.match(
      /"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|#[^\r\n]*|[_A-Z]\w*|-?\d+(?:\.\d+)?(?:E[+-]?\d+)?|[^\s,]/gi,
    ) ?? []
  ).filter((token) => !token.startsWith('#'));
}

export function queryVariables(query: string): QueryVariable[] {
  const list = tokens(query);
  if (list[0] !== 'query') return [];
  let index = list[1] === '(' ? 1 : 2;
  if (list[index] !== '(') return [];
  index++;
  const variables: QueryVariable[] = [];
  while (index < list.length && list[index] !== ')') {
    if (list[index++] !== '$') throw new Error('请先补全查询中的变量声明');
    const name = list[index++];
    if (!name || !/^[_A-Z]\w*$/i.test(name) || list[index++] !== ':')
      throw new Error('请先补全查询中的变量声明');
    let type = '';
    while (index < list.length && /^[[\]!\w]+$/.test(list[index]!))
      type += list[index++];
    if (!type) throw new Error('请先补全查询中的变量类型');
    const hasDefault = list[index] === '=';
    if (hasDefault) {
      index++;
      let depth = 0;
      do {
        const token = list[index];
        if (token === '{' || token === '[') depth++;
        if (token === '}' || token === ']') depth--;
        index++;
      } while (
        index < list.length &&
        (depth > 0 || !['$', ')'].includes(list[index]!))
      );
    }
    if (variables.some((variable) => variable.name === name))
      throw new Error(`变量 $${name} 重复声明`);
    variables.push({
      name,
      type,
      required: type.endsWith('!') && !hasDefault,
    });
  }
  if (list[index] !== ')') throw new Error('请先补全查询中的变量声明');

  return variables;
}

function objectValue(text: string): Record<string, unknown> {
  const value = JSON.parse(text || '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('已保存的查询变量格式异常');
  return value;
}

export function readVariableValues(
  query: string,
  values: string,
  bindings: string,
): Record<string, VariableValue> {
  const bound = objectValue(bindings);
  const fixed = objectValue(values);
  const result: Record<string, VariableValue> = Object.create(null);
  for (const variable of queryVariables(query)) {
    const value = Object.hasOwn(fixed, variable.name)
      ? fixed[variable.name]
      : undefined;
    result[variable.name] = {
      source:
        typeof bound[variable.name] === 'string'
          ? (bound[variable.name] as string)
          : 'fixed',
      value:
        value === undefined
          ? ''
          : typeof value === 'string' && variableKind(variable) !== 'json'
            ? value
            : JSON.stringify(value),
    };
  }
  return result;
}

export function variableKind(variable: QueryVariable): string {
  if (variable.type.includes('[')) return 'json';
  const type = variable.type.replaceAll('!', '');
  if (type === 'Boolean') return 'boolean';
  if (['Float', 'Int'].includes(type)) return 'number';
  return ['ID', 'String'].includes(type) ? 'text' : 'json';
}

export function writeVariableValues(
  query: string,
  rows: Record<string, VariableValue>,
) {
  const bindings: Record<string, string> = Object.create(null);
  const values: Record<string, unknown> = Object.create(null);
  for (const variable of queryVariables(query)) {
    const existing = rows[variable.name];
    const row = {
      source: existing?.source ?? 'fixed',
      value: existing?.value ?? '',
    };
    if (row.source !== 'fixed') {
      if (!variableSources.some((source) => source.value === row.source))
        throw new Error(`请选择 ${variable.name} 的取值来源`);
      if (variable.type.replaceAll('!', '') !== 'String')
        throw new Error(`${variable.name} 不能使用日期来源`);
      bindings[variable.name] = row.source;
      continue;
    }
    if (row.value === '') {
      if (variable.required) throw new Error(`请填写${variable.name}`);
      continue;
    }
    const kind = variableKind(variable);
    let value: unknown = row.value;
    switch (kind) {
      case 'boolean': {
        if (!['false', 'true'].includes(row.value))
          throw new Error(`请选择${variable.name}`);
        value = row.value === 'true';

        break;
      }
      case 'json': {
        try {
          value = JSON.parse(row.value);
        } catch {
          throw new Error(`${variable.name} 的对象或列表格式不正确`);
        }

        break;
      }
      case 'number': {
        if (!row.value.trim()) throw new Error(`${variable.name} 必须为数字`);
        value = Number(row.value);
        if (
          !Number.isFinite(value) ||
          (variable.type.startsWith('Int') &&
            (!Number.isInteger(value) ||
              Number(value) < -2_147_483_648 ||
              Number(value) > 2_147_483_647))
        )
          throw new Error(`${variable.name} 必须为有效数字`);

        break;
      }
      // No default
    }
    if (variable.required && value === null)
      throw new Error(`请填写${variable.name}`);
    values[variable.name] = value;
  }
  return {
    progressVariables: JSON.stringify(values),
    progressVariableBindings: JSON.stringify(bindings),
  };
}
