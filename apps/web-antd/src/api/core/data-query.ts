import { queryRequestClient } from '#/api/request';

export interface QueryField {
  aggregateFunctions: string[];
  description?: string;
  distinctFunctions: string[];
  filterOperators: string[];
  graphqlType: string;
  kind: string;
  label: string;
  nullable: boolean;
  sortable: boolean;
  type: string;
  unit?: string;
  values?: string[];
}

export interface QueryRelation {
  description: string;
  fields: Record<string, QueryField>;
  label: string;
  nullable: boolean;
  typeName: string;
}

export interface QueryDatasetSummary {
  capabilities: string[];
  description: string;
  name: string;
  title: string;
}

export interface QueryDataset extends Omit<
  QueryDatasetSummary,
  'capabilities'
> {
  defaultOrder: string;
  domain: string;
  fields: Record<string, QueryField>;
  graphqlSdl: string;
  limits: {
    defaultLimit: number;
    defaultOffset: number;
    maxOffset: number;
    maxOperations: number;
    maxOrderBy: number;
    maxQueryBytes: number;
    maxRoots: number;
  };
  maxDateRangeDays: number;
  maxRows: number;
  queryExample: string;
  rangeFields: string[];
  rangeSemantics: string;
  relations: Record<string, QueryRelation>;
  releaseId: string;
  root: string;
  statsRoot: string;
  typeName: string;
  unsupported: string[];
}

export interface QueryInput {
  expectedRelease: string;
  query: string;
  variables: Record<string, unknown>;
}

export interface QueryExecution {
  dataset: string;
  executedAt: string;
  queryId: string;
  releaseId: string;
  result: Record<string, unknown>;
  rowCount: number;
}

export function listQueryDatasets() {
  return queryRequestClient.get<QueryDatasetSummary[]>('/api/v1/datasets');
}

export function describeQueryDataset(name: string) {
  return queryRequestClient.get<QueryDataset>(
    `/api/v1/datasets/${encodeURIComponent(name)}`,
  );
}

export function validateDataQuery(input: QueryInput) {
  return queryRequestClient.post<{
    allowed: boolean;
    dataset: string;
    releaseId: string;
  }>('/api/v1/queries/validate', input);
}

export function executeDataQuery(input: QueryInput) {
  return queryRequestClient.post<QueryExecution>(
    '/api/v1/queries/execute',
    input,
  );
}

export function queryErrorText(error: unknown) {
  const response = (error as { response?: { data?: { result?: string } } })
    ?.response?.data;
  return (
    response?.result ||
    (error instanceof Error ? error.message : '请求失败，请重试')
  );
}
