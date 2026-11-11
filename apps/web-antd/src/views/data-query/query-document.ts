import type { FieldNode, OperationDefinitionNode } from 'graphql';

import type { QueryDataset } from '#/api/core/data-query';

import dayjs from 'dayjs';
import { Kind, parse, print } from 'graphql';

export function defaultFields(model: QueryDataset) {
  const fields = new Set([
    model.rangeFields[0]!,
    ...['title', 'performanceName'].filter((key) => model.fields[key]),
  ]);
  const aggregate = Object.entries(model.fields).find(
    ([, field]) => field.aggregateFunctions.length > 0,
  );
  if (aggregate) fields.add(aggregate[0]);
  const relation = Object.entries(model.relations)[0];
  if (relation)
    fields.add(
      `${relation[0]}.${Object.keys(relation[1].fields).find((key) => key === 'name') || Object.keys(relation[1].fields)[0]}`,
    );
  return [...fields];
}

export function initialDocument(model: QueryDataset) {
  let query = model.queryExample;
  for (const field of defaultFields(model))
    query = toggleDocumentField(query, model, field, true);
  query = toggleDocumentField(query, model, 'id', false);
  return {
    query: print(parse(query)),
    variables: JSON.stringify(
      {
        start: dayjs().startOf('month').format('YYYY-MM-DD'),
        end: dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD'),
      },
      null,
      2,
    ),
  };
}

function editableDocument(query: string, model: QueryDataset) {
  const document = parse(query);
  if (
    document.definitions.length !== 1 ||
    document.definitions[0]?.kind !== Kind.OPERATION_DEFINITION
  )
    throw new Error('字段选择仅支持单个明细查询');
  const operation = document.definitions[0];
  const root = operation.selectionSet.selections[0];
  if (
    operation.operation !== 'query' ||
    operation.selectionSet.selections.length !== 1 ||
    root?.kind !== Kind.FIELD ||
    root.name.value !== model.root ||
    !root.selectionSet
  )
    throw new Error('字段选择仅支持当前数据集的明细查询');
  if (
    root.selectionSet.selections.some(
      (field) =>
        field.kind !== Kind.FIELD || field.alias || field.directives?.length,
    )
  )
    throw new Error('含别名或复杂选取的查询请直接在编辑器修改');
  return { document, operation, root };
}

export function selectedDocumentFields(query: string, model: QueryDataset) {
  try {
    const { root } = editableDocument(query, model);
    return root.selectionSet!.selections.flatMap((node) => {
      const field = node as FieldNode;
      return field.selectionSet
        ? field.selectionSet.selections
            .filter((child) => child.kind === Kind.FIELD)
            .map(
              (child) =>
                `${field.name.value}.${(child as FieldNode).name.value}`,
            )
        : [field.name.value];
    });
  } catch {
    return [];
  }
}

export function toggleDocumentField(
  query: string,
  model: QueryDataset,
  path: string,
  checked: boolean,
) {
  const { document, operation, root } = editableDocument(query, model);
  const [name, child] = path.split('.') as [string, string | undefined];
  if (!(child ? model.relations[name]?.fields[child] : model.fields[name]))
    throw new Error('字段不在当前模型中');
  const selections = [...root.selectionSet!.selections] as FieldNode[];
  const index = selections.findIndex((field) => field.name.value === name);
  const makeField = (value: string): FieldNode => ({
    kind: Kind.FIELD,
    name: { kind: Kind.NAME, value },
  });
  if (child) {
    const current = index === -1 ? makeField(name) : selections[index]!;
    if (
      current.selectionSet?.selections.some(
        (field) => field.kind !== Kind.FIELD || field.alias,
      )
    )
      throw new Error('含别名的关联请直接在编辑器修改');
    const children = (current.selectionSet?.selections || []) as FieldNode[];
    const next = children.filter((field) => field.name.value !== child);
    if (checked) next.push(makeField(child));
    if (index !== -1) selections.splice(index, 1);
    if (next.length > 0)
      selections.push({
        ...current,
        selectionSet: { kind: Kind.SELECTION_SET, selections: next },
      });
  } else {
    if (index !== -1) selections.splice(index, 1);
    if (checked) selections.push(makeField(name));
  }
  if (selections.length === 0) throw new Error('至少保留一个字段');
  const nextRoot = {
    ...root,
    selectionSet: { ...root.selectionSet!, selections },
  };
  const nextOperation: OperationDefinitionNode = {
    ...operation,
    selectionSet: { ...operation.selectionSet, selections: [nextRoot] },
  };
  return print({ ...document, definitions: [nextOperation] });
}

/** 仅展平结果的展示结构，不将 ID、金额和汇总字符串转换为数字。 */
export function resultTable(result: Record<string, unknown>) {
  const root = Object.values(result)[0];
  const rows = Array.isArray(root)
    ? root
    : root && typeof root === 'object'
      ? [root]
      : [];
  const flatten = (
    value: Record<string, unknown>,
    prefix = '',
  ): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        return item && typeof item === 'object' && !Array.isArray(item)
          ? Object.entries(flatten(item as Record<string, unknown>, path))
          : [[path, item]];
      }),
    );
  const flat = rows.map((row) => flatten(row as Record<string, unknown>));
  return {
    rows: flat,
    columns: [...new Set(flat.flatMap((row) => Object.keys(row)))],
  };
}

export function queryVariables(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text || '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('变量必须是 JSON 对象');
  return value as Record<string, unknown>;
}
