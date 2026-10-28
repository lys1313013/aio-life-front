import type { FootprintMapRecord } from './model';

import type { Coordinate } from '#/api/core/life-footprints';

export interface FootprintMapHandle {
  setRecords(records: FootprintMapRecord[], selected: null | string): void;
  setPick(point: Coordinate | null): void;
  setPicking?(enabled: boolean): void;
  focus(points: Coordinate[], zoom?: number): void;
  china(): void;
  zoomIn(): void;
  zoomOut(): void;
  setDark(dark: boolean): void;
  toggle3D?(): void;
  retryTiles(): void;
  destroy(): void;
}
