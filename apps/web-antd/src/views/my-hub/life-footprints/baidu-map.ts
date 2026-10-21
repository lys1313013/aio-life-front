import type { Coordinate, Footprint, LocationGroup } from './model';

import { groupLocations } from './model';

interface Point {
  lng: number;
  lat: number;
}
interface Pixel {
  x: number;
  y: number;
}
interface MapEvent {
  point?: Point;
}
interface NativeMap {
  centerAndZoom(point: Point, zoom: number): void;
  enableScrollWheelZoom(): void;
  enablePinchToZoom?(): void;
  getZoom(): number;
  zoomIn(): void;
  zoomOut(): void;
  setViewport(points: Point[], options?: { margins: number[] }): void;
  addOverlay(overlay: object): void;
  removeOverlay(overlay: object): void;
  pointToOverlayPixel(point: Point): Pixel;
  getPanes(): { markerPane: HTMLElement };
  addEventListener(name: string, listener: (event: MapEvent) => void): void;
  removeEventListener(name: string, listener: (event: MapEvent) => void): void;
  setMapStyleV2?(style: { styleJson: object[] }): void;
}
interface BaiduApi {
  coordType: number;
  Map: new (container: HTMLElement, options?: object) => NativeMap;
  Point: new (longitude: number, latitude: number) => Point;
  Overlay: new () => object;
}
type MapWindow = Window & {
  [key: `aioFootprintMap${number}`]: (() => void) | undefined;
  BMap?: BaiduApi;
  BMAP_COORD_GCJ02?: number;
};
let loading: null | Promise<BaiduApi> = null;
let callbackNumber = 0;

/** 百度 JSAPI 4.0 官方 GCJ02 模式；按需加载，不在移动端主包引入 SDK。 */
export function loadBaiduMap(key: string): Promise<BaiduApi> {
  const target = window as unknown as MapWindow;
  if (!key) return Promise.reject(new Error('请配置百度浏览器地图 AK'));
  if (target.BMap) {
    if (typeof target.BMAP_COORD_GCJ02 !== 'number')
      return Promise.reject(
        new Error('地图版本不支持 GCJ02，请使用百度 JSAPI 4.0'),
      );
    target.BMap.coordType = target.BMAP_COORD_GCJ02;
    return Promise.resolve(target.BMap);
  }
  if (loading) return loading;
  loading = new Promise<BaiduApi>((resolve, reject) => {
    const callback = `aioFootprintMap${++callbackNumber}` as const;
    const script = document.createElement('script');
    const finish = (error?: Error) => {
      clearTimeout(timer);
      delete target[callback];
      if (
        error ||
        !target.BMap ||
        typeof target.BMAP_COORD_GCJ02 !== 'number'
      ) {
        script.remove();
        loading = null;
        reject(error || new Error('地图版本不支持 GCJ02'));
      } else {
        target.BMap.coordType = target.BMAP_COORD_GCJ02;
        resolve(target.BMap);
      }
    };
    const timer = setTimeout(
      () => finish(new Error('地图加载超时，请重试')),
      15_000,
    );
    target[callback] = () => finish();
    script.src = `https://api.map.baidu.com/api?v=4.0&ak=${encodeURIComponent(key)}&callback=${callback}`;
    script.onerror = () => finish(new Error('地图加载失败，请重试'));
    document.head.append(script);
  });
  return loading;
}

export interface FootprintMapHandle {
  setRecords(records: Footprint[], selected: null | string): void;
  setPick(point: Coordinate | null): void;
  focus(points: Coordinate[], zoom?: number): void;
  china(): void;
  zoomIn(): void;
  zoomOut(): void;
  setDark(dark: boolean): void;
  destroy(): void;
}

export async function mountFootprintMap(
  container: HTMLElement,
  options: {
    key: string;
    onPick?: (point: Coordinate) => void;
    onReady?: () => void;
    onSelect?: (group: LocationGroup) => void;
    picking?: boolean;
    small?: boolean;
  },
): Promise<FootprintMapHandle> {
  const api = await loadBaiduMap(options.key);
  const map = new api.Map(container, { enableMapClick: false });
  map.centerAndZoom(new api.Point(104, 35), 4);
  map.enableScrollWheelZoom();
  map.enablePinchToZoom?.();
  let disposed = false;
  let pick: Coordinate | null = null;
  let records: Footprint[] = [];
  let selected: null | string = null;
  let overlays: object[] = [];

  class Dot extends api.Overlay {
    private element: HTMLButtonElement | null = null;
    constructor(
      private point: Coordinate,
      private group: LocationGroup | null,
    ) {
      super();
    }
    draw() {
      if (!this.element) return;
      const pixel = map.pointToOverlayPixel(
        new api.Point(this.point.longitude, this.point.latitude),
      );
      this.element.style.left = `${pixel.x}px`;
      this.element.style.top = `${pixel.y}px`;
    }
    initialize() {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'footprint-map-hit';
      const count = this.group?.records.length || 1;
      button.setAttribute(
        'aria-label',
        this.group
          ? count > 1
            ? `${count}条地点记录`
            : this.group.records[0]!.placeName
          : '已选地图位置',
      );
      const dot = document.createElement('span');
      dot.className = 'footprint-map-dot';
      const active =
        !this.group ||
        this.group.records.some((record) => record.id === selected);
      dot.dataset.active = String(active);
      dot.dataset.small = String(!!options.small);
      if (count > 1) {
        dot.classList.add('footprint-map-cluster');
        dot.textContent = String(count);
      }
      button.append(dot);
      button.onclick = (event) => {
        event.stopPropagation();
        if (this.group) options.onSelect?.(this.group);
      };
      map.getPanes().markerPane.append(button);
      this.element = button;
      return button;
    }
  }
  function redraw() {
    if (disposed) return;
    for (const overlay of overlays) map.removeOverlay(overlay);
    overlays = [];
    if (options.picking) {
      if (pick) {
        const dot = new Dot(pick, null);
        overlays.push(dot);
        map.addOverlay(dot);
      }
    } else {
      for (const group of groupLocations(records, map.getZoom())) {
        const dot = new Dot(group, group);
        overlays.push(dot);
        map.addOverlay(dot);
      }
    }
  }
  const pickPoint = (event: MapEvent) => {
    if (options.picking && event.point)
      options.onPick?.({
        longitude: event.point.lng,
        latitude: event.point.lat,
      });
  };
  map.addEventListener('click', pickPoint);
  map.addEventListener('zoomend', redraw);
  const handle: FootprintMapHandle = {
    setRecords(value, id) {
      records = value;
      selected = id;
      redraw();
    },
    setPick(point) {
      pick = point;
      redraw();
    },
    focus(points, zoom) {
      if (disposed || points.length === 0) return;
      if (
        points.length === 1 ||
        points.every(
          (p) =>
            p.longitude === points[0]!.longitude &&
            p.latitude === points[0]!.latitude,
        )
      ) {
        map.centerAndZoom(
          new api.Point(points[0]!.longitude, points[0]!.latitude),
          zoom || 16,
        );
      } else
        map.setViewport(
          points.map((p) => new api.Point(p.longitude, p.latitude)),
          { margins: [40, 40, 90, 40] },
        );
    },
    china() {
      map.setViewport([new api.Point(73, 54), new api.Point(135, 18)], {
        margins: [20, 20, 20, 20],
      });
    },
    zoomIn() {
      map.zoomIn();
    },
    zoomOut() {
      map.zoomOut();
    },
    setDark(dark) {
      map.setMapStyleV2?.({
        styleJson: dark
          ? [
              {
                featureType: 'all',
                elementType: 'geometry',
                stylers: { color: '#242c37' },
              },
              {
                featureType: 'water',
                elementType: 'geometry',
                stylers: { color: '#1b3348' },
              },
              {
                featureType: 'highway',
                elementType: 'geometry',
                stylers: { color: '#465367' },
              },
              {
                featureType: 'all',
                elementType: 'labels.text.fill',
                stylers: { color: '#b5c2d3' },
              },
              {
                featureType: 'all',
                elementType: 'labels.text.stroke',
                stylers: { color: '#242c37' },
              },
            ]
          : [],
      });
    },
    destroy() {
      disposed = true;
      map.removeEventListener('click', pickPoint);
      map.removeEventListener('zoomend', redraw);
      for (const overlay of overlays) map.removeOverlay(overlay);
      container.replaceChildren();
    },
  };
  handle.china();
  options.onReady?.();
  return handle;
}
