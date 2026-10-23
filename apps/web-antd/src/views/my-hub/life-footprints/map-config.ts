export interface MapTileSource {
  url: string;
  attribution: string;
  attributionUrl: string;
  coordinateSystem: 'GCJ02' | 'WGS84';
}

export const DEFAULT_MAP_SOURCE: MapTileSource = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  attributionUrl: 'https://www.openstreetmap.org/copyright',
  coordinateSystem: 'WGS84',
};

export interface TencentMapConfig {
  enabled: boolean;
  serviceHost: string;
  mapStyleId: string;
}
