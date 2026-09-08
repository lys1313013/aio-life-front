import type { MovieApi } from '#/api/movie';

import * as XLSX from 'xlsx';

import { PROGRESS_STATUS } from '#/api/core/progress-status';

const META_SHEET = '_Meta';
const MOVIES_SHEET = 'Movies';
const HEADERS = [
  'douban_subject_id',
  'title',
  'type',
  'director',
  'url',
  'status',
  'marked_date',
  'rating',
  'remark',
] as const;
const TYPES = new Set(['animation', 'documentary', 'movie', 'other', 'series']);
const STATUSES = new Set([
  PROGRESS_STATUS.COMPLETED,
  PROGRESS_STATUS.IN_PROGRESS,
  PROGRESS_STATUS.NOT_STARTED,
  PROGRESS_STATUS.ON_HOLD,
]);

export interface ImportIssue {
  message: string;
  rowNumber: number;
}

export interface ParsedDoubanWorkbook {
  request: MovieApi.DoubanImportRequest;
  issues: ImportIssue[];
  total: number;
}

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function parseDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  const result = text(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(result)) return result;
  throw new Error('marked_date 必须是 Excel 日期或 YYYY-MM-DD');
}

function canonicalDoubanUrl(value: unknown, subjectId: string): string {
  const raw = text(value);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('url 格式不正确');
  }
  const match = url.pathname.match(/^\/subject\/(\d+)\/?$/);
  if (url.hostname.toLowerCase() !== 'movie.douban.com' || !match) {
    throw new Error('url 必须是豆瓣电影条目地址');
  }
  if (match[1] !== subjectId)
    throw new Error('url 与 douban_subject_id 不一致');
  return `https://movie.douban.com/subject/${subjectId}/`;
}

function readMeta(workbook: XLSX.WorkBook): Map<string, string> {
  const sheet = workbook.Sheets[META_SHEET];
  if (!sheet) throw new Error(`缺少 ${META_SHEET} 工作表`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    defval: '',
    header: 1,
    raw: true,
  });
  const meta = new Map<string, string>();
  for (const row of rows) {
    const key = text(row[0]);
    if (key && key !== 'key') meta.set(key, text(row[1]));
  }
  return meta;
}

export function parseDoubanWorkbook(
  arrayBuffer: ArrayBuffer,
): ParsedDoubanWorkbook {
  // 保持 Excel 日期为序列值，避免 Date 在不同时区出现前一天/后一天的偏移。
  const workbook = XLSX.read(arrayBuffer);
  const meta = readMeta(workbook);
  const sheet = workbook.Sheets[MOVIES_SHEET];
  if (!sheet) throw new Error(`缺少 ${MOVIES_SHEET} 工作表`);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    defval: '',
    header: 1,
    raw: true,
  });
  if (rows.length === 0) throw new Error('Movies 工作表为空');
  const actualHeaders = rows[0]?.map((value) => text(value)) ?? [];
  if (
    actualHeaders.length !== HEADERS.length ||
    HEADERS.some((header, index) => actualHeaders[index] !== header)
  ) {
    throw new Error(`Movies 列必须依次为：${HEADERS.join(', ')}`);
  }

  const records: MovieApi.DoubanImportRecord[] = [];
  const issues: ImportIssue[] = [];
  let total = 0;
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    if (row.every((cell) => text(cell) === '')) continue;
    total++;
    const rowNumber = index + 1;
    try {
      const doubanSubjectId = text(row[0]);
      const title = text(row[1]);
      const type = text(row[2]);
      const director = text(row[3]);
      const status = text(row[5]);
      const ratingText = text(row[7]);
      if (!/^\d+$/.test(doubanSubjectId))
        throw new Error('douban_subject_id 必须为数字');
      if (!title) throw new Error('title 不能为空');
      if (!TYPES.has(type)) throw new Error('type 不在允许范围内');
      if (!STATUSES.has(status as any))
        throw new Error('status 不在允许范围内');
      let rating: number | undefined;
      if (ratingText) {
        rating = Number(ratingText);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          throw new Error('rating 必须为 1-5 的整数');
        }
      }
      records.push({
        rowNumber,
        doubanSubjectId,
        title,
        type: type as MovieApi.DoubanMovieType,
        director: director || undefined,
        url: canonicalDoubanUrl(row[4], doubanSubjectId),
        status: status as MovieApi.DoubanImportRecord['status'],
        markedDate: parseDate(row[6]),
        rating,
        remark: text(row[8]) || undefined,
      });
    } catch (error) {
      issues.push({
        rowNumber,
        message: error instanceof Error ? error.message : '记录格式不正确',
      });
    }
  }

  return {
    total,
    issues,
    request: {
      format: meta.get('format') ?? '',
      version: Number(meta.get('version')),
      source: meta.get('source') ?? '',
      doubanUserId: meta.get('douban_user_id') ?? '',
      records,
    },
  };
}
