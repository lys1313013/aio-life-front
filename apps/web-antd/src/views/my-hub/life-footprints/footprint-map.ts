import type { MapTileSource } from './map-config';
import type { Coordinate, Footprint, LocationGroup } from './model';

import * as L from 'leaflet';

import { gcj02ToWgs84, wgs84ToGcj02 } from './coordinates';
import { groupLocations } from './model';

export interface FootprintMapHandle {
  setRecords(records: Footprint[], selected: null | string): void;
  setPick(point: Coordinate | null): void;
  focus(points: Coordinate[], zoom?: number): void;
  china(): void;
  zoomIn(): void;
  zoomOut(): void;
  setDark(dark: boolean): void;
  toggle3D?(): void;
  retryTiles(): void;
  destroy(): void;
}

/** 前端自行管理地图与标记；底图为可替换的标准 XYZ 服务，不加载供应商 SDK。 */
export function mountFootprintMap(
  container: HTMLElement,
  options: {
    onPick?: (point: Coordinate) => void;
    onSelect?: (group: LocationGroup) => void;
    onTileState?: (state: 'error' | 'loading' | 'ready') => void;
    picking?: boolean;
    small?: boolean;
    source: MapTileSource;
  },
): FootprintMapHandle {
  const { map: createMap } = L;
  const map = createMap(container, {
    attributionControl: false,
    zoomControl: false,
    minZoom: 2,
    maxZoom: 19,
    worldCopyJump: false,
  }).setView([35, 104], 4);
  let observer: ResizeObserver | undefined;
  try {
    const source = options.source;
    const displayPoint = (point: Coordinate) =>
      source.coordinateSystem === 'WGS84' ? gcj02ToWgs84(point) : point;
    const latLng = (point: Coordinate): L.LatLngTuple => {
      const value = displayPoint(point);
      return [value.latitude, value.longitude];
    };
    let disposed = false;
    let records: Footprint[] = [];
    let selected: null | string = null;
    let pick: Coordinate | null = null;
    let tileErrors = 0;
    const tiles = L.tileLayer(source.url, {
      maxZoom: 19,
      // 经度跨过 ±180° 时循环瓦片横坐标，避免请求 x < 0 或 x >= 2^z。
      noWrap: false,
      keepBuffer: 0,
      updateWhenIdle: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
    tiles.on('loading', () => {
      tileErrors = 0;
      options.onTileState?.('loading');
    });
    tiles.on('tileerror', () => {
      tileErrors++;
      options.onTileState?.('error');
    });
    tiles.on('load', () =>
      options.onTileState?.(tileErrors > 0 ? 'error' : 'ready'),
    );
    tiles.addTo(map);
    const markers = L.layerGroup().addTo(map);

    function dot(point: Coordinate, group: LocationGroup | null) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'footprint-map-hit';
      const count = group?.records.length || 1;
      button.setAttribute(
        'aria-label',
        group
          ? count > 1
            ? `${count}条地点记录`
            : group.records[0]!.placeName
          : '已选地图位置',
      );
      const visual = document.createElement('span');
      visual.className = 'footprint-map-dot';
      visual.dataset.active = String(
        !group || group.records.some((r) => r.id === selected),
      );
      visual.dataset.small = String(!!options.small);
      if (count > 1) {
        visual.classList.add('footprint-map-cluster');
        visual.textContent = String(count);
      }
      button.append(visual);
      L.DomEvent.disableClickPropagation(button);
      button.onclick = () => {
        if (group) options.onSelect?.(group);
      };
      L.marker(latLng(point), {
        keyboard: false,
        icon: L.divIcon({
          html: button,
          className: 'footprint-marker',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }),
      }).addTo(markers);
    }
    function redraw() {
      if (disposed) return;
      markers.clearLayers();
      if (options.picking) {
        if (pick) dot(pick, null);
      } else {
        for (const group of groupLocations(
          records,
          map.getZoom(),
          displayPoint,
        ))
          dot(group, group);
      }
    }
    map.on('zoomend', redraw);
    map.on('click', (event: L.LeafletMouseEvent) => {
      if (!options.picking) return;
      const position = {
        longitude: event.latlng.wrap().lng,
        latitude: event.latlng.lat,
      };
      options.onPick?.(
        source.coordinateSystem === 'WGS84' ? wgs84ToGcj02(position) : position,
      );
    });
    observer = new ResizeObserver(() => {
      if (!disposed) map.invalidateSize({ pan: false });
    });
    observer.observe(container);

    const handle: FootprintMapHandle = {
      setRecords(value, id) {
        records = value;
        selected = id;
        redraw();
      },
      setPick(value) {
        pick = value;
        redraw();
      },
      focus(points, zoom) {
        if (disposed || points.length === 0) return;
        if (
          points.every(
            (p) =>
              p.longitude === points[0]!.longitude &&
              p.latitude === points[0]!.latitude,
          )
        ) {
          map.setView(latLng(points[0]!), zoom ?? 16, { animate: false });
        } else
          map.fitBounds(L.latLngBounds(points.map((point) => latLng(point))), {
            padding: [40, 40],
            maxZoom: 16,
            animate: false,
          });
      },
      china() {
        map.fitBounds(
          [
            [18, 73],
            [54, 135],
          ],
          { padding: [20, 20], animate: false },
        );
      },
      zoomIn() {
        map.zoomIn();
      },
      zoomOut() {
        map.zoomOut();
      },
      setDark(dark) {
        container.classList.toggle('footprint-map-dark', dark);
      },
      retryTiles() {
        tiles.redraw();
      },
      destroy() {
        disposed = true;
        observer?.disconnect();
        map.remove();
      },
    };
    handle.china();
    return handle;
  } catch (error) {
    observer?.disconnect();
    map.remove();
    throw error;
  }
}
