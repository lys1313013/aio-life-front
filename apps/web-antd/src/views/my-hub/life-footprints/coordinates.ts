import type { Coordinate } from './model';

// 仅在地图展示边界转换；API 和历史记录始终使用 GCJ02。
const A = 6_378_245;
const EE = 0.006_693_421_622_965_943;
const outsideChina = ({ longitude, latitude }: Coordinate) =>
  longitude < 72.004 ||
  longitude > 137.8347 ||
  latitude < 0.8293 ||
  latitude > 55.8271;

export function wgs84ToGcj02(point: Coordinate): Coordinate {
  if (outsideChina(point)) return { ...point };
  const x = point.longitude - 105;
  const y = point.latitude - 35;
  const waves =
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  let lat =
    -100 +
    2 * x +
    3 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  lat +=
    waves +
    ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
  lat +=
    ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) *
      2) /
    3;
  let lng =
    300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  lng +=
    waves +
    ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
  lng +=
    ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) *
      2) /
    3;
  const radians = (point.latitude * Math.PI) / 180;
  const magic = 1 - EE * Math.sin(radians) ** 2;
  const root = Math.sqrt(magic);
  return {
    latitude:
      point.latitude +
      (lat * 180) / (((A * (1 - EE)) / (magic * root)) * Math.PI),
    longitude:
      point.longitude +
      (lng * 180) / ((A / root) * Math.cos(radians) * Math.PI),
  };
}

/** 迭代求逆，避免单次近似在街区缩放时产生额外误差。 */
export function gcj02ToWgs84(point: Coordinate): Coordinate {
  if (outsideChina(point)) return { ...point };
  let result = { ...point };
  for (let i = 0; i < 10; i++) {
    const converted = wgs84ToGcj02(result);
    const dx = converted.longitude - point.longitude;
    const dy = converted.latitude - point.latitude;
    result = {
      longitude: result.longitude - dx,
      latitude: result.latitude - dy,
    };
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 1e-9) break;
  }
  return result;
}
