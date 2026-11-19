import type {
  QuerySchemaVO,
  SchemaColumnVO,
  SchemaRelationSaveReq,
  SchemaRelationVO,
  SchemaTableVO,
} from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

const base = '/query/schema';

type Column = Omit<SchemaColumnVO, 'dataType' | 'name'> & {
  dataType: string;
  name: string;
};

export type SchemaTable = Omit<SchemaTableVO, 'columns' | 'name'> & {
  columns: Column[];
  name: string;
};

export type SchemaRelation = Omit<SchemaRelationSaveReq, 'description'> & {
  description: string;
  id: string;
  invalidReason: null | string;
  valid: boolean;
};

function relationFromResponse(value: SchemaRelationVO): SchemaRelation {
  const {
    cardinality,
    columnMapping,
    conditions,
    displayName,
    id,
    relationKey,
    relationKind,
    sourceTable,
    targetTable,
  } = value;
  if (
    !id ||
    !sourceTable ||
    !targetTable ||
    !relationKey ||
    !displayName ||
    !relationKind ||
    !cardinality ||
    !columnMapping ||
    !conditions
  ) {
    throw new Error('接口返回了不完整的关系配置');
  }
  return {
    cardinality,
    columnMapping,
    conditions,
    description: value.description ?? '',
    displayName,
    id,
    invalidReason: value.invalidReason,
    relationKey,
    relationKind,
    sourceTable,
    targetTable,
    valid: value.valid,
  };
}

export async function getQuerySchema() {
  const snapshot = await requestClient.get<QuerySchemaVO>(base);
  if (!snapshot.schema || !snapshot.tables || !snapshot.relations) {
    throw new Error('接口返回了不完整的数据库目录');
  }
  const tables: SchemaTable[] = snapshot.tables.map(
    ({ columns, comment, name }) => {
      if (!name || !columns) throw new Error('接口返回了不完整的表结构');
      return {
        columns: columns.map((column) => {
          if (!column.name || !column.dataType) {
            throw new Error('接口返回了不完整的字段结构');
          }
          return { ...column, dataType: column.dataType, name: column.name };
        }),
        comment,
        name,
      };
    },
  );
  return {
    relations: snapshot.relations.map((relation) =>
      relationFromResponse(relation),
    ),
    schema: snapshot.schema,
    tables,
  };
}

export async function saveSchemaRelation(
  data: SchemaRelationSaveReq,
  id?: string,
) {
  const payload = pickPayload('SchemaRelationSaveReq', data);
  const value = id
    ? await requestClient.put<SchemaRelationVO>(
        `${base}/relations/${encodeURIComponent(id)}`,
        payload,
      )
    : await requestClient.post<SchemaRelationVO>(`${base}/relations`, payload);
  return relationFromResponse(value);
}

export async function deleteSchemaRelation(id: string) {
  await requestClient.delete(`${base}/relations/${encodeURIComponent(id)}`);
}
