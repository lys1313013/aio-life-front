import type { SchemaRelation, SchemaTable } from '#/api/core/query-schema';

export const relationKinds: Record<string, string> = {
  dictionary: '字典',
  hierarchy: '树形关系',
  owner: '用户归属',
  polymorphic: '多态关联',
  reference: '普通引用',
  scoped: '按范围匹配',
};

export const multiplicities = ['0..1', '1', '0..N', 'N'].map((value) => ({
  label: value,
  value,
}));

export function tableLabel(table: SchemaTable) {
  return (
    table.comment
      ?.split(/[。；（\n]/u)[0]
      ?.trim()
      .slice(0, 18) || table.name
  );
}

export function mappingLabel(relation: SchemaRelation | undefined) {
  return (relation?.columnMapping ?? [])
    .map(
      ({ sourceColumn, targetColumn }) => `${sourceColumn} → ${targetColumn}`,
    )
    .join('，');
}
