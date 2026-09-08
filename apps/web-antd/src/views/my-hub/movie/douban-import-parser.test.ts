import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { parseDoubanWorkbook } from './douban-import-parser';

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
];

function workbookBuffer(movieRows: unknown[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['key', 'value'],
      ['format', 'aio-life-movie-import'],
      ['version', 1],
      ['source', 'douban'],
      ['douban_user_id', 'doubanfilm'],
    ]),
    '_Meta',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([HEADERS, ...movieRows]),
    'Movies',
  );
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

describe('parseDoubanWorkbook', () => {
  it('按固定列解析日期、评分并规范化豆瓣 URL', () => {
    const parsed = parseDoubanWorkbook(
      workbookBuffer([
        [
          '1292052',
          '肖申克的救赎',
          'movie',
          '弗兰克·德拉邦特',
          'http://movie.douban.com/subject/1292052/?from=mine',
          'completed',
          new Date(2026, 8, 7),
          5,
          '经典',
        ],
      ]),
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.request).toMatchObject({
      format: 'aio-life-movie-import',
      version: 1,
      source: 'douban',
      doubanUserId: 'doubanfilm',
    });
    expect(parsed.request.records[0]).toMatchObject({
      rowNumber: 2,
      doubanSubjectId: '1292052',
      markedDate: '2026-09-07',
      rating: 5,
      url: 'https://movie.douban.com/subject/1292052/',
    });
  });

  it('允许 marked_date、rating 和 remark 留空', () => {
    const parsed = parseDoubanWorkbook(
      workbookBuffer([
        [
          '1295644',
          '这个杀手不太冷',
          'movie',
          '',
          'https://movie.douban.com/subject/1295644/',
          'completed',
          '',
          '',
          '',
        ],
      ]),
    );
    expect(parsed.issues).toEqual([]);
    expect(parsed.request.records[0]?.markedDate).toBeUndefined();
    expect(parsed.request.records[0]?.rating).toBeUndefined();
  });

  it('将 subject ID 不一致和越界评分作为行错误', () => {
    const parsed = parseDoubanWorkbook(
      workbookBuffer([
        [
          '1292052',
          '错误记录',
          'movie',
          '',
          'https://movie.douban.com/subject/1295644/',
          'completed',
          '2026-09-07',
          6,
          '',
        ],
      ]),
    );
    expect(parsed.request.records).toHaveLength(0);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0]?.rowNumber).toBe(2);
  });

  it('拒绝列顺序发生变化的文件', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([['format', 'aio-life-movie-import']]),
      '_Meta',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([['title', 'douban_subject_id']]),
      'Movies',
    );
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    expect(() => parseDoubanWorkbook(buffer)).toThrow('Movies 列必须依次为');
  });
});
