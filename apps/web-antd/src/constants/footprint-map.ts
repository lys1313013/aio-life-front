import type { MapTileSource } from '#/api/core/life-footprints';

export const DEFAULT_MAP_SOURCE: MapTileSource = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  attributionUrl: 'https://www.openstreetmap.org/copyright',
  coordinateSystem: 'WGS84',
};
