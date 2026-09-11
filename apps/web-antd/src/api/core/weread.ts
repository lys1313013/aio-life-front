import { requestClient } from '#/api/request';

export type ReadingMode = 'annually' | 'monthly' | 'overall' | 'weekly';
export interface WereadBook {
  bookId: string;
  title: string;
  author?: string;
  cover?: string;
  deepLink?: string;
  finishReading?: number;
  readUpdateTime?: number;
}
export interface WereadNotebook {
  bookId: string;
  book: WereadBook;
  noteCount?: number;
  reviewCount?: number;
  readingProgress?: number;
}
export interface ReadingStats {
  readTimes?: Record<string, number>;
  readDays?: number;
  totalReadTime?: number;
  dayAverageReadTime?: number;
  readStat?: { counts: string; stat: string }[];
  readLongest?: {
    albumInfo?: { cover?: string; name: string };
    book?: WereadBook;
    readTime: number;
  }[];
}
export interface WereadConnection {
  connected: boolean;
  lastSyncTime?: null | string;
}
export interface WereadSnapshot {
  shelf: { albums?: unknown[]; books: WereadBook[] };
  notebooks: { books: WereadNotebook[] };
  stats: ReadingStats;
  lastSyncTime: string;
}
export interface WereadNotes {
  marks: {
    chapters?: { chapterUid: number; title: string }[];
    updated?: {
      bookmarkId: string;
      chapterUid: number;
      createTime?: number;
      markText: string;
      range?: string;
    }[];
  };
  reviews: {
    review: {
      abstract?: string;
      chapterName?: string;
      chapterUid?: number;
      content?: string;
      createTime?: number;
      range?: string;
      reviewId: string;
      type?: number;
    };
  }[];
}
export interface WereadProgress {
  book?: { progress?: number; readingTime?: number; updateTime?: number };
}
export async function getWereadConnection() {
  return requestClient.get<WereadConnection>('/weread/connection');
}
export async function saveWereadConnection(apiKey: string) {
  return requestClient.post<WereadConnection>(
    '/weread/connection',
    { apiKey },
    { timeout: 30_000 },
  );
}
export async function disconnectWeread() {
  return requestClient.post('/weread/disconnect');
}
export async function syncWeread(mode: ReadingMode, baseTime = 0) {
  return requestClient.post<WereadSnapshot>('/weread/sync', undefined, {
    params: { mode, baseTime },
    timeout: 120_000,
  });
}
export async function getWereadStats(mode: ReadingMode, baseTime = 0) {
  return requestClient.get<ReadingStats>('/weread/stats', {
    params: { mode, baseTime },
    timeout: 30_000,
  });
}
export async function getWereadNotes(bookId: string) {
  return requestClient.get<WereadNotes>('/weread/notes', {
    params: { bookId },
    timeout: 120_000,
  });
}
export async function getWereadProgress(bookId: string) {
  return requestClient.get<WereadProgress>('/weread/progress', {
    params: { bookId },
    timeout: 30_000,
  });
}
